import WebSocket, { RawData } from "ws";

import fs from "fs";

import Playlist from "./Playlist.ts";
import type { ActiveItemSlide } from "./Playlist.ts";
import OSCServer from "./servers/osc-server.ts";
import type { OSCFunctionMap, OSCServerArguments } from "./servers/osc-server.ts";
import WebsocketServer from "./servers/websocket-server.ts";
import type {
	WebsocketServerArguments,
	WebsocketMessageHandler
} from "./servers/websocket-server.ts";
import * as JGCPSend from "./JGCPSendMessages.ts";
import * as JGCPRecv from "./JGCPReceiveMessages.ts";

import Config, { CasparCGConnectionSettings } from "./config.ts";
import SearchPart, { ItemFile } from "./search_part.ts";
import { ClientPlaylistItem, ItemProps } from "./PlaylistItems/PlaylistItem.ts";
import { BibleFile } from "./PlaylistItems/Bible.ts";
import { logger } from "./logger.ts";
import { casparcg } from "./CasparCG.ts";
import { CasparCG } from "casparcg-connection";

export interface CasparCGConnection {
	connection: CasparCG;
	settings: CasparCGConnectionSettings;
	framerate: number;
}

export default class Control {
	private playlist: Playlist;
	private ws_server: WebsocketServer;
	private osc_server: OSCServer;
	private search_part: SearchPart;

	// mapping of the OSC-commands to the functions
	private readonly osc_function_map: OSCFunctionMap = {
		control: {
			playlist_item: {
				navigate: {
					direction: (value: number) => this.navigate("item", value)
				}
			},
			item_slide: {
				navigate: {
					direction: (value: number) => this.navigate("slide", value)
				}
			},
			output: {
				visibility: {
					set: (value: boolean) => this.set_visibility(value),
					toggle: (value: string) => this.toggle_visibility(value)
				}
			}
		}
	};

	// mapping of the websocket-messages to the functions
	// eslint-disable-next-line @typescript-eslint/ban-types
	private readonly ws_function_map: { [T in JGCPRecv.Message["command"]]: Function } = {
		new_playlist: (msg: JGCPRecv.NewPlaylist, ws: WebSocket) => this.new_playlist(ws),
		load_playlist: (msg: JGCPRecv.OpenPlaylist, ws: WebSocket) =>
			this.load_playlist(msg?.playlist, ws),
		save_playlist: (msg: JGCPRecv.SavePlaylist, ws: WebSocket) => this.save_playlist(ws),
		request_item_slides: (msg: JGCPRecv.RequestItemSlides, ws: WebSocket) =>
			this.get_item_slides(msg?.item, msg?.client_id, ws),
		select_item_slide: (msg: JGCPRecv.SelectItemSlide, ws: WebSocket) =>
			this.select_item_slide(msg?.item, msg?.slide, msg?.client_id, ws),
		navigate: (msg: JGCPRecv.Navigate, ws: WebSocket) =>
			this.navigate(msg?.type, msg?.steps, msg?.client_id, ws),
		set_visibility: (msg: JGCPRecv.SetVisibility, ws: WebSocket) =>
			this.set_visibility(msg.visibility, msg.client_id, ws),
		move_playlist_item: (msg: JGCPRecv.MovePlaylistItem, ws: WebSocket) =>
			this.move_playlist_item(msg.from, msg.to, ws),
		add_item: (msg: JGCPRecv.AddItem, ws: WebSocket) =>
			this.add_item(msg.props, msg.index, msg.set_active, ws),
		update_item: (msg: JGCPRecv.UpdateItem, ws: WebSocket) =>
			this.update_item(msg.index, msg.props, ws),
		delete_item: (msg: JGCPRecv.DeleteItem, ws: WebSocket) => this.delete_item(msg.position, ws),
		get_item_files: (msg: JGCPRecv.GetItemFiles, ws: WebSocket) =>
			this.get_item_files(msg.type, ws),
		get_bible: (msg: JGCPRecv.GetBible, ws: WebSocket) => this.get_bible(ws),
		get_item_data: (msg: JGCPRecv.GetItemData, ws: WebSocket) =>
			this.get_item_file(msg.type, msg.file, ws)
	};

	private readonly ws_message_handler: WebsocketMessageHandler = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		JGCP: {
			open: (ws: WebSocket) => this.ws_on_connection(ws),
			message: (ws: WebSocket, data: RawData) => this.ws_on_message(ws, data)
		}
	};

	constructor(
		ws_server_parameters: WebsocketServerArguments,
		osc_server_parameters: OSCServerArguments
	) {
		// initialize the websocket server
		logger.log("starting websocket-server");
		this.ws_server = new WebsocketServer(ws_server_parameters, this.ws_message_handler);

		// initialize the osc server
		logger.log("starting osc-server");
		this.osc_server = new OSCServer(osc_server_parameters, this.osc_function_map);

		this.playlist = new Playlist();

		this.search_part = new SearchPart();
	}

	private new_playlist(ws: WebSocket) {
		if (!this.playlist.unsaved_changes) {
			logger.log("creating new playlist");

			this.playlist = new Playlist();

			ws_send_response("new playlist has been created", true, ws);
		} else {
			logger.info("can't create new playlist: there are unsaved changes");

			ws_send_response("can't create new playlist, there are unsaved changes", false, ws);
		}
	}

	/**
	 * open and load a playlist-file and send it to clients and renderers
	 * @param playlist_path playlist-file content
	 */
	private load_playlist(playlist_path: string, ws: WebSocket) {
		let new_playlist: Playlist;

		logger.log(`lading playlist (${playlist_path})`);

		try {
			new_playlist = new Playlist(Config.get_path("playlist", playlist_path), () => {
				this.send_playlist();
			});
		} catch (e) {
			logger.warn(`can't load playlist: invalid playlist-file (${playlist_path})`);
			ws_send_response("invalid playlist-file", false, ws);
			return;
		}

		this.playlist = new_playlist;

		// send the playlist to all clients
		this.send_playlist(undefined, undefined, undefined, true);

		// send the current state to all clients
		this.send_state();

		ws_send_response("playlist has been opened", true, ws);
	}

	private save_playlist(ws: WebSocket) {
		const message: JGCPSend.PlaylistSave = {
			command: "playlist_save",
			playlist: this.playlist.save()
		};

		logger.debug("sending playlist to client");

		ws.send(JSON.stringify(message));

		ws_send_response(`playlist has been send to client`, true, ws);
	}

	private send_playlist(
		new_item_order: number[] = Array.from(Array(this.playlist.playlist_items.length).keys()),
		client_id?: string,
		ws?: WebSocket,
		new_playlist?: boolean
	) {
		const response_playlist_items: JGCPSend.Playlist = {
			command: "playlist_items",
			new_item_order,
			...this.playlist.create_client_object_playlist(),
			client_id,
			new: new_playlist
		};

		if (ws) {
			logger.debug("sending playlist to client");

			ws.send(JSON.stringify(response_playlist_items));
		} else {
			logger.debug("sending playlist to all clients");

			this.send_all_clients(response_playlist_items);
		}
	}

	private send_state(client_id?: string, ws?: WebSocket) {
		const message = { ...this.playlist.state, client_id };

		if (ws) {
			logger.debug("sending state to client");

			ws.send(JSON.stringify(message));
		} else {
			logger.debug("sending state to all clients");

			this.send_all_clients(message);
		}
	}

	/**
	 * Reply on a item-slides-request with the requested item-slides
	 * @param item
	 * @param client_id
	 * @param ws
	 */
	private async get_item_slides(item: number, client_id?: string, ws?: WebSocket) {
		// type-check the item
		if (typeof item === "number") {
			if (this.check_playlist_loaded(ws)) {
				if (casparcg.casparcg_connections.length > 0) {
					const message: JGCPSend.ItemSlides = {
						command: "item_slides",
						item,
						client_id,
						resolution: Config.casparcg_resolution,
						...(await this.playlist?.create_client_object_item_slides(item))
					};

					logger.debug(`sending item-slides for item '${item}' to client`);

					ws?.send(JSON.stringify(message));

					ws_send_response("slides have been sent", true, ws);
				} else {
					logger.log("can't send item-slides to client: no active CasparCG-connections");

					ws_send_response("no active CasparCG-connections", false, ws);
				}
			}
		} else {
			logger.debug("can't send item-slides: 'item' is not of type 'number'");

			ws_send_response("'item' is not of type 'number'", false, ws);
		}
	}

	private select_item_slide(item: number, slide: number, client_id?: string, ws?: WebSocket) {
		// if there is no playlist loaded, send an error
		if (typeof item !== "number") {
			logger.debug("can't select slide: 'item' is not of type 'number'");

			ws_send_response("'item' is not of type 'number'", false, ws);
		}

		if (typeof slide !== "number") {
			logger.debug("can't select slide: 'slide' is not of type 'number'");

			ws_send_response("'slide' is not of type 'number'", false, ws);
		}

		// try to execute the item and slide change
		let result: false | ActiveItemSlide | number;

		logger.log(`selecting slide: item: '${item}', slide: '${slide}'`);

		try {
			// if the current item is the same as the requested one, only execute an slide change
			if (item === this.playlist?.active_item) {
				result = this.playlist?.set_active_slide(slide);
			} else {
				result = this.playlist?.set_active_item(item, slide);
			}
		} catch (e) {
			// catch invalid item or slide numbers
			if (e instanceof RangeError) {
				logger.debug(`can't select slide: ${e.message}`);

				ws_send_response(e.message, true, ws);
				return;
			} else {
				if (e instanceof Error) {
					logger.error(`${e.name}: ${e.message}`);
				} else {
					logger.error(`unkown exception: ${e}`);
				}
				throw e;
			}
		}

		if (result !== false) {
			this.send_all_clients({
				command: "state",
				active_item_slide: this.playlist?.active_item_slide,
				client_id: client_id
			});

			ws_send_response("slide has been selected", true, ws);
		} else {
			logger.warn(`can't display slide: item '${this.playlist.active_item}' is not displayable`);

			ws_send_response("item isn't displayable", false, ws);
		}
	}

	/**
	 * navigate the active item or slide forwards or backwards
	 * @param type
	 * @param steps
	 * @param client_id
	 */
	private navigate(type: JGCPRecv.NavigateType, steps: number, client_id?: string, ws?: WebSocket) {
		// if there is no playlist loaded, send a negative response back and exit
		if (!this.check_playlist_loaded(ws)) {
			return;
		}

		if (!JGCPRecv.is_item_navigate_type(type)) {
			logger.debug("can't navigate: 'type' is invalid");

			ws_send_response(
				`'type' has to be one of ${JSON.stringify(JGCPRecv.item_navigate_type)}`,
				false,
				ws
			);
		}

		if (![-1, 1].includes(steps)) {
			logger.debug("can't navigate: 'step' has to be one of [-1, 1]");

			ws_send_response("'steps' has to be one of [-1, 1]", false, ws);
		}

		if (this.playlist.length === 0) {
			logger.debug("can't navigate: no items loaded");
			ws_send_response("can't navigate: no items loaded", false, ws);

			return;
		}

		logger.log(`navigating ${type}: '${steps}' steps`);

		switch (type) {
			case "item":
				this.playlist?.navigate_item(steps);
				break;
			case "slide":
				this.playlist?.navigate_slide(steps);
		}

		this.send_all_clients({
			command: "state",
			active_item_slide: this.playlist?.active_item_slide,
			client_id: client_id
		});

		ws_send_response(`'${type}' has been navigated`, true, ws);
	}

	/**
	 * set the visibility of the playlist in the renderer
	 * @param visibility wether the output should be visible (true) or not (false)
	 */
	private async set_visibility(visibility: boolean, client_id?: string, ws?: WebSocket) {
		if (typeof visibility === "boolean") {
			logger.log(`changed CasparCG-visibility: '${visibility ? "visible" : "hidden"}'`);

			this.send_all_clients({
				command: "state",
				visibility: await this.playlist.set_visibility(visibility)
			});

			ws_send_response("visibility has been set", true, ws);
		} else {
			logger.debug("can't change CasparCG-visibility: 'visibility' is invalid");

			ws_send_response("'visibility' has to be of type boolean", false, ws);
		}
	}

	private move_playlist_item(from: number, to: number, ws: WebSocket) {
		if (typeof from !== "number") {
			logger.debug("can't move item: 'from' is invalid");

			ws_send_response("'from' has to be of type number", false, ws);
			return;
		}

		if (typeof to != "number") {
			logger.debug("can't move item: 'to' is invalid");

			ws_send_response("'to' has to be of type number", false, ws);
			return;
		}

		logger.log(`moving item: from '${from}' to '${to}`);

		const new_item_order: number[] = this.playlist?.move_playlist_item(from, to);

		this.send_playlist(new_item_order);

		// send the current state to all clients
		this.send_state();

		ws_send_response("playlist-item has been moved", true, ws);
	}

	private add_item(props: ItemProps, index: number, set_active: boolean, ws: WebSocket) {
		logger.log(
			`adding item: ${index !== undefined ? `position: '${index}'` : "append"} ' ${JSON.stringify(props)}`
		);

		try {
			this.playlist.add_item(
				props,
				set_active,
				() => {
					this.send_playlist();
				},
				index
			);
		} catch (e) {
			logger.warn(`can't add item to playlist ${JSON.stringify(props)}`);

			ws_send_response("Can't add item to playlist", false, ws);

			return;
		}

		this.send_playlist();

		this.send_state();

		ws_send_response("added item to playlist", true, ws);
	}

	private update_item(index: number, props: ClientPlaylistItem, ws: WebSocket) {
		let result: boolean;

		logger.log(`updating item: position: '${index}' ${JSON.stringify(props)}`);

		try {
			result = this.playlist.update_item(index, props);
		} catch (e) {
			if (e instanceof Error) {
				logger.error(`can't update item: ${e.name}: ${e.message}`);
			} else {
				logger.error(`can't update item: unknown exception (${e})`);
			}

			if (e instanceof RangeError) {
				ws_send_response(e.message, false, ws);

				return;
			} else {
				throw e;
			}
		}

		if (result === false) {
			logger.error("can't update item: type does not match");

			ws_send_response("Can't update item", false, ws);
		} else {
			this.send_playlist();

			ws_send_response("item has been updated", true, ws);
		}
	}

	private delete_item(position: number, ws: WebSocket) {
		let state_change: boolean;

		logger.log(`deleting item from playlist: position '${position}'`);

		try {
			state_change = this.playlist.delete_item(position);
		} catch (e) {
			if (e instanceof Error) {
				logger.error(`can't delete item from playlist: ${e.name}: ${e.message}`);
			} else {
				logger.error(`can't delete item from playlist: unknown exception (${e})`);
			}

			if (e instanceof RangeError) {
				ws_send_response("position is out of range", false, ws);
				return;
			} else {
				throw e;
			}
		}

		this.send_playlist();

		if (state_change) {
			this.send_state();
		}

		ws_send_response("deleted item from playlist", true, ws);
	}

	private async get_item_files(type: JGCPRecv.GetItemFiles["type"], ws: WebSocket) {
		logger.debug(`retrieving item-files: '${type}'`);

		let files: ItemFile[];

		switch (type) {
			case "media":
				files = await this.search_part.get_casparcg_media();
				break;
			case "template":
				files = await this.search_part.get_casparcg_template();
				break;
			case "song":
				files = this.search_part.find_sng_files();
				break;
			case "playlist":
				files = this.search_part.find_jcg_files();
				break;
			case "pdf":
				files = this.search_part.find_pdf_files();
				break;
			case "psalm":
				files = this.search_part.find_psalm_files();
				break;
		}

		if (files !== undefined) {
			const message: JGCPSend.ItemFiles = {
				command: "item_files",
				type,
				files
			};

			ws.send(JSON.stringify(message));
		}
	}

	private get_bible(ws: WebSocket) {
		logger.debug("retrieving bible-file");

		let bible: BibleFile;

		try {
			bible = JSON.parse(fs.readFileSync(Config.path.bible, "utf-8")) as BibleFile;
		} catch (e) {
			logger.error("can't get bible-file: error during file-reading");

			ws_send_response("can't open bible-file", false, ws);
			return;
		}

		const message: JGCPSend.Bible = {
			command: "bible",
			bible
		};

		ws.send(JSON.stringify(message));
	}

	private get_item_file(type: JGCPRecv.GetItemData["type"], path: string, ws: WebSocket) {
		logger.debug(`retrieving item-file: '${type}' (${path})`);

		const files = [this.search_part.get_item_file(type, path)];

		const message: JGCPSend.ItemFiles = {
			command: "item_files",
			type: "song",
			files
		};

		ws.send(JSON.stringify(message));
	}

	private async toggle_visibility(osc_feedback_path?: string) {
		logger.log(`toggling CasparCG-visibility: '${this.playlist.visibility ? "hidden" : "true"}'`);

		let visibility_feedback = false;

		visibility_feedback = await this.playlist.toggle_visibility();

		// if a feedback-path is given, write the feedback to it
		if (osc_feedback_path !== undefined) {
			this.osc_server.send_value(osc_feedback_path, visibility_feedback);
		}

		this.send_all_clients({
			command: "state",
			visibility: visibility_feedback
		});
	}

	/**
	 * Send a JGCP-message to all registered clients
	 * @param message JSON-message to be sent
	 */
	private send_all_clients(message: JGCPSend.Message) {
		// gather all the clients
		const ws_clients = this.ws_server.get_connections("JGCP");

		ws_clients.forEach((ws_client) => {
			ws_client.send(JSON.stringify(message));
		});
	}

	/**
	 * Handle new WebSocket connections
	 * @param ws
	 */
	private ws_on_connection(ws: WebSocket) {
		// if there is already a playlist loaded, send it to the connected client
		if (this.playlist !== undefined) {
			logger.log("new client-connection: sending current playlist");

			// send the playlist
			this.send_playlist(undefined, undefined, ws);

			// send the selected item-slide
			this.send_state(undefined, ws);
		} else {
			logger.debug("new client-connection: clearing client-data");

			// send a "clear" message to the client, so that it's currently loaded sequnece gets removed (for example after a server restart)
			const clear_message: JGCPSend.Clear = {
				command: "clear"
			};

			ws.send(JSON.stringify(clear_message));
		}
	}

	private ws_on_message(ws: WebSocket, raw_data: RawData) {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		logger.debug(`received JGCP-message: ${raw_data.toString()}`);

		let data: JGCPRecv.Message;
		// try to parse the data as a JSON-object
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-base-to-string
			data = JSON.parse(raw_data.toString());

			// if the parsed is null or not an object, throw an exception
			if (!data || typeof data !== "object") {
				throw new SyntaxError();
			}
		} catch (e) {
			// if there was a SyntaxError, the data was not a valid JSON-object -> send response and exit
			if (e instanceof SyntaxError) {
				logger.error("can't parse JGCP-message: no JSON-object");

				ws_send_response("data is no JSON object", false, ws);
				return;
			} else {
				logger.error(`can't parse JGCP-message: unknown error (${e})`);

				throw e;
			}
		}

		// check wether the JSON-object does contain a command and wether it is a valid command
		if (typeof data.command !== "string") {
			logger.error("can't parse JGCP-message: 'command' is invalid");

			ws_send_response("'command' is not of type 'string", false, ws);
			return;
		} else if (!Object.keys(this.ws_function_map).includes(data.command)) {
			logger.error("can't parse JGCP-message: 'comand' is not implemented");
			ws_send_response(`command '${data.command}' is not implemented`, false, ws);
		} else {
			void this.ws_function_map[data.command](data as never, ws);
		}
	}

	private check_playlist_loaded(ws: WebSocket): boolean {
		if (this.playlist) {
			return true;
		} else {
			ws_send_response("no playlist loaded", false, ws);

			return false;
		}
	}
}

/**
 * Send a response-message
 * @param message
 * @param success status code 200 = SUCCESS (true) or 400 = ERROR (false)
 * @param ws
 */
function ws_send_response(message: string, success: boolean, ws?: WebSocket) {
	const response = {
		command: "response",
		message: message,
		code: success ? 200 : 400
	};

	ws?.send(JSON.stringify(response));
}

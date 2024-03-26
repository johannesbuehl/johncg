import WebSocket, { RawData } from "ws";

import { CasparCG, ClipInfo, InfoConfig } from "casparcg-connection";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";

import Playlist from "./Playlist.ts";
import type { ActiveItemSlide, CasparCGResolution } from "./Playlist.ts";
import OSCServer from "./servers/osc-server.ts";
import type { OSCFunctionMap, OSCServerArguments } from "./servers/osc-server.ts";
import WebsocketServer from "./servers/websocket-server.ts";
import type {
	WebsocketServerArguments,
	WebsocketMessageHandler
} from "./servers/websocket-server.ts";
import * as JGCPSend from "./JGCPSendMessages.ts";
import * as JGCPRecv from "./JGCPReceiveMessages.ts";
import type { CasparCGConnectionSettings } from "./config.ts";

import Config from "./config.ts";
import SearchPart from "./search_part.ts";
import { ItemProps } from "./PlaylistItems/PlaylistItem.ts";
import { BibleFile } from "./PlaylistItems/Bible.ts";

interface CasparCGPathsSettings {
	/* eslint-disable @typescript-eslint/naming-convention */
	"data-path": string;
	"initial-path": string;
	"log-path": string;
	"media-path": string;
	"template-path": string;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface CasparCGConnection {
	connection: CasparCG;
	settings: CasparCGConnectionSettings;
	paths: CasparCGPathsSettings;
	media: ClipInfo[];
	templates: string[];
	resolution: CasparCGResolution;
	framerate: number;
}

export default class Control {
	private playlist: Playlist;
	private ws_server: WebsocketServer;
	private osc_server: OSCServer;
	private search_part: SearchPart;

	readonly casparcg_connections: CasparCGConnection[] = [];

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
					set: async (value: boolean) => this.set_visibility(value),
					toggle: async (value: string) => this.toggle_visibility(value)
				}
			}
		}
	};

	// mapping of the websocket-messages to the functions
	// eslint-disable-next-line @typescript-eslint/ban-types
	private readonly ws_function_map: { [T in JGCPRecv.Message["command"]]: Function } = {
		new_playlist: (msg: JGCPRecv.NewPlaylist, ws: WebSocket) => this.new_playlist(ws),
		open_playlist: (msg: JGCPRecv.OpenPlaylist, ws: WebSocket) =>
			this.open_playlist(msg?.playlist, ws),
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
		renew_search_index: (msg: JGCPRecv.RenewSearchIndex, ws: WebSocket) =>
			this.renew_search_index(msg.type, ws),
		search_item: (msg: JGCPRecv.SearchItem, ws: WebSocket) =>
			this.search_item(msg.type, msg.search, ws),
		add_item: (msg: JGCPRecv.AddItem, ws: WebSocket) =>
			this.add_item(msg.props, msg.index, msg.set_active, ws),
		update_item: (msg: JGCPRecv.UpdateItem, ws: WebSocket) =>
			this.update_item(msg.index, msg.props, ws),
		delete_item: (msg: JGCPRecv.DeleteItem, ws: WebSocket) => this.delete_item(msg.position, ws),
		get_media_tree: (msg: JGCPRecv.GetMediaTree, ws: WebSocket) => this.get_media_tree(ws),
		get_template_tree: (msg: JGCPRecv.GetTemplateTree, ws: WebSocket) => this.get_template_tree(ws),
		get_playlist_tree: (msg: JGCPRecv.GetPlaylistTree, ws: WebSocket) => this.get_playlist_tree(ws),
		get_bible: (msg: JGCPRecv.GetBible, ws: WebSocket) => this.get_bible(ws),
		get_item_data: (msg: JGCPRecv.GetItemData, ws: WebSocket) =>
			this.get_item_data(msg.type, msg.file, ws)
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
		this.ws_server = new WebsocketServer(ws_server_parameters, this.ws_message_handler);

		// initialize the osc server
		this.osc_server = new OSCServer(osc_server_parameters, this.osc_function_map);

		const xml_parser = new XMLParser();

		this.playlist = new Playlist();

		// create the casparcg-connections
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		Config.casparcg.connections.forEach(async (connection_setting) => {
			const connection: CasparCG = new CasparCG({
				...connection_setting,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				autoConnect: true
			});

			let casparcg_config: InfoConfig;
			try {
				casparcg_config = (await (await connection.infoConfig()).request).data;
			} catch (e) {
				if (e instanceof TypeError) {
					return;
				}
			}

			let resolution: CasparCGResolution = {
				height: 1080,
				width: 1920
			};
			let framerate: number = 25;

			let video_mode_regex_results: RegExpMatchArray | undefined | null;

			if (casparcg_config?.channels !== undefined) {
				video_mode_regex_results = casparcg_config?.channels[
					connection_setting.channel - 1
				].videoMode?.match(
					/(?:(?<dci>dci)?(?<width>\d+)(?:x(?<height>\d+))?[pi](?<framerate>\d{4})|(?<mode>PAL|NTSC))/
				);
			}

			if (video_mode_regex_results?.groups !== undefined) {
				// if the resolution is given as PAL or NTSC, convert it
				if (video_mode_regex_results.groups.mode) {
					switch (video_mode_regex_results.groups.mode) {
						case "PAL":
							resolution = {
								width: 720,
								height: 576
							};
							framerate = 25;
							break;
						case "NTSC":
							resolution = {
								width: 720,
								height: 480
							};
							framerate = 29.97;
							break;
					}
				} else {
					resolution = {
						width: Number(video_mode_regex_results.groups.width),
						height: Number(
							video_mode_regex_results.groups.height ??
								(Number(video_mode_regex_results.groups.width) / 16) * 9
						)
					};
					framerate = Number(video_mode_regex_results.groups.framerate) / 100;
				}
			}

			const casparcg_connection: CasparCGConnection = {
				connection,
				settings: connection_setting,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				paths: (
					xml_parser.parse(
						((await (await connection.infoPaths()).request)?.data as string) ?? ""
					) as { paths: object }
				)?.paths as CasparCGPathsSettings,
				media: (await (await connection.cls()).request)?.data ?? [],
				templates: (await (await connection.tls()).request)?.data ?? [],
				resolution,
				framerate
			};

			// add the connection to the stored connections
			this.casparcg_connections.push(casparcg_connection);
			this.playlist.add_casparcg_connection(casparcg_connection);
		});

		this.search_part = new SearchPart();
	}

	private new_playlist(ws: WebSocket) {
		if (!this.playlist.unsaved_changes) {
			this.playlist = new Playlist();
			this.casparcg_connections.forEach((con) => this.playlist.add_casparcg_connection(con));

			ws_send_response("new playlist has been created", true, ws);
		} else {
			ws_send_response("can't create new playlist, there are unsaved changes", false, ws);
		}
	}

	/**
	 * open and load a playlist-file and send it to clients and renderers
	 * @param playlist_path playlist-file content
	 */
	private open_playlist(playlist_path: string, ws: WebSocket) {
		let new_playlist: Playlist;

		try {
			new_playlist = new Playlist(this.casparcg_connections, playlist_path);
		} catch (e) {
			ws_send_response("invalid playlist-file", false, ws);
			return;
		}

		// destroy the previous opened playlist
		this.playlist.destroy();

		this.playlist = new_playlist;

		// send the playlist to all clients
		this.send_playlist(Array.from(Array(this.playlist.playlist_items.length).keys()));

		// send the current state to all clients
		this.send_state();

		ws_send_response("playlist has been opened", true, ws);
	}

	private save_playlist(ws: WebSocket) {
		const message: JGCPSend.PlaylistSave = {
			command: "playlist_save",
			playlist: this.playlist.save()
		};

		ws.send(JSON.stringify(message));

		ws_send_response(`playlist has been send to client`, true, ws);
	}

	private send_playlist(
		new_item_order: number[] = Array.from(Array(this.playlist.playlist_items.length).keys()),
		client_id?: string,
		ws?: WebSocket
	) {
		const response_playlist_items: JGCPSend.Playlist = {
			command: "playlist_items",
			new_item_order,
			...this.playlist.create_client_object_playlist(),
			client_id
		};

		if (ws) {
			ws.send(JSON.stringify(response_playlist_items));
		} else {
			this.send_all_clients(response_playlist_items);
		}
	}

	private send_state(client_id?: string, ws?: WebSocket) {
		const message = { ...this.playlist.state, client_id };

		if (ws) {
			ws.send(JSON.stringify(message));
		} else {
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
				if (this.playlist?.casparcg_connections[0].resolution !== undefined) {
					const message: JGCPSend.ItemSlides = {
						command: "item_slides",
						item,
						client_id,
						resolution: this.playlist?.casparcg_connections[0].resolution,
						...(await this.playlist?.create_client_object_item_slides(item))
					};

					ws?.send(JSON.stringify(message));

					ws_send_response("slides have been sent", true, ws);
				} else {
					ws_send_response("no active CasparCG-connections", false, ws);
				}
			} else {
				return;
			}
		} else {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			ws_send_response(`'${item}' is not of type 'number'`, false, ws);
		}
	}

	private select_item_slide(item: number, slide: number, client_id?: string, ws?: WebSocket) {
		// if there is no playlist loaded, send an error

		if (typeof item !== "number") {
			ws_send_response("'item' is not of type number", false, ws);
		}

		if (typeof slide !== "number") {
			ws_send_response("'slide' is not of type number", false, ws);
		}

		// try to execute the item and slide change
		let result: false | ActiveItemSlide | number;
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
				ws_send_response(e.message, true, ws);
				return;
			} else {
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
			ws_send_response("item can't be selected", false, ws);
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
			ws_send_response(
				`'type' has to be one of ${JSON.stringify(JGCPRecv.is_item_navigate_type)}`,
				false,
				ws
			);
		}

		if (![-1, 1].includes(steps)) {
			ws_send_response("'steps' has to be one of [-1, 1]", false, ws);
		}

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
	private async set_visibility(
		visibility: boolean,
		client_id?: string,
		ws?: WebSocket
	): Promise<void> {
		// if there is no playlist loaded, send a negative response back and exit
		if (this.playlist === undefined) {
			ws_send_response("no schedule loaded", false, ws);
			return;
		}

		if (typeof visibility === "boolean") {
			await this.playlist.set_visibility(visibility);

			this.send_all_clients({
				command: "state",
				visibility: this.playlist.visibility
			});

			ws_send_response("visibility has been set", true, ws);
		} else {
			ws_send_response("'visibility' has to be of type boolean", false, ws);
		}
	}

	private move_playlist_item(from: number, to: number, ws: WebSocket) {
		if (typeof from !== "number") {
			ws_send_response("'from' has to be of type number", false, ws);
			return;
		}

		if (typeof to != "number") {
			ws_send_response("'to' has to be of type number", false, ws);
			return;
		}

		const new_item_order: number[] = this.playlist?.move_playlist_item(from, to);

		this.send_playlist(new_item_order);

		// // send the current state to all clients
		this.send_state();

		ws_send_response("playlist-item has been moved", true, ws);
	}

	private renew_search_index(type: JGCPRecv.RenewSearchIndex["type"], ws: WebSocket) {
		if (typeof type !== "string") {
			ws_send_response("type is invalid", false, ws);
		}
		if (!this.search_part.renew_search_index(type)) {
			ws_send_response("type is invalid", false, ws);
		}

		ws_send_response(`search-index for type '${type}' has been renewed`, true, ws);
	}

	private search_item(
		type: JGCPRecv.SearchItem["type"],
		search_query: JGCPRecv.SearchItem["search"],
		ws: WebSocket
	) {
		if (typeof search_query !== "object") {
			ws_send_response("invalid search_query", false, ws);
		}

		let result;

		switch (type) {
			case "song":
				result = this.search_part.search_song(search_query);
				break;
			default:
				ws_send_response("invalid type", false, ws);
				return;
		}

		const message: JGCPSend.SongSearchResults = {
			command: "search_results",
			type: type,
			result
		};

		ws.send(JSON.stringify(message));
	}

	private add_item(props: ItemProps, index: number, set_active: boolean, ws: WebSocket) {
		try {
			this.playlist.add_item(props, set_active, index);
		} catch (e) {
			ws_send_response("could not add item to playlist", false, ws);

			return;
		}

		this.send_playlist();

		this.send_state();

		ws_send_response("added item to playlist", true, ws);
	}

	private update_item(index: number, props: ItemProps, ws: WebSocket) {
		const result = this.playlist.update_item(index, props);

		if (result === false) {
			ws_send_response("could not update item", false, ws);
		} else {
			this.send_playlist();

			ws_send_response("item has been updated", true, ws);
		}
	}

	private delete_item(position: number, ws: WebSocket) {
		let state_change: boolean;

		try {
			state_change = this.playlist.delete_item(position);
		} catch (e) {
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

	private get_media_tree(ws: WebSocket) {
		const message: JGCPSend.MediaTree = {
			command: "media_tree",
			media: build_file_tree(this.casparcg_connections[0].media.map((m) => m.clip.split("/")))
		};

		ws.send(JSON.stringify(message));
	}

	private get_template_tree(ws: WebSocket) {
		const message: JGCPSend.TemplateTree = {
			command: "template_tree",
			templates: build_file_tree(this.casparcg_connections[0].templates.map((m) => m.split("/")))
		};

		ws.send(JSON.stringify(message));
	}

	private get_playlist_tree(ws: WebSocket) {
		const message: JGCPSend.PlaylistTree = {
			command: "playlist_tree",
			playlists: this.search_part.find_jcg_files()
		};

		ws.send(JSON.stringify(message));
	}

	private get_bible(ws: WebSocket) {
		let bible: BibleFile;

		try {
			bible = JSON.parse(fs.readFileSync(Config.path.bible, "utf-8")) as BibleFile;
		} catch (e) {
			ws_send_response("can't open bible-file", false, ws);
			return;
		}

		const message: JGCPSend.Bible = {
			command: "bible",
			bible
		};

		ws.send(JSON.stringify(message));
	}

	private get_item_data(type: JGCPRecv.GetItemData["type"], path: string, ws: WebSocket) {
		const result = this.search_part.get_item_data(type, path);

		const message: JGCPSend.SongSearchResults = {
			command: "search_results",
			type: "song",
			result: [result]
		};

		ws.send(JSON.stringify(message));
	}

	private async toggle_visibility(osc_feedback_path?: string): Promise<void> {
		let visibility_feedback = false;

		// if a playlist is loaded, get it's visibility
		if (this.playlist !== undefined) {
			visibility_feedback = await this.playlist.toggle_visibility();
		}

		// if a feedback-path is given, write the feedback to it
		if (osc_feedback_path !== undefined) {
			this.osc_server.send_value(osc_feedback_path, visibility_feedback);
		}
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
			// send the playlist
			this.send_playlist(undefined, undefined, ws);

			// send the selected item-slide
			this.send_state(undefined, ws);
		} else {
			// send a "clear" message to the client, so that it's currently loaded sequnece gets removed (for example after a server restart)
			const clear_message: JGCPSend.Clear = {
				command: "clear"
			};

			ws.send(JSON.stringify(clear_message));
		}
	}

	private ws_on_message(ws: WebSocket, raw_data: RawData) {
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
				ws_send_response("data is no JSON object", false, ws);
				return;
			} else {
				throw e;
			}
		}

		// check wether the JSON-object does contain a command and wether it is a valid command
		if (typeof data.command !== "string") {
			ws_send_response("'command' is not of type 'string", false, ws);
			return;
		} else if (!Object.keys(this.ws_function_map).includes(data.command)) {
			ws_send_response(`command '${data.command}' is not implemented`, false, ws);
		} else {
			void this.ws_function_map[data.command](data as never, ws);
		}
	}

	private check_playlist_loaded(ws: WebSocket): boolean {
		if (this.playlist) {
			return true;
		} else {
			ws_send_response("no schedule loaded", false, ws);

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

function build_file_tree(media_array: string[][], root?: string): JGCPSend.File[] {
	const media_object: JGCPSend.File[] = [];

	const temp_object: Record<string, string[][]> = {};

	media_array.forEach((m) => {
		if (typeof m === "string") {
			temp_object[m] = m;
		} else {
			const key = m.shift();

			if (key !== undefined) {
				if (temp_object[key] === undefined) {
					temp_object[key] = [];
				}

				if (m.length !== 0) {
					temp_object[key].push(m);
				}
			}
		}
	});

	Object.entries(temp_object).forEach(([key, files]) => {
		const file_path = (root ? root + "/" : "") + key;

		media_object.push({
			name: key,
			path: file_path,
			children: files.length !== 0 ? build_file_tree(files, file_path) : undefined
		});
	});

	return media_object;
}

import WebSocket, { RawData } from "ws";
import fs from "fs";
import { CasparCG } from "casparcg-connection";
import child_process from "child_process";
import tmp from "tmp";

import Playlist from "./Playlist";
import type { ActiveItemSlide } from "./Playlist";
import WebsocketServer, { server_id } from "./servers/websocket-server";
import type { WebsocketServerArguments, WebsocketMessageHandler } from "./servers/websocket-server";
import * as JCGPSend from "./JCGPSendMessages";
import * as JCGPRecv from "./JCGPReceiveMessages";

import Config, { CasparCGConnectionSettings } from "./config/config";
import SearchPart, { CasparFile, ItemFileMap, ItemNodeMapped, Node } from "./search_part";
import { ClientPlaylistItem, ItemProps } from "./PlaylistItems/PlaylistItem";
import { BibleFile } from "./PlaylistItems/Bible";
import { logger } from "./logger";
import { casparcg, thumbnail_generate, thumbnail_retrieve } from "./CasparCGConnection.js";
import { random_id } from "./lib";
import SongFile, { validate_song_data } from "./PlaylistItems/SongFile/SongFile";
import Psalm, { validate_psalm_file } from "./PlaylistItems/Psalm";
import Song from "./PlaylistItems/Song";
import path from "path";

export interface CasparCGConnection {
	connection: CasparCG;
	settings: CasparCGConnectionSettings;
	framerate: number;
}

export default class Control {
	private playlist: Playlist;
	private ws_server: WebsocketServer;
	private search_part: SearchPart;

	private task_list: Record<
		string,
		(options: JCGPSend.ClientConfirmation["options"][0]["value"], ws: WebSocket) => void
	> = {};

	// mapping of the websocket-messages to the functions
	private readonly client_ws_function_map: {
		[T in JCGPRecv.Message["command"]]: (msg: never, ws: WebSocket) => void;
	} = {
		new_playlist: (msg: JCGPRecv.NewPlaylist, ws: WebSocket) => this.new_playlist(ws),
		load_playlist: (msg: JCGPRecv.OpenPlaylist, ws: WebSocket) =>
			this.load_playlist(msg?.playlist, msg.id, ws),
		save_playlist: (msg: JCGPRecv.SavePlaylist, ws: WebSocket) =>
			this.save_playlist(msg.playlist, msg.id, ws, msg.overwrite),
		request_item_slides: (msg: JCGPRecv.RequestItemSlides, ws: WebSocket) =>
			this.get_item_slides(msg.item, msg?.client_id, ws),
		select_item_slide: (msg: JCGPRecv.SelectItemSlide, ws: WebSocket) =>
			this.select_item_slide(msg?.item, msg?.slide, msg?.client_id, ws),
		navigate: (msg: JCGPRecv.Navigate, ws: WebSocket) =>
			this.navigate(msg?.type, msg?.steps, msg?.client_id, ws),
		set_visibility: (msg: JCGPRecv.SetVisibility, ws: WebSocket) =>
			this.set_visibility(msg.visibility, ws),
		toggle_visibility: () => this.toggle_visibility(),
		move_playlist_item: (msg: JCGPRecv.MovePlaylistItem, ws: WebSocket) =>
			this.move_playlist_item(msg.from, msg.to, ws),
		add_item: (msg: JCGPRecv.AddItem, ws: WebSocket) =>
			this.add_item(msg.props, msg.index, msg.set_active, ws),
		update_item: (msg: JCGPRecv.UpdateItem, ws: WebSocket) =>
			this.update_item(msg.index, msg.props, ws),
		reload_item: (msg: JCGPRecv.ReloadItem, ws: WebSocket) => this.reload_item(msg.index, ws),
		delete_item: (msg: JCGPRecv.DeleteItem, ws: WebSocket) => this.delete_item(msg.position, ws),
		get_item_files: (msg: JCGPRecv.GetItemFiles, ws: WebSocket) =>
			this.get_item_files(msg.type, ws),
		get_bible: (msg: JCGPRecv.GetBible, ws: WebSocket) => this.get_bible(ws),
		get_media_thumbnails: (msg: JCGPRecv.GetMediaThumbnails, ws: WebSocket) =>
			this.get_media_thumbnails(msg.files, ws),
		get_item_data: (msg: JCGPRecv.GetItemData, ws: WebSocket) =>
			this.get_item_data(msg.type, msg.file, ws),
		create_playlist_pdf: (msg: JCGPRecv.CreatePlaylistPDF, ws: WebSocket) =>
			this.create_playlist_pdf(ws, msg.type),
		update_playlist_caption: (msg: JCGPRecv.UpdatePlaylistCaption, ws: WebSocket) =>
			this.update_playlist_caption(msg.caption, ws),
		save_file: (msg: JCGPRecv.SaveFile, ws: WebSocket) =>
			this.save_file(msg.path, msg.id, msg, ws, msg.overwrite),
		new_directory: (msg: JCGPRecv.NewDirectory, ws: WebSocket) =>
			this.new_directory(msg.path, msg.type, ws),
		client_confirmation: (msg: JCGPRecv.ClientConfirmation, ws: WebSocket) =>
			this.client_confirmation(msg.id, msg.option, ws)
	};

	private readonly ws_message_handler: WebsocketMessageHandler = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		JCGP: {
			open: (ws: WebSocket) => this.ws_on_connection(ws),
			message: (ws: WebSocket, data: RawData) => this.ws_on_message(ws, data)
		},
		// eslint-disable-next-line @typescript-eslint/naming-convention
		"": {
			open: (ws: WebSocket) => this.ws_on_connection(ws),
			message: (ws: WebSocket, data: RawData) => this.ws_on_message(ws, data)
		}
	};

	constructor(ws_server_parameters: WebsocketServerArguments) {
		// initialize the websocket server
		logger.log("starting websocket-server");
		this.ws_server = new WebsocketServer(ws_server_parameters, this.ws_message_handler);

		this.playlist = new Playlist();

		this.search_part = new SearchPart();
	}

	private task_list_add(
		callback: (options: JCGPSend.ClientConfirmation["options"][0]["value"], ws: WebSocket) => void
	) {
		const id = random_id();

		this.task_list[id] = callback;

		setTimeout(() => {
			delete this.task_list[id];
		}, 1800 * 1000); // 30 minutes

		return id;
	}

	private new_playlist(ws: WebSocket) {
		if (!this.playlist.unsaved_changes) {
			logger.log("creating new playlist");

			this.playlist = new Playlist();

			this.send_playlist(undefined, undefined, undefined, true);

			ws_send_response("new playlist has been created", true, ws);
		} else {
			const client_confirm_id = this.task_list_add(
				(option: JCGPSend.ClientConfirmation["options"][0]["value"], ws: WebSocket) => {
					const response: JCGPSend.Response = {
						command: "response",
						message: "",
						code: 200,
						server_id
					};

					let send_playlist = false;

					switch (option) {
						case "save":
							if (this.playlist.save()) {
								this.playlist = new Playlist();

								send_playlist = true;

								response.message = "Playlist has been saved and a new one has been created.";
								logger.log("Playlist has been saved and a new one has been created.");
							}
							break;
						case "discard":
							this.playlist = new Playlist();

							send_playlist = true;

							break;
						case "cancel":
							response.message = "No new playlist has been created.";
							break;
					}

					if (send_playlist) {
						this.send_playlist(undefined, undefined, undefined, true);
					}

					ws.send(JSON.stringify(response));
				}
			);

			const message: JCGPSend.ClientConfirmation = {
				command: "client_confirmation",
				id: client_confirm_id,
				text: {
					header: "Unsaved Changes",
					text: `The current playlist ${this.playlist.path !== undefined ? `'${this.playlist.path}' ` : ""}has unsaved changes.`
				},
				options: [
					this.playlist.path !== undefined
						? { icon: "floppy-disk", text: "Save", value: "save" }
						: undefined,
					{ icon: "trash", text: "Discard", value: "discard" },
					{ icon: "xmark", text: "Cancel", value: "cancel" }
				].filter((option) => option !== undefined) as JCGPSend.ClientConfirmation["options"],
				server_id
			};

			ws.send(JSON.stringify(message));
		}
	}

	/**
	 * open and load a playlist-file and send it to clients and renderers
	 * @param playlist_path playlist-file content
	 */
	private load_playlist(
		playlist_path: string,
		id: string,
		ws: WebSocket,
		overwrite: boolean = false
	) {
		let load_result = false;
		if (this.playlist.unsaved_changes && overwrite === false) {
			const client_confirm_id = this.task_list_add(
				(option: JCGPSend.ClientConfirmation["options"][0]["value"], ws: WebSocket) => {
					switch (option) {
						case "save":
							if (this.playlist.save()) {
								this.load_playlist(playlist_path, id, ws, true);
							} else {
								ws_send_response("Can't save playlist", false, ws);
								logger.warn("Can't save playlist");
							}
							break;
						case "discard":
							this.load_playlist(playlist_path, id, ws, true);
							break;
					}
				}
			);

			const message: JCGPSend.ClientConfirmation = {
				command: "client_confirmation",
				id: client_confirm_id,
				text: {
					header: "Unsaved Changes",
					text: `The current playlist ${this.playlist.path !== undefined ? `'${this.playlist.path}' ` : ""}has unsaved changes.`
				},
				options: [
					this.playlist.path !== undefined
						? { icon: "floppy-disk", text: "Save", value: "save" }
						: undefined,
					{ icon: "trash", text: "Discard", value: "discard" },
					{ icon: "xmark", text: "Cancel", value: "cancel" }
				].filter((option) => option !== undefined) as JCGPSend.ClientConfirmation["options"],
				server_id
			};

			ws.send(JSON.stringify(message));
		} else {
			let new_playlist: Playlist;

			logger.log(`loading playlist (${playlist_path})`);

			try {
				new_playlist = new Playlist(Config.get_path("playlist", playlist_path), () => {
					this.send_playlist();
				});

				this.playlist = new_playlist;

				load_result = true;
			} catch {
				logger.warn(`can't load playlist: invalid playlist-file (${playlist_path})`);
				ws_send_response(
					`can't load playlist: invalid playlist-file (${playlist_path})`,
					false,
					ws
				);

				return;
			}

			const confirm_id_message: JCGPSend.ConfirmID = {
				command: "confirm_id",
				id,
				state: load_result,
				server_id
			};

			ws.send(JSON.stringify(confirm_id_message));

			this.send_playlist(undefined, undefined, undefined, true);

			// send the current state to all clients
			this.send_state();

			ws_send_response("playlist has been loaded", true, ws);
		}
	}

	private save_playlist(playlist: string, id: string, ws: WebSocket, overwrite: boolean = false) {
		logger.log(`saving playlist at ${playlist}`);

		let save_result = false;
		let replay_message: JCGPSend.ClientMessage;

		try {
			save_result = this.playlist.save(playlist, overwrite);
		} catch (e) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (e?.code !== "ENOENT") {
				throw e;
			}

			replay_message = {
				command: "client_mesage",
				message: "Can't save playlist: invalid path",
				type: JCGPSend.LogLevel.error,
				server_id
			};

			logger.error("Can't save playlist: invalid path");
		}

		if (save_result) {
			const confirm_id_message: JCGPSend.ConfirmID = {
				command: "confirm_id",
				id,
				state: save_result,
				server_id
			};

			ws.send(JSON.stringify(confirm_id_message));

			replay_message = {
				command: "client_mesage",
				message: "Playlist has been saved",
				type: JCGPSend.LogLevel.log,
				server_id
			};

			// send the playlist to the clients
			this.send_playlist();
		} else {
			// get client-confirmation for overwriting playlist-file
			replay_message = {
				command: "client_mesage",
				message: "Playlist already exists",
				type: JCGPSend.LogLevel.debug,
				server_id
			};

			const client_confirm_id = this.task_list_add(
				(option: JCGPSend.ClientConfirmation["options"][0]["value"], ws: WebSocket) => {
					if (option === true) {
						this.save_playlist(playlist, id, ws, true);
					}
				}
			);

			const message: JCGPSend.ClientConfirmation = {
				command: "client_confirmation",
				id: client_confirm_id,
				text: {
					header: "Playlist already exists",
					text: `Playlist '${playlist}' already exists. Overwrite?`
				},
				options: [
					{ text: "Overwrite", icon: "check", value: true },
					{ text: "Cancel", icon: "xmark", value: false }
				],
				server_id
			};

			ws?.send(JSON.stringify(message));
		}

		ws?.send(JSON.stringify(replay_message));
	}

	private save_file(
		file: string,
		id: string,
		message: JCGPRecv.SaveFile,
		ws: WebSocket,
		overwrite: boolean = false
	) {
		let test_result: boolean = typeof file === "string";

		switch (message.type) {
			case "song":
				test_result &&= validate_song_data(message.data) !== false;
				break;
			case "psalm":
				test_result &&= validate_psalm_file(message.data);
		}

		if (test_result) {
			let save_state = false;

			let file_string: string;
			let save_path: string;
			switch (message.type) {
				case "song":
					save_path = Config.get_path("song", file);
					file_string = new SongFile(message.data).sng_file;
					break;
				case "psalm":
					save_path = Config.get_path("psalm", file);
					file_string = JSON.stringify(message.data, undefined, "\t");
					break;
			}

			// if the file already exist and overwrite isn't set, ask the client what to do
			if (fs.existsSync(save_path) && overwrite === false) {
				const client_confirm_id = this.task_list_add(
					(option: JCGPSend.ClientConfirmation["options"][0]["value"], ws: WebSocket) => {
						if (option === true) {
							this.save_file(file, id, message, ws, true);
						}
					}
				);

				const client_confirm_message: JCGPSend.ClientConfirmation = {
					command: "client_confirmation",
					id: client_confirm_id,
					text: {
						header: "File already exists",
						text: `file '${file}' already exists. Overwrite?`
					},
					options: [
						{ text: "Overwrite", icon: "check", value: true },
						{ text: "Cancel", icon: "xmark", value: false }
					],
					server_id
				};

				ws.send(JSON.stringify(client_confirm_message));
			} else {
				// file can be written

				// try to write the file
				try {
					fs.writeFileSync(save_path, file_string, { encoding: "utf-8" });

					save_state = true;
				} catch (e) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if (e?.code !== "ENOENT") {
						throw e;
					} else {
						logger.warn(`Can't save file '${save_path}'`);
						return;
					}
				}

				const confirm_message: JCGPSend.ConfirmID = {
					command: "confirm_id",
					id,
					state: save_state,
					server_id
				};

				ws.send(JSON.stringify(confirm_message));

				logger.log(`Saved file '${file}'`);

				ws_send_response(`Saved file '${file}'`, true, ws);

				// check wether the file is used in the current playlist.
				let send_new_playlist = false;
				this.playlist.playlist_items.forEach((item, index) => {
					if (
						(item instanceof Song || item instanceof Psalm) &&
						path.resolve(item.props.file) === path.resolve(file)
					) {
						this.reload_item(index);
						send_new_playlist = true;
					}
				});

				if (send_new_playlist) {
					this.send_playlist();
				}
			}
		}
	}

	private send_playlist(
		new_item_order: number[] = Array.from(Array(this.playlist.playlist_items.length).keys()),
		client_id?: string,
		ws?: WebSocket,
		new_playlist?: boolean
	) {
		const response_playlist_items: JCGPSend.Playlist = {
			command: "playlist_items",
			caption: this.playlist.caption,
			path: this.playlist.path,
			new_item_order,
			...this.playlist.create_client_object_playlist(),
			client_id,
			new: new_playlist,
			server_id
		};

		if (ws) {
			logger.debug("sending playlist to client");

			ws?.send(JSON.stringify(response_playlist_items));
		} else {
			logger.debug("sending playlist to all clients");

			this.send_all_clients(response_playlist_items);
		}
	}

	private send_state(client_id?: string, ws?: WebSocket) {
		const message = { ...this.playlist.state, client_id };

		if (ws) {
			logger.debug("sending state to client");

			ws?.send(JSON.stringify(message));
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
					const client_item_slides = await this.playlist?.create_client_object_item_slides(item);

					if (client_item_slides !== undefined) {
						const message: JCGPSend.ItemSlides = {
							command: "item_slides",
							item,
							client_id,
							resolution: Config.casparcg_resolution,
							...client_item_slides,
							server_id
						};

						logger.debug(`sending item-slides for item '${item}' to client`);

						ws?.send(JSON.stringify(message));

						ws_send_response("slides have been sent", true, ws);
					} else {
						logger.warn(`can't get item-slides for item '${item}': no item with this number`);

						ws_send_response(`can't get item-slides: no item with this number`, false, ws);
					}
				} else {
					logger.log("Can't send item-slides to client: no active CasparCG-connections");

					ws_send_response("Can't send item-slides: no active CasparCG-connections", false, ws);
				}
			}
		} else {
			logger.debug("Can't send item-slides: 'item' is not of type 'number'");

			ws_send_response("Can't send item-slides: 'item' is not of type 'number'", false, ws);
		}
	}

	private select_item_slide(item: number, slide: number, client_id?: string, ws?: WebSocket) {
		// if there is no playlist loaded, send an error
		if (typeof item !== "number") {
			logger.debug("Can't select slide: 'item' is not of type 'number'");

			ws_send_response("Can't select slide: 'item' is not of type 'number'", false, ws);
		}

		if (typeof slide !== "number") {
			logger.debug("Can't select slide: 'slide' is not of type 'number'");

			ws_send_response("'slide' is not of type 'number'", false, ws);
		}

		// try to execute the item and slide change
		let result: number | null | ActiveItemSlide;

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

				ws_send_response(`can't select slide: ${e.message}`, true, ws);
				return;
			} else {
				if (e instanceof Error) {
					logger.error(`${e.name}: ${e.message}`);

					ws_send_response(`${e.name}: ${e.message}`, false, ws);
				} else {
					logger.error(`unkown exception: ${e}`);

					ws_send_response(`unkown exception: ${e}`, false, ws);
				}
				throw e;
			}
		}

		if (result !== null) {
			this.send_all_clients({
				command: "state",
				active_item_slide: this.playlist?.active_item_slide,
				client_id: client_id,
				server_id
			});

			ws_send_response("slide has been selected", true, ws);
		} else {
			logger.warn(`can't display slide: item '${this.playlist.active_item}' is not displayable`);

			ws_send_response(
				`can't display slide: item '${this.playlist.active_item}' is not displayable`,
				false,
				ws
			);
		}
	}

	/**
	 * navigate the active item or slide forwards or backwards
	 * @param type
	 * @param steps
	 * @param client_id
	 */
	private navigate(type: JCGPRecv.NavigateType, steps: number, client_id?: string, ws?: WebSocket) {
		// if there is no playlist loaded, send a negative response back and exit
		if (!this.check_playlist_loaded(ws)) {
			return;
		}

		if (!JCGPRecv.is_item_navigate_type(type)) {
			logger.debug("Can't navigate: type is invalid");

			ws_send_response("Can't navigate: type is invalid", false, ws);
		}

		if (![-1, 1].includes(steps)) {
			logger.debug("Can't navigate: 'step' has to be one of [-1, 1]");

			ws_send_response("Can't navigate: 'step' has to be one of [-1, 1]", false, ws);
		}

		if (this.playlist.length === 0) {
			logger.debug("Can't navigate: no items loaded");
			ws_send_response("Can't navigate: no items loaded", false, ws);

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
			client_id: client_id,
			server_id
		});

		ws_send_response(`navigating ${type}: '${steps}' steps`, true, ws);
	}

	/**
	 * set the visibility of the playlist in the renderer
	 * @param visibility wether the output should be visible (true) or not (false)
	 */
	private async set_visibility(visibility: boolean, ws?: WebSocket) {
		if (typeof visibility === "boolean") {
			logger.log(`changed CasparCG-visibility: '${visibility ? "visible" : "hidden"}'`);

			this.send_all_clients({
				command: "state",
				visibility: await this.playlist.set_visibility(visibility),
				server_id
			});

			ws_send_response(
				`changed CasparCG-visibility: '${visibility ? "visible" : "hidden"}'`,
				true,
				ws
			);
		} else {
			logger.debug("Can't change CasparCG-visibility: 'visibility' is invalid");

			ws_send_response("Can't change CasparCG-visibility: 'visibility' is invalid", false, ws);
		}
	}

	private move_playlist_item(from: number, to: number, ws: WebSocket) {
		if (typeof from !== "number") {
			logger.debug("Can't move item: 'from' has to be of type number");

			ws_send_response("Can't move item: 'from' has to be of type number", false, ws);
			return;
		}

		if (typeof to != "number") {
			logger.debug("Can't move item: 'to' has to be of type number");

			ws_send_response("Can't move item: 'to' has to be of type number", false, ws);
			return;
		}

		logger.log(`moving item: from '${from}' to '${to}`);

		const new_item_order: number[] = this.playlist?.move_playlist_item(from, to);

		this.send_playlist(new_item_order);

		// send the current state to all clients
		this.send_state();

		ws_send_response(`playlist-item has been moved: from '${from}' to '${to}`, true, ws);
	}

	private add_item(
		props: ItemProps,
		index: number | undefined,
		set_active: boolean | undefined,
		ws: WebSocket
	) {
		logger.log(
			`adding item to playlist: ${index !== undefined ? `position: '${index}'` : "append"} ' ${JSON.stringify(props)}`
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
		} catch {
			logger.warn(`can't add item to playlist ${JSON.stringify(props)}`);

			ws_send_response("Can't add item to playlist", false, ws);

			return;
		}

		this.send_playlist();

		this.send_state();

		ws_send_response(
			`added item to playlist: ${index !== undefined ? `position: '${index}'` : "append"} ' ${JSON.stringify(props)}`,
			true,
			ws
		);
	}

	private update_item(index: number, props: ClientPlaylistItem, ws: WebSocket) {
		let result: boolean = false;

		logger.log(`updating item: position: '${index}' ${JSON.stringify(props)}`);

		try {
			result = this.playlist.update_item(index, props);
		} catch (e) {
			if (e instanceof Error) {
				logger.error(`can't update item: ${e.name}: ${e.message}`);

				ws_send_response(`can't update item: ${e.name}: ${e.message}`, false, ws);
			} else {
				logger.error(`can't update item: unknown exception (${e})`);

				ws_send_response(`can't update item: unknown exception (${e})`, false, ws);
			}

			if (!(e instanceof RangeError)) {
				throw e;
			}
		}

		if (result === false) {
			logger.error("Can't update item: type does not match");

			ws_send_response("Can't update item: type does not match", false, ws);
		} else {
			this.send_playlist();

			ws_send_response(`item has been updated: position: '${index}'`, true, ws);
		}
	}

	// reload an item from the disk
	private reload_item(index: number, ws?: WebSocket) {
		logger.log(`reloading item: position '${index}'`);

		this.playlist.reload_item(index, () => this.send_playlist());

		if (ws !== undefined) {
			this.send_playlist();

			ws_send_response(`reloaded item: position ${index}`, true, ws);
		}
	}

	private update_playlist_caption(playlist_caption: string, ws: WebSocket) {
		if (typeof playlist_caption === "string") {
			logger.debug(`Updating playlist-name to '${playlist_caption}'`);

			this.playlist.caption = playlist_caption;

			this.send_playlist();

			ws_send_response(`Updating playlist-name to '${playlist_caption}'`, true, ws);
		} else {
			logger.warn("Can't update playlist-name: 'name' is not of type 'string'");

			ws_send_response("Can't update playlist-name: 'name' is not of type 'string'", false, ws);
		}
	}

	private delete_item(position: number, ws: WebSocket) {
		let state_change: boolean = false;

		logger.log(`Deleting item from playlist: position '${position}'`);

		try {
			state_change = this.playlist.delete_item(position);
		} catch (e) {
			if (e instanceof Error) {
				if (e instanceof RangeError) {
					logger.error("Can't delete item from playlist: Position is out of range");

					ws_send_response("Can't delete item from playlist: Position is out of range", false, ws);
				} else {
					logger.error(`Can't delete item from playlist: ${e.name}: ${e.message}`);

					ws_send_response(`Can't delete item from playlist: ${e.name}: ${e.message}`, false, ws);
				}
			} else {
				logger.error(`Can't delete item from playlist: unknown exception (${e})`);

				ws_send_response(`Can't delete item from playlist: unknown exception (${e})`, false, ws);
			}

			if (!(e instanceof RangeError)) {
				throw e;
			}
		}

		this.send_playlist();

		if (state_change) {
			this.send_state();
		}

		ws_send_response("deleted item from playlist", true, ws);
	}

	private async get_item_files<K extends keyof ItemFileMap>(type: K, ws: WebSocket) {
		logger.debug(`retrieving item-files: '${type}'`);

		const search_map: { [T in keyof ItemFileMap]: () => Promise<ItemNodeMapped<T>[]> } = {
			media: async () => await this.search_part.get_casparcg_media(),
			template: async () => await this.search_part.get_casparcg_template(),
			song: () => Promise.resolve(this.search_part.find_sng_files()),
			playlist: () => Promise.resolve(this.search_part.find_jcg_files()),
			pdf: () => Promise.resolve(this.search_part.find_pdf_files()),
			psalm: () => Promise.resolve(this.search_part.find_psalm_files())
		};

		const files = await search_map[type]();

		if (files !== undefined) {
			const message: JCGPSend.ItemFiles<K> = {
				command: "item_files",
				type,
				files: files as Node<K>[],
				server_id
			};

			ws?.send(JSON.stringify(message));
		}
	}

	private get_bible(ws: WebSocket) {
		logger.debug("retrieving bible-file");

		let bible: BibleFile;

		try {
			bible = JSON.parse(fs.readFileSync(Config.path.bible, "utf-8")) as BibleFile;
		} catch {
			logger.error("Can't get bible-file: error during file-reading");

			ws_send_response("Can't get bible-file: error during file-reading", false, ws);
			return;
		}

		const message: JCGPSend.Bible = {
			command: "bible",
			bible,
			server_id
		};

		ws?.send(JSON.stringify(message));
	}

	private async get_media_thumbnails(files: CasparFile[], ws: WebSocket) {
		const thumbnails: Record<string, string> = {};

		for (const file of files) {
			let thumbnail: string[] | undefined = await thumbnail_retrieve(file.path);

			if (thumbnail === undefined) {
				await thumbnail_generate(file.path);

				thumbnail = await thumbnail_retrieve(file.path);
			}

			thumbnails[file.path] = thumbnail ? "data:image/png;base64," + thumbnail[0] : "";
		}

		const message: JCGPSend.MediaThumbnails = {
			command: "media_thumbnails",
			thumbnails: thumbnails,
			server_id
		};

		ws.send(JSON.stringify(message));
	}

	private async get_item_data(type: JCGPRecv.GetItemData["type"], path: string, ws: WebSocket) {
		logger.debug(`Retrieving item-file: '${type}' (${path})`);

		let data: JCGPSend.ItemData<JCGPRecv.GetItemData["type"]>["data"] | undefined;

		switch (type) {
			case "song":
				data = this.search_part.get_song_file(path);
				break;
			case "psalm":
				data = await this.search_part.get_psalm_file(path);
				break;
			default:
				return;
		}

		if (data !== undefined) {
			const message: JCGPSend.ItemData<JCGPRecv.GetItemData["type"]> = {
				command: "item_data",
				type,
				data,
				server_id
			};

			ws?.send(JSON.stringify(message));
		}
	}

	private create_playlist_pdf(ws: WebSocket, type: JCGPRecv.CreatePlaylistPDF["type"]) {
		const markdown = this.playlist.get_playlist_markdown(type === "full");

		const markdown_file = tmp.fileSync({ postfix: ".md" });
		const pdf_file = tmp.fileSync({ postfix: ".pdf" });

		fs.writeFile(markdown_file.name, markdown, { encoding: "utf-8" }, () => {
			// use different commands based on the operating system
			let command: string = "";

			switch (process.platform) {
				case "win32":
					command = `.\\pandoc\\pandoc.exe --pdf-engine pandoc/texlive/bin/windows/pdflatex.exe`;
					break;
				case "linux":
					command = "pandoc";
					break;
			}

			command += ` ${markdown_file.name} -o ${pdf_file.name} --template=pandoc/eisvogel.latex --listings --number-sections -V geometry:margin=25mm -V lang=de`;

			let message: JCGPSend.PlaylistPDF;

			try {
				child_process.execSync(command);

				logger.log(`Creating ${type}-PDF`);

				message = {
					command: "playlist_pdf",
					playlist_pdf: fs.readFileSync(pdf_file.name).toString("base64"),
					server_id
				};
			} catch (e) {
				let error_text: string;

				if (e instanceof Error) {
					error_text = `${e.name}: ${e.message}`;
				} else {
					error_text = `${e}`;
				}

				logger.error(`Can't create PDF: ${error_text}`);
				ws_send_response(`Can't create PDF: ${error_text}`, false, ws);

				return;
			} finally {
				fs.rm(markdown_file.name, () => {});
				fs.rm(pdf_file.name, () => {});
			}

			ws?.send(JSON.stringify(message));
		});
	}

	private async toggle_visibility() {
		logger.log(
			`Toggling CasparCG-visibility: '${this.playlist.visibility ? "hidden" : "visible"}'`
		);

		const message: JCGPSend.State = {
			command: "state",
			visibility: await this.playlist.toggle_visibility(),
			server_id
		};

		this.send_all_clients(message);

		this.ws_server.get_connections("").forEach((ws_client) => {
			ws_client?.send(JSON.stringify(message));
		});
	}

	private new_directory<T extends JCGPRecv.NewDirectory["type"]>(
		path: string,
		type: T,
		ws: WebSocket
	) {
		const directory_path = Config.get_path(type, path);
		logger.log(`creating directory: '${path}'`);

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		fs.mkdir(directory_path, async (err) => {
			if (err) {
				logger.error(`Can't create directory: ${err.message}`);
				ws_send_response(`Can't create directory: ${err.message}`, false, ws);
			} else {
				logger.debug(`Created directory: ${directory_path}`);
				ws_send_response(`Created directory: ${directory_path}`, true, ws);

				const search_map: {
					[K in JCGPRecv.NewDirectory["type"]]: () => Promise<ItemNodeMapped<K>[]>;
				} = {
					song: () => this.search_part.find_sng_files(),
					playlist: () => this.search_part.find_jcg_files(),
					psalm: () => this.search_part.find_psalm_files()
				};

				this.send_all_clients<JCGPSend.ItemFiles<T>>({
					command: "item_files",
					type,
					files: await search_map[type](),
					server_id
				});
			}
		});
	}

	private client_confirmation(
		id: string,
		option: JCGPRecv.ClientConfirmation["option"],
		ws: WebSocket
	) {
		if (option !== null) {
			this.task_list?.[id](option, ws);
		}

		delete this.task_list[id];
	}

	/**
	 * Send a JCGP-message to all registered clients
	 * @param message JSON-message to be sent
	 */
	private send_all_clients<T extends JCGPSend.Message>(message: T) {
		const message_string = JSON.stringify(message);

		// gather all the clients
		const ws_clients = this.ws_server.get_connections("JCGP");

		ws_clients.forEach((ws_client) => {
			ws_client.send(message_string);
		});

		// if the command is "state" and includes "visibility"
		if (message.command === "state" && typeof message.visibility === "boolean") {
			this.ws_server.get_connections("").forEach((ws) => {
				ws.send(message_string);
			});
		}
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
		}
	}

	private ws_on_message(ws: WebSocket, raw_data: RawData) {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		logger.debug(`received JCGP-message: ${raw_data.toString()}`);

		let data: JCGPRecv.Message;
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
				logger.error("Can't parse JCGP-message: no JSON-object");

				ws_send_response("data is no JSON object", false, ws);
				return;
			} else {
				logger.error(`can't parse JCGP-message: unknown error (${e})`);

				throw e;
			}
		}

		// check wether the JSON-object does contain a command and wether it is a valid command
		if (typeof data.command !== "string") {
			logger.error("Can't parse JCGP-message: 'command' is invalid");

			ws_send_response("'command' is not of type 'string", false, ws);
			return;
		} else if (!Object.keys(this.client_ws_function_map).includes(data.command)) {
			logger.error("Can't parse JCGP-message: 'command' is not implemented");
			ws_send_response(`Command '${data.command}' is not implemented`, false, ws);
		} else {
			void this.client_ws_function_map[data.command](data as never, ws);
		}
	}

	private check_playlist_loaded(ws?: WebSocket): boolean {
		if (this.playlist) {
			return true;
		} else {
			ws_send_response("No playlist loaded", false, ws);

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
	const response: JCGPSend.Response = {
		command: "response",
		message: message,
		code: success ? 200 : 400,
		server_id
	};

	ws?.send(JSON.stringify(response));
}

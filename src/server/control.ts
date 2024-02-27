import WebSocket, { RawData } from "ws";

import Sequence, { CasparCGResolution } from "./Sequence";
import OSCServer, { OSCFunctionMap, OSCServerArguments } from "./servers/osc-server";
import WebsocketServer, { WebsocketServerArguments, WebsocketMessageHandler } from "./servers/websocket-server";

import * as JGCPSend from "./JGCPSendMessages";
import * as JGCPRecv from "./JGCPReceiveMessages";
import { CasparCG, ClipInfo } from "casparcg-connection";
import Config, { CasparCGConnectionSettings } from "./config";
import { XMLParser } from "fast-xml-parser";

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
	connection:	CasparCG;
	settings: CasparCGConnectionSettings;
	paths: CasparCGPathsSettings;
	media: ClipInfo[];
	resolution: CasparCGResolution;
	framerate: number;
}

class Control {
	private sequence: Sequence;
	private ws_server: WebsocketServer;
	private osc_server: OSCServer;

	readonly casparcg_connections: CasparCGConnection[] = [];

	// mapping of the OSC-commands to the functions
	private readonly osc_function_map: OSCFunctionMap = {
		control: {
			sequence_item: {
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
	private readonly ws_function_map = {
		open_sequence: (msg: JGCPRecv.OpenSequence, ws: WebSocket) => this.open_sequence(msg?.sequence, ws),
		request_item_slides: (msg: JGCPRecv.RequestItemSlides, ws: WebSocket) => this.get_item_slides(msg?.item, msg?.client_id, ws),
		select_item_slide: (msg: JGCPRecv.SelectItemSlide, ws: WebSocket) => this.select_item_slide(msg?.item, msg?.slide, msg?.client_id, ws),
		navigate: (msg: JGCPRecv.Navigate, ws: WebSocket) => this.navigate(msg?.type, msg?.steps, msg?.client_id, ws),
		set_visibility: (msg: JGCPRecv.SetVisibility, ws: WebSocket) => this.set_visibility(msg.visibility, msg.client_id, ws)
	};

	private readonly ws_message_handler: WebsocketMessageHandler = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		JGCP: {
			connection: (ws: WebSocket) => this.ws_on_connection(ws),
			message: (ws: WebSocket, data: RawData) => this.ws_on_message(ws, data)
		}
	};

	constructor(ws_server_parameters: WebsocketServerArguments, osc_server_parameters: OSCServerArguments) {
		// initialize the websocket server
		this.ws_server = new WebsocketServer(ws_server_parameters, this.ws_message_handler);

		// initialize the osc server
		this.osc_server = new OSCServer(osc_server_parameters, this.osc_function_map);

		const xml_parser = new XMLParser();

		// create the casparcg-connections
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		Config.casparcg.connections.forEach(async (connection_setting) => {
			const connection: CasparCG = new CasparCG({
				...connection_setting,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				autoConnect: true
			});

			const casparcg_config = (await (await connection.infoConfig()).request).data;

			let resolution: CasparCGResolution;
			let framerate: number;

			const video_mode_regex_results = casparcg_config.channels[connection_setting.channel - 1].videoMode.match(/(?:(?<dci>dci)?(?<width>\d+)(?:x(?<height>\d+))?[pi](?<framerate>\d{4})|(?<mode>PAL|NTSC))/);

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
					height: Number(video_mode_regex_results.groups.height ?? Number(video_mode_regex_results.groups.width) / 16 * 9)
				};
				framerate = Number(video_mode_regex_results.groups.framerate) / 100;
			}

			const casparcg_connection: CasparCGConnection = {
				connection,
				settings: connection_setting,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				paths: xml_parser.parse((await (await connection.infoPaths()).request)?.data as string ?? "")?.paths as CasparCGPathsSettings,
				media: (await (await connection.cls()).request)?.data ?? [],
				resolution,
				framerate
			};
			
			// add the connection to the stored connections
			this.casparcg_connections.push(casparcg_connection);
		});
	}

	/**
	 * open and load a sequence-file and send it to clients and renderers
	 * @param sequence sequence-file content
	 */
	private open_sequence(sequence: string, ws?: WebSocket) {
		// if there was already a sequence open, call it's destroy function
		this.sequence?.destroy();

		this.sequence = new Sequence(sequence, this.casparcg_connections);

		// send the sequence to all clients
		const response_sequence_items: JGCPSend.Sequence = {
			command: "sequence_items",
			...this.sequence.create_client_object_sequence()
		};

		this.send_all_clients(response_sequence_items);
		
		// send the current state to all clients
		this.send_all_clients(this.sequence.state);

		ws_send_response("sequence has been opened", true, ws);
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
			const message: JGCPSend.ItemSlides = {
				command: "item_slides",
				client_id,
				resolution: this.sequence.casparcg_connections[0].resolution,
				...await this.sequence.create_client_object_item_slides(item)
			};

			ws?.send(JSON.stringify(message));

			ws_send_response("slides have been sent", true, ws);
		} else {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			ws_send_response(`'${item}' is not of type 'number'`, false, ws);
		}
	}

	private select_item_slide(item: number, slide: number, client_id?: string, ws?: WebSocket) {
		if (typeof item !== "number") {
			ws_send_response("'item' is not of type number", false, ws);
		}

		if (typeof slide !== "number") {
			ws_send_response("'slide' is not of type number", false, ws);
		}

		// try to execute the item and slide change
		try {
			// if the current item is the same as the requested one, only execute an slide change
			if (item === this.sequence?.active_item) {
				this.sequence?.set_active_slide(slide);
			} else {
				this.sequence?.set_active_item(item, slide);
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

		this.send_all_clients({
			command: "state",
			active_item_slide: this.sequence.active_item_slide,
			client_id: client_id
		});

		ws_send_response("slide has been selected", true, ws);
	}

	/**
	 * navigate the active item or slide forwards or backwards
	 * @param type 
	 * @param steps 
	 * @param client_id 
	 */
	private navigate(type: JGCPRecv.NavigateType, steps: number, client_id?: string, ws?: WebSocket) {
		// if there is no sequence loaded, send a negative response back and exit
		if (this.sequence === undefined) {
			ws_send_response("no schedule loaded", false, ws);
			return;
		}

		if (!JGCPRecv.is_item_navigate_type(type)) {
			ws_send_response(`'type' has to be one of ${JSON.stringify(JGCPRecv.is_item_navigate_type)}`, false, ws);
		}

		if (![-1, 1].includes(steps)) {
			ws_send_response("'steps' has to be one of [-1, 1]", false, ws);
		}

		switch (type) {
			case "item":
				this.sequence.navigate_item(steps);
				break;
			case "slide":
				this.sequence.navigate_slide(steps);
		}
		
		this.send_all_clients({
			command: "state",
			active_item_slide: this.sequence.active_item_slide,
			client_id: client_id
		});

		ws_send_response(`'${type}' has been navigated`, true, ws);
	}

	/**
	 * set the visibility of the sequence in the renderer
	 * @param visibility wether the output should be visible (true) or not (false)
	 */
	private async set_visibility(visibility: boolean, client_id?: string, ws?: WebSocket): Promise<void> {
		// if there is no sequence loaded, send a negative response back and exit
		if (this.sequence === undefined) {
			ws_send_response("no schedule loaded", false, ws);
			return;
		}

		if (typeof visibility === "boolean") {
			await this.sequence.set_visibility(visibility);

			this.send_all_clients({
				command: "state",
				visibility: this.sequence.visibility
			});

			ws_send_response("visibility has been set", true, ws);
		} else {
			ws_send_response("'visibility' has to be of type boolean", false, ws);
		}
	}

	private async toggle_visibility(osc_feedback_path?: string): Promise<void> {
		let visibility_feedback = false;

		// if a sequence is loaded, get it's visibility
		if (this.sequence !== undefined) {
			visibility_feedback = await this.sequence.toggle_visibility();
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
		// if there is already a sequence loaded, send it to the connected client
		if (this.sequence !== undefined) {
			// send the sequence
			const respone_sequence: JGCPSend.Sequence = {
				command: "sequence_items",
				...this.sequence.create_client_object_sequence()
			};
			ws.send(JSON.stringify(respone_sequence));

			// send the selected item-slide
			ws.send(JSON.stringify(this.sequence.state));
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

export default Control;
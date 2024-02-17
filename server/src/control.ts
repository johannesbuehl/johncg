import WebSocket, { RawData } from "ws";

import Sequence from "./Sequence";
import OSCServer, { OSCFunctionMap, OSCServerArguments } from "./osc-server";
import WebsocketServer, { WebsocketServerArguments, WebsocketMessageHandler } from "./websocket-server";

import * as JGCPSend from "./JGCPSendMessages";
import * as JGCPRecv from "./JGCPReceiveMessages";

class Control {
	private sequence: Sequence;
	private ws_server: WebsocketServer;
	private osc_server: OSCServer;

	// mapping of the OSC-commands to the functions
	private readonly osc_function_map: OSCFunctionMap = {
		control: {
			"sequence-item": {
				navigate: {
					direction: (value: number) => this.navigate("item", value)
				}
			},
			"item-slide": {
				navigate: {
					direction: (value: number) => this.navigate("slide", value)
				}
			},
			output: {
				visibility: (value: boolean) => this.set_visibility(value)
			}
		}
	};

	// mapping of the websocket-messages to the functions
	private readonly ws_function_map = {
		"open-sequence": (msg: JGCPRecv.OpenSequence, ws: WebSocket) => this.open_sequence(msg?.sequence, ws),
		"request-item-slides": (msg: JGCPRecv.RequestItemSlides, ws: WebSocket) => this.get_item_slides(msg?.item, msg?.clientID, ws),
		"select-item-slide": (msg: JGCPRecv.ItemSlideSelect, ws: WebSocket) => this.select_item_slide(msg?.item, msg?.slide, msg?.clientID, ws),
		navigate: (msg: JGCPRecv.Navigate, ws: WebSocket) => this.navigate(msg?.type, msg?.steps, msg?.clientID, ws),
		"set-visibility": (msg: JGCPRecv.SetVisibility, ws: WebSocket) => this.set_visibility(msg.visibility, msg.clientID, ws)
	};

	private readonly ws_message_handler: WebsocketMessageHandler = {
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

		// initialize the osc-client
	}

	/**
	 * open and load a sequence-file and send it to clients and renderers
	 * @param sequence sequence-file content
	 */
	private open_sequence(sequence: string, ws?: WebSocket) {
		// if there was already a sequence open, call it's destroy function
		this.sequence?.destroy();

		this.sequence = new Sequence(sequence);

		// send the sequence to all clients
		const response_sequenceItems: JGCPSend.Sequence = {
			command: "sequence-items",
			...this.sequence.create_client_object_sequence()
		};

		this.send_all_clients(response_sequenceItems);
		
		// send the selected item-slide to all clients
		const respone_activeItemSlide: JGCPSend.State = {
			command: "state",
			activeItemSlide: this.sequence.active_item_slide
		};

		this.send_all_clients(respone_activeItemSlide);

		ws_send_response("sequence has been opened", true, ws);
	}

	/**
	 * Reply on a item-slides-request with the requested item-slides
	 * @param item 
	 * @param clientID 
	 * @param ws 
	 */
	private get_item_slides(item: number, clientID?: string, ws?: WebSocket) {
		// type-check the item
		if (typeof item === "number") {
			const message: JGCPSend.ItemSlides = {
				command: "item-slides",
				clientID,
				...this.sequence.create_client_object_item_slides(item)
			};

			ws?.send(JSON.stringify(message));

			ws_send_response("slides have been sent", true, ws);
		} else {
			ws_send_response(`'${item} is not of type 'number''`, false, ws);
		}
	}

	private select_item_slide(item: number, slide: number, clientID?: string, ws?: WebSocket) {
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

			// send the response inside the try block, so it doesn't get send in case of an error
			this.send_all_clients({
				command: "state",
				activeItemSlide: this.sequence.active_item_slide,
				clientID
			});

			ws_send_response("slide has been selected", true, ws);
		} catch (e) {
			// catch invalid item or slide numbers
			if (e instanceof RangeError) {
				ws_send_response(e.message, true, ws);
			} else {
				throw e;
			}
		}
	}

	/**
	 * navigate the active item or slide forwards or backwards
	 * @param type 
	 * @param steps 
	 * @param clientID 
	 */
	private navigate(type: JGCPRecv.NavigateType, steps: number, clientID?: string, ws?: WebSocket) {
		if (!JGCPRecv.isItemNavigateType(type)) {
			ws_send_response(`'type' has to be one of ${JSON.stringify(JGCPRecv.isItemNavigateType)}`, false, ws);
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
			activeItemSlide: this.sequence.active_item_slide,
			clientID
		});

		ws_send_response(`'${type}' has been navigated`, true, ws);
	}

	/**
	 * set the visibility of the sequence in the renderer
	 * @param visibility wether the output should be visible (true) or not (false)
	 */
	private set_visibility(visibility: boolean, _clientID?: string, ws?: WebSocket) {
		// if there is no sequence loaded, send a negative response back and exit
		if (this.sequence === undefined) {
			ws_send_response("no schedule loaded", false, ws);
			return;
		}

		if (typeof visibility === "boolean") {
			this.sequence.set_visibility(visibility);

			this.send_all_clients({
				command: "state",
				visibility: this.sequence.visibility
			});

			ws_send_response("visibility has been set", true, ws);
		} else {
			ws_send_response("'visibility' has to be of type boolean", false, ws);
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
				command: "sequence-items",
				...this.sequence.create_client_object_sequence()
			};
			ws.send(JSON.stringify(respone_sequence));

			// send the selected item-slide
			const respone_activeItemSlide: JGCPSend.State = {
				command: "state",
				activeItemSlide: this.sequence.active_item_slide
			};
	
			ws.send(JSON.stringify(respone_activeItemSlide));
		} else {
			// send a "clear" message to the client, so that it's currently loaded sequnece gets removed (for example after a server restart)
			const clear_message: JGCPSend.Clear = {
				command: "clear"
			};

			ws.send(JSON.stringify(clear_message));
		}
	}

	private ws_on_message(ws: WebSocket, raw_data: RawData) {
		let data;
		// try to parse the data as a JSON-object
		try {
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
			this.ws_function_map[data.command](data, ws);
		}
	}
}

/**
 * Send a response-message
 * @param message 
 * @param success status code 200 = SUCCESS (true) or 400 = ERROR (false)
 * @param ws 
 */
function ws_send_response(message: string, success: boolean, ws: WebSocket) {
	const response = {
		command: "response",
		message: message,
		code: success ? 200 : 400
	};

	ws?.send(JSON.stringify(response));
}

export default Control;
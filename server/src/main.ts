import { WebSocket, RawData } from "ws";

import { http_server } from "./http-server";
import { Sequence, NavigateDirection, NavigateType, isItemNavigateType, ClientSequenceItems, ClientItemSlides } from "./Sequence";
import { websocket_server, JGCPResponse } from "./websocket-server";

import Config from "./config";

// http-server
const server = new http_server(Config.clientServer.http.port);

let seq: Sequence;

// interface for the websocket command to open a sequence-file
interface RecvOpenSequence {
	command: "open-sequence";
	data: string;
	clientID?: string;
}

interface RecvRequestItemSlides {
	command: "request-item-slides";
	item: number;
	clientID?: string;
}

interface RecvItemSlideSelect {
	command: "select-item-slide";
	item: number;
	slide: number;
	clientID?: string;
}

interface RecvItemNavigate {
	command: "navigate";
	type: NavigateType;
	direction: NavigateDirection;
	clientID?: string;
}

interface RecvItemDisplay {
	command: "display";
	state: boolean;
	clientID?: string;
}

interface SendSequence {
	command: "sequence-items";
	data: ClientSequenceItems
	clientID?: string;
}

interface SendClientSetActive {
	command: "set-active-item-slide",
	data: {
		item: number;
		slide: number;
	};
	clientID?: string;
}

interface SendClientSlides {
	command: "item-slides";
	data: ClientItemSlides;
	clientID?;
}

// process "open-sequence" commands
function open_sequence(_ws_connection: WebSocket, data: RecvOpenSequence): JGCPResponse {
	// check wether a data-field is included
	const error_response = check_field_included(data, ["data"], false);

	if (error_response !== true) {
		return error_response;
	}
	
	try {
		// create a new sequence with the received data
		seq = new Sequence(data.data.toString());
	} catch (e) {
		if (e instanceof SyntaxError) {
			return {
				command: "response",
				message: e.message,
				code: 400
			};
		} else {
			throw e;
		}
	}

	// send the sequence to all clients
	JGCP_send_all({
		...create_client_sequence_object()[0],
		clientID: data.clientID
	});

	// send the selected item-slide to all clients
	JGCP_send_all({
		...create_client_set_active_item_slide_object()[0],
		clientID: data.clientID
	});

	return {
		command: "response",
		message: "sequence has been loaded",
		code: 200
	};
}

function create_client_sequence_object(): [SendSequence, JGCPResponse] {
	return [
		{
			command: "sequence-items",
			data: seq.create_client_object_sequence()
		},
		{
			command: "response",
			message: "sequence has been loaded",
			code: 200
		}
	];
}

/**
 * checks, wether all the required fields are included in the object
 * @param data object to be checked
 * @param fields fields to be checked for
 * @returns all field found? -> true | not all found? / no scheduel loaded? -> JGCP_response-Message
 */
function check_field_included(data: object, fields: string[], checkSequenceExists: boolean = true): JGCPResponse | true {
	for (const field of fields) {
		if (data[field] === undefined) {
			return {
				command: "response",
				message: `'${field}' is missing`,
				code: 400
			};
		}
	}
	
	if (checkSequenceExists && seq === undefined) {
		return {
			command: "response",
			message: "no sequence loaded",
			code: 400
		};
	}

	return true;
}

function generate_item_slides(ws_connection: WebSocket, data: RecvRequestItemSlides): JGCPResponse {
	// check wether a data-field is included
	const error_response = check_field_included(data, ["item"]);

	if (error_response !== true) {
		return error_response;
	}

	let ws_client_json_string_slides, response;
	try {
		[ws_client_json_string_slides, response] = create_client_slides_object(data.item);
	} catch (e) {
		if (e instanceof RangeError) {
			return {
				command: "response",
				message: e.message,
				code: 400
			};
		} else {
			throw e;
		}
	}
	
	// send only to the requesting client
	ws_connection.send(JSON.stringify({
		...ws_client_json_string_slides,
		clientID: data.clientID
	}));

	return response;
}

function create_client_slides_object(item: number): [SendClientSlides, JGCPResponse] {
	return [
		{
			command: "item-slides",
			data: seq.create_client_object_item_slides(item)
		},
		{
			command: "response",
			message: "item has been selected",
			code: 200
		}
	];
}

function select_item_slide(_ws_connection: WebSocket, data: RecvItemSlideSelect): JGCPResponse {
	// check wether a data-field is included
	const error_response = check_field_included(data, ["item", "slide"]);

	if (error_response !== true) {
		return error_response;
	}
	
	// try set the slide active
	try {
		if (data.item !== seq.active_item) {
			seq.set_active_item(data.item, data.slide);
		} else {
			seq.set_active_slide(data.slide);
		}
	} catch (e) {
		if (e instanceof RangeError) {
			return {
				command: "response",
				message: e.message,
				code: 400
			};
		} else {
			throw e;
		}
	}

	const [ws_client_json_string, response] = create_client_set_active_item_slide_object();

	JGCP_send_all({
		...ws_client_json_string,
		clientID: data.clientID
	});

	return response;
}

function create_client_set_active_item_slide_object(): [SendClientSetActive, JGCPResponse] {
	return [{
			command: "set-active-item-slide",
			data: {
				item: seq.active_item,
				slide: seq.active_slide
			}
		}
		,
		{
			command: "response",
			message: "slide has been selected",
			code: 200
		}
	];
}

function navigate(ws_connection: WebSocket, data: RecvItemNavigate): JGCPResponse {
	// check wether all the fields are included
	const response = check_field_included(data, ["type", "direction"]);

	if (response !== true) {
		return response;
	}

	// try to navigate
	if (!isItemNavigateType(data.type)) {
		return {
			command: "response",
			message: `type is invalid ('${data.type}')`,
			code: 400
		};
	}

	if (data.type === "item") {
		try {
			seq.navigate_item(data.direction);
		} catch (e) {
			if (e instanceof RangeError) {
				return {
					command: "response",
					message: e.message,
					code: 400
				};
			} else {
				throw e;
			}
		}
		}

	// send all the clients the new active-item-slide
	JGCP_send_all({
		...create_client_set_active_item_slide_object()[0],
		clientID: data.clientID
	});

	return {
		command: "response",
		message: "slide has been selected",
		code: 200
	};
}

function set_display(_ws_connection: WebSocket, data: RecvItemDisplay): JGCPResponse {
	// check wether all the fields are included
	const response = check_field_included(data, ["state"]);
	if (response !== true) {
		return response;
	}

	// check wether 'state' is a boolean
	if (typeof data.state !== "boolean") {
		return {
			command: "response",
			message: "'data.state' is no boolean",
			code: 400
		};
	}

	seq.casparcg_set_visibility(data.state);
	
	let message: string;

	if (data.state) {
		message = "item has been set to visible";
	} else {
		message = "item has been set to invisible";
	}

	return {
		command: "response",
		message: message,
		code: 200
	};
}

// handle commands in the JGCP-protocol
function JGCP_message_handler(ws: WebSocket, raw_data: RawData) {
	const o_json_parse_wrapper = (s_raw_data: string) => {
		try {
			// parse the data in a JSON-object
			const data = JSON.parse(s_raw_data);

			if (!data || typeof data !== "object") {
				throw new SyntaxError();
			}

			return data;
		} catch (e) {
			if (e instanceof SyntaxError) {
				return undefined;
			} else {
				throw e;	
			}
		}	
	};

	const data = o_json_parse_wrapper(raw_data.toString());

	// map of the functions for the individual commands
	const command_map = {
		"open-sequence": open_sequence,
		"request-item-slides": generate_item_slides,
		"select-item-slide": select_item_slide,
		navigate: navigate,
		"set-display": set_display
	};

	// store the response send back to the client
	let response: JGCPResponse;

	console.debug(data);

	// if o_data is undefined, there was no valid JSON transmitted
	if (data === undefined) {
		response = {
				command: "response",
				message: "invalid JSON",
				code: 400
		};
	} else {
		// check wether a command is given
		if (data["command"] === undefined) {
			response = {
				command: "response",
				message: "'command' is missing",
				code: 400
			};
		// check wether the give command is valid
		} else if (!Object.keys(command_map).includes(data.command)) {
			response = {
				command: "response",
				message: `'${data["command"]}' is not supported`,
				code: 400
			};
		// process the command
		} else {
			response = command_map[data["command"]](ws, data);
		}
	}

	// send back the response
	ws.send(JSON.stringify({
		...response,
		clientID: data.clientID
	}));
}

/**
 * Send a message to all connected JGCP-clients
 * @param message 
 */
function JGCP_send_all(message: object) {
	// send the new sequence to all the connected clients
	const ws_clients = ws_server.get_connections("JGCP");

	ws_clients.forEach((ws_client) => {
		ws_client.send(JSON.stringify(message));
	});
}

function JGCP_open_handler(ws: WebSocket) {
	if (seq !== undefined) {
		const ws_client_json_string_sequence: SendSequence = create_client_sequence_object()[0];
		const ws_client_json_string_active_slide: SendClientSetActive = create_client_set_active_item_slide_object()[0];

		ws.send(JSON.stringify(ws_client_json_string_sequence));
		ws.send(JSON.stringify(ws_client_json_string_active_slide));

		return {
			command: "response",
			message: "state has been synced from server",
			code: 200
		};
	}
}

// create a websocket-server
const ws_server = new websocket_server(Config.clientServer.websocket.port, { 
	JGCP: {
		message: JGCP_message_handler,
		connection: JGCP_open_handler,
	}
});

server.start();

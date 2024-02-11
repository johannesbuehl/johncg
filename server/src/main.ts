import { CasparCG } from 'casparcg-connection';
import { WebSocket, RawData } from 'ws';

import { http_server } from "./http-server";
import { Sequence, NavigateDirection, NavigateType, isItemNavigateType } from './Sequence';
import { websocket_server, JGCP_response } from './websocket-server';

const config = require("../config.json");

// http-server
const server = new http_server(config.client_server.http.port);
// connection to casparcg
const casparcg_connection = new CasparCG({
	host: config.casparcg.host,
	port: config.casparcg.port
});

let seq: Sequence;

// interface for the websocket command to open a sequence-file
interface open_sequence_object {
	command: "open-sequence";
	data: string;
};

interface SequenceItemSelectObject {
	command: "sequence-item-select";
	item: number;
	slide?: number;
}

interface ItemSlideSelectObject {
	command: "item-slide-select";
	slide: number;
}

interface ItemNavigateObject {
	command: "navigate";
	type: NavigateType;
	direction: NavigateDirection
}

// process 'open-sequence' commands
function s_open_sequence(ws_connection: WebSocket, o_data: open_sequence_object): JGCP_response {
	// check wether a data-field is included
	if (o_data.data === undefined) {
		return {
			command: "response",
			message: "'data' is missing",
			code: 400
		};
	} else {
		try {
			// create a new sequence with the received data
			seq = new Sequence(o_data.data.toString());
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

		// send the new sequence to all the connected clients
		const a_ws_clients = ws_server.a_get_connections("JGCP");

		const ws_client_json_string_sequence = create_sequence()[0];
		const ws_client_json_string_slides = create_slides_client_object(seq.active_item)[0];
		const ws_client_json_string_active_slide = create_set_active_slide(seq.active_slide)[0];

		a_ws_clients.forEach((ws_client) => {
			ws_client.send(ws_client_json_string_sequence);
			ws_client.send(ws_client_json_string_slides);
			ws_client.send(ws_client_json_string_active_slide);
		});

		// load the active-item into casparcg
		casparcg_load_item(seq.active_item);

		return {
			command: "response",
			message: "sequence has been loaded",
			code: 200
		};
	}
}

function casparcg_load_item(item): JGCP_response {
	// load the item into casparcg
	casparcg_connection.cgAdd({ channel: config.casparcg.channel, layer: config.casparcg.layer, cgLayer: 1, playOnLoad: true, template: "Song", data: seq.create_renderer_object(item)});

	return {
		command: "response",
		message: "item has been loaded into CasparCG",
		code: 200
	};
}

function create_sequence(): [string, JGCP_response] {
	const s_ws_client_json_string = JSON.stringify({
		command: "sequence",
		data: seq.create_client_object_sequence()
	});

	return [
		s_ws_client_json_string,
		{
			command: "response",
			message: "sequence has been loaded",
			code: 200
		}
	];
}

/**
 * checks, wether all the required fields are included in the object
 * @param o_data object to be checked
 * @param a_s_fields fields to be checked for
 * @returns all field found? -> true | not all found? / no scheduel loaded? -> JGCP_response-Message
 */
function check_field_included(o_data: Object, a_s_fields: string[]): JGCP_response | true {
	for (let s_field of a_s_fields) {
		if (o_data[s_field] === undefined) {
			return {
				command: "response",
				message: `'${s_field}' is missing`,
				code: 400
			};
		}
	}
	
	if (seq === undefined) {
		return {
			command: "response",
			message: "no sequence loaded",
			code: 400
		};
	}

	return true;
}

function item_select(_ws_connection: WebSocket, data: SequenceItemSelectObject): JGCP_response {
	// check wether a data-field is included
	let response = check_field_included(data, ["item"]);

	if (response !== true) {
		return response;
	}

	try {
		seq.set_active_item(data.item)

		if (data.slide !== undefined) {
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
		
	// send the new sequence to all the connected clients
	const a_ws_clients = ws_server.a_get_connections("JGCP");

	let ws_client_json_string_slides: string;
	[ws_client_json_string_slides, response] = create_slides_client_object(seq.active_item);
	const ws_client_json_string_active_slide = create_set_active_slide(seq.active_slide)[0];

	a_ws_clients.forEach((ws_client) => {
		ws_client.send(ws_client_json_string_slides);
		ws_client.send(ws_client_json_string_active_slide);
	});

	return response;
}

function create_slides_client_object(item: number): [string, JGCP_response] {
	const s_ws_client_json_string = JSON.stringify({
		command: "item",
		data: seq.create_client_object_item(item)
	});

	return [
		s_ws_client_json_string,
		{
			command: "response",
			message: "item has been selected",
			code: 200
		}
	];
}

function slide_select(_ws_connection: WebSocket, o_data: ItemSlideSelectObject): JGCP_response {
	// check wether a data-field is included
	let response = check_field_included(o_data, ["slide"]);

	if (response !== true) {
		return response;
	}
	
	// try set the slide active
	try {
		seq.set_active_slide(o_data.slide)
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

	// jump to the slide-number in casparcg
	casparcg_connection.cgInvoke({ channel: config.casparcg.channel, layer: config.casparcg.layer, cgLayer: 1, method: `jump(${seq.active_slide})`});

	// send the new sequence to all the connected clients
	const a_ws_clients = ws_server.a_get_connections("JGCP");

	let s_ws_client_json_string: string;
	[s_ws_client_json_string, response] = create_set_active_slide(seq.active_slide);

	a_ws_clients.forEach((ws_client) => {
		ws_client.send(s_ws_client_json_string);
	});

	return response;
}

function create_set_active_slide(slide): [string, JGCP_response] {
	const s_ws_client_json_string = JSON.stringify({
		command: "set-active-slide",
		data: {slide: seq.active_slide}
	});
	

	return [
		s_ws_client_json_string,
		{
			command: "response",
			message: "slide has been selected",
			code: 200
		}
	];
}

function navigate(_ws_connection: WebSocket, data: ItemNavigateObject): JGCP_response {
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

	let item_changed: boolean = false;

	try {
		switch (data.type) {
			case "item":
				seq.navigate_item(data.direction);
				break;
			case "slide":
				item_changed = seq.navigate_slide(data.direction);
				break;
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

	// if the item changed, send the new slide to casparcg and the clients
	if (item_changed) {
		const data_item_select: SequenceItemSelectObject = {
			command: "sequence-item-select",
			item: seq.active_item,
			slide: seq.active_slide
		};

		item_select(_ws_connection, data_item_select);
	}

	// jump to the slide-number in casparcg
	casparcg_connection.cgInvoke({ channel: config.casparcg.channel, layer: config.casparcg.layer, cgLayer: 1, method: `jump(${seq.active_slide})`});

	// send the new sequence to all the connected clients
	const a_ws_clients = ws_server.a_get_connections("JGCP");

	const s_ws_client_json_string = JSON.stringify({
		command: "set-active-slide",
		data: {slide: seq.active_slide}
	});

	a_ws_clients.forEach((ws_client) => {
		ws_client.send(s_ws_client_json_string);
	});

	return {
		command: "response",
		message: "slide has been selected",
		code: 200
	};
}

// function set_display(_ws_connection: WebSocket, o_data: ItemSlideSelectObject): JGCP_response {

// }

// handle commands in the JGCP-protocol
function JGCP_message_handler(ws: WebSocket, raw_data: RawData) {
	const o_json_parse_wrapper = (s_raw_data: string) => {
		try {
			// parse the data in a JSON-object
			const o_data = JSON.parse(s_raw_data);

			if (!o_data || typeof o_data !== "object") {
				throw new SyntaxError();
			}

			return o_data;
		} catch (e) {
			if (e instanceof SyntaxError) {
				return undefined;
			} else {
				throw e;	
			}
		}	
	};

	const o_data = o_json_parse_wrapper(raw_data.toString());

	// map of the functions for the individual commands
	const o_command_map = {
		"open-sequence": s_open_sequence,
		"sequence-item-select": item_select,
		"item-slide-select": slide_select,
		"navigate": navigate,
		// "display": set_display
	};

	// store the response send back to the client
	let o_response: JGCP_response

	// if o_data is undefined, there was no valid JSON transmitted
	if (o_data === undefined) {
		o_response = {
				command: "response",
				message: "invalid JSON",
				code: 400
		};
	} else {
		// check wether a command is given
		if (o_data["command"] === undefined) {
			o_response = {
				command: "response",
				message: "'command' is missing",
				code: 400
			};
		// check wether the give command is valid
		} else if (!Object.keys(o_command_map).includes(o_data.command)) {
			o_response = {
				command: "response",
				message: `'${o_data["command"]}' is not supported`,
				code: 400
			};
		// process the command
		} else {
			o_response = o_command_map[o_data["command"]](ws, o_data);
		}
	}

	// send back the response
	ws.send(JSON.stringify(o_response));
}

function JGCP_open_handler(ws: WebSocket) {
	if (seq !== undefined) {
		const s_ws_client_json_string_sequence = create_sequence()[0];
		const s_ws_client_json_string_slides = create_slides_client_object(seq.active_item)[0];
		const s_ws_client_json_string_active_slide = create_set_active_slide(seq.active_slide)[0];

		ws.send(s_ws_client_json_string_sequence);
		ws.send(s_ws_client_json_string_slides);
		ws.send(s_ws_client_json_string_active_slide);

		return {
			command: "response",
			message: "state has been synced from server",
			code: 200
		};
	}
}

// create a websocket-server
const ws_server = new websocket_server(config.client_server.websocket.port, { 
	"JGCP": {
		message: JGCP_message_handler,
		connection: JGCP_open_handler,
	}
});

server.start()

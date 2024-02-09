import { CasparCG } from 'casparcg-connection';
import { WebSocket, RawData } from 'ws';

import { http_server } from "./http-server";
import { Sequence } from './Sequence';
import { websocket_server, i_JGCP_response } from './websocket-server';

// port for the http-server
const i_http_port: number = 8888;
// port for the websocket-server
const i_ws_port: number = 8765;

// http-server
const server = new http_server(i_http_port);
// connection to casparcg
const casparcg_connection = new CasparCG();

let seq: Sequence;

// interface for the websocket command to open a sequence-file
interface i_open_sequence_object {
	command: "open-sequence";
	data: string;
};

interface i_sequence_item_select_object {
	command: "sequence-item-select";
	ID: number;
}

interface i_item_slide_select_object {
	command: "item-slide-select";
	ID: number;
}

// process 'open-sequence' commands
function s_open_sequence(ws_connection: WebSocket, o_data: i_open_sequence_object): i_JGCP_response {
	// check wether a data-field is included
	if (o_data.data === undefined) {
		return {
			command: "response",
			message: "'data' is missing",
			code: 400
		};
	} else {
		// create a new sequence with the received data
		seq = new Sequence(o_data.data.toString());

		// send the new sequence to all the connected clients
		const a_ws_clients = ws_server.a_get_connections("JGCP");

		const s_ws_client_json_string = JSON.stringify({
			command: "sequence",
			data: seq.o_create_client_object_sequence()
		});

		a_ws_clients.forEach((ws_client) => {
			ws_client.send(s_ws_client_json_string);
		});
		
		return {
			command: "response",
			message: "sequence has been loaded",
			code: 200
		};
	}
}

function s_item_select(ws_connection: WebSocket, o_data: i_sequence_item_select_object): i_JGCP_response {
	// check wether a data-field is included
	if (o_data.ID === undefined) {
		return {
			command: "response",
			message: "'ID' is missing",
			code: 400
		};
	} else {
		// load the song into casparcg
		casparcg_connection.cgAdd({ channel: 1, layer: 20, cgLayer: 1, playOnLoad: true, template: "Song", data: seq.o_create_renderer_object(o_data.ID)});

		// send the new sequence to all the connected clients
		const a_ws_clients = ws_server.a_get_connections("JGCP");

		const s_ws_client_json_string = JSON.stringify({
			command: "item",
			data: seq.o_create_client_object_item(o_data.ID)
		});

		a_ws_clients.forEach((ws_client) => {
			ws_client.send(s_ws_client_json_string);
		});

		return {
			command: "response",
			message: "item has been selected",
			code: 200
		};
	}
}

function s_slide_select(ws_connection: WebSocket, o_data: i_item_slide_select_object): i_JGCP_response {
	// check wether a data-field is included
	if (o_data.ID === undefined) {
		return {
			command: "response",
			message: "'ID' is missing",
			code: 400
		};
	} else {
		// jump to the slide-number in casparcg
		casparcg_connection.cgInvoke({ channel: 1, layer: 20, cgLayer: 1, method: `jump(${o_data.ID})`});

		// send the new sequence to all the connected clients
		const a_ws_clients = ws_server.a_get_connections("JGCP");

		const s_ws_client_json_string = JSON.stringify({
			command: "set-active-slide",
			data: {ID: o_data.ID}
		});

		a_ws_clients.forEach((ws_client) => {
			ws_client.send(s_ws_client_json_string);
		});

		return {
			command: "response",
			message: "item has been selected",
			code: 200
		};
	}
}

// handle commands in the JGCP-protocol
function JGCP_handler(ws: WebSocket, raw_data: RawData) {
	// parse the data in a JSON-object
	const o_data = JSON.parse(raw_data.toString());

	// map of the functions for the individual commands
	const o_command_map = {
		"open-sequence": s_open_sequence,
		"sequence-item-select": s_item_select,
		"item-slide-select": s_slide_select
	};

	// store the response send back to the client
	let o_response: i_JGCP_response

	// check wether a command is given
	if (o_data["command"] === undefined) {
		o_response = {
			command: "response",
			message: "'command' is missing",
			code: 400
		};
	// check wether the give command is valid
	} else if (!(o_data["command"] in o_command_map)) {
		o_response = {
			command: "response",
			message: `'${o_data["command"]}' is not supported`,
			code: 400
		};
	// process the command
	} else {
		o_response = o_command_map[o_data["command"]](ws, o_data);
	}

	// send back the response
	ws.send(JSON.stringify(o_response));
}

// create a websocket-server
const ws_server = new websocket_server(i_ws_port, { "JGCP": JGCP_handler });

server.start()
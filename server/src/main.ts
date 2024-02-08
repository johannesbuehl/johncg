import { CasparCG } from 'casparcg-connection';
import { WebSocket, RawData } from 'ws';

import { http_server } from "./http-server";
import { Sequence } from './sequence';
import { websocket_server, i_JGCP_response } from './websocket-server';

// port for the http-server
const i_http_port: number = 8888;
// port for the websocket-server
const i_ws_port: number = 8765;

// http-server
const server = new http_server(i_http_port);
// connection to casparcg
const casparcg_connection = new CasparCG();

// interface for the websocket command to open a sequence-file
interface i_open_sequence_object {
	command: "open-sequence";
	data: string;
};

// process 'open-sequence' commands
function s_open_sequence(ws_connection: WebSocket, o_data: i_open_sequence_object): i_JGCP_response {
	// check wether a data-field is included
	if (o_data["data"] === undefined) {
		return {
			command: "response",
			message: "'data' is missing",
			code: 400
		};
	} else {
		// create a new sequence with the received data
		const seq = new Sequence(o_data.data.toString());

		// TESTING: send a command to casparcg to display the last song of the sequence
		casparcg_connection.cgAdd({ channel: 1, layer: 20, cgLayer: 1, playOnLoad: true, template: "Song", data: seq.temp_render_item});

		return {
			command: "response",
			message: "sequence has been loaded",
			code: 200
		};
	}
}

// handle commands in the JGCP-protocol
function JGCP_handler(ws: WebSocket, raw_data: RawData) {
	// parse the data in a JSON-object
	const o_data = JSON.parse(raw_data.toString());

	// map of the functions for the individual commands
	const o_command_map = {"open-sequence": s_open_sequence};

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
import { CasparCG } from 'casparcg-connection';
import { WebSocket, RawData } from 'ws';

import { http_server } from "./http-server";
import { Sequence } from './sequence';
import { websocket_server } from './websocket-server';

const i_http_port: number = 8888;
const i_ws_port: number = 8765;

const server = new http_server(i_http_port);

const casparcg_connection = new CasparCG();

interface i_open_sequence_object {
	command: "open-sequence";
	data: string;
};

function s_open_sequence(ws_connection: WebSocket, o_data: i_open_sequence_object): string {
	if (o_data["data"] === undefined) {
		return "ERROR: 'data' is missing";
	} else {
		const seq = new Sequence(o_data.data.toString());

		casparcg_connection.cgAdd({ channel: 1, layer: 20, cgLayer: 1, playOnLoad: true, template: "Song", data: seq.temp_render_item});

		return "SUCCESS";
	}
}

function beamer_protocol_handler(ws: WebSocket, raw_data: RawData) {
	const s_data = raw_data.toString();
	
	let o_data = JSON.parse(s_data);

	const o_command_map = {"open-sequence": s_open_sequence};

	let response: string;

	if (o_data["command"] === undefined) {
		response = "ERROR: 'command' is missing";
	} else if (!(o_data["command"] in o_command_map)) {
		response = `ERROR: '${o_data["command"]}' is not supported`;
	} else {
		response = o_command_map[o_data["command"]](ws, o_data);
	}

	ws.send(response);
}

const ws_server = new websocket_server(i_ws_port, { "beamer-control": beamer_protocol_handler });

server.start()
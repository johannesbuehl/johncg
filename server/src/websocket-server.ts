import { ClientRequest, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';

// defintion of a JCGP-response
interface i_JGCP_response {
	command: "response";
	message: string;
	code: number;
}

interface MessageHandler {
	message: (ws: WebSocket, data: RawData) => void;
	open?: (ws: WebSocket) => void;
	ping?: (ws: WebSocket, data: Buffer) => void;
	pong?: (ws: WebSocket, data: Buffer) => void;
	error?: (ws: WebSocket, err: Error) => void;
	close?: (ws: WebSocket, reason: Buffer) => void;
	"unexpected-response"?: (ws: WebSocket, request: ClientRequest, response: IncomingMessage) => void;
	upgrade?: (ws: WebSocket, request: IncomingMessage) => void;
	connection?: (ws: WebSocket, socket: WebSocket, request: IncomingMessage) => void;
}

class websocket_server {
	private i_port: number;

	ws_server: WebSocketServer;

	// store the message handlers for the different protocols
	o_message_handlers: Record<string, MessageHandler>;

	o_a_connections: Record<string, WebSocket[]> = {};

	constructor(i_port: number, o_message_handlers: Record<string, MessageHandler>) {
		this.i_port = i_port;

		this.o_message_handlers = o_message_handlers;

		this.start();
	}

	start() {
		this.ws_server = new WebSocketServer({ port: this.i_port });

		this.ws_server.on("connection", (ws, socket, request) => this.on_connection(ws, socket, request));
	}

	private on_connection(ws: WebSocket,socket: WebSocket, request: IncomingMessage) {
		// check wether there is a protocol handler for the used protocol
		if (Object.keys(this.o_message_handlers).includes(ws.protocol)) {
			if (!Object.keys(this.o_a_connections).includes(ws.protocol)) {
				this.o_a_connections[ws.protocol] = [];
			}

			this.o_a_connections[ws.protocol].push(ws);

			// register the different action-handlers
			Object.entries(this.o_message_handlers[ws.protocol]).forEach(([s_type, f_handler]) => {
				ws.on(s_type, (...data) => this.o_message_handlers[ws.protocol][s_type](ws, ...data));
			});

			// execute the on_connection function
			if (this.o_message_handlers[ws.protocol].connection !== undefined) {
				this.o_message_handlers[ws.protocol].connection(ws, socket, request);
			}
		} else {
			// reject connection
			ws.send("Protocol not supported");

			ws.send(JSON.stringify({
				command: "response",
				message: `protocol '${ws.protocol}' is not supported`,
				code: 400
			}));
			ws.close();
		}

		// redirect errors to the console
		ws.on("error", console.error);

		// TESTING: answer pings with pongs
		ws.on("ping", ws.pong);
	}

	a_get_connections(s_protocol: string): WebSocket[] {
		if (Object.keys(this.o_a_connections).includes(s_protocol)) {
			return this.o_a_connections[s_protocol];
		} else {
			return [];
		}
	}
}

export { websocket_server, i_JGCP_response as JGCP_response };

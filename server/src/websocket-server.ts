import { ClientRequest, IncomingMessage } from "http";
import { WebSocketServer, WebSocket, RawData } from "ws";

// defintion of a JCGP-response
interface JGCPResponse {
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

	connections: Record<string, WebSocket[]> = {};

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
			if (!Object.keys(this.connections).includes(ws.protocol)) {
				this.connections[ws.protocol] = [];
			}

			this.connections[ws.protocol].push(ws);

			// register the different action-handlers
			Object.keys(this.o_message_handlers[ws.protocol]).forEach((s_type) => {
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
		ws.on("error", () => {
			console.error();

			ws.close();
		});

		ws.on("close", () => {
			ws.close();

			const index = this.connections[ws.protocol].indexOf(ws);

			if (index > -1) {
				this.connections[ws.protocol].splice(index, 1);
			}
		});
	}

	get_connections(s_protocol: string): WebSocket[] {
		if (Object.keys(this.connections).includes(s_protocol)) {
			return this.connections[s_protocol];
		} else {
			return [];
		}
	}
}

export { websocket_server, JGCPResponse };

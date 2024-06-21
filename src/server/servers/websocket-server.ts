import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";
import { logger } from "../logger";
import { random_id } from "../lib";

// defintion of a JCGP-response
export interface JCGPResponse {
	command: "response";
	message: string;
	code: number;
}

interface MessageHandler {
	message: (ws: WebSocket, data: RawData) => void;
	// open?: (ws: WebSocket) => void;
	// ping?: (ws: WebSocket, data: Buffer) => void;
	// pong?: (ws: WebSocket, data: Buffer) => void;
	// error?: (ws: WebSocket, err: Error) => void;
	// close?: (ws: WebSocket, reason: Buffer) => void;
	// // eslint-disable-next-line @typescript-eslint/naming-convention
	// "unexpected-response"?: (ws: WebSocket, request: ClientRequest, response: IncomingMessage) => void;
	// upgrade?: (ws: WebSocket, request: IncomingMessage) => void;
	open?: (ws: WebSocket) => void;
}

export interface WebsocketServerArguments {
	port: number;
}

export type WebsocketMessageHandler = Record<string, MessageHandler>;
export const server_id = random_id();

export default class WebsocketServer {
	ws_server: WebSocketServer;

	// store the message handlers for the different protocols
	message_handlers: Record<string, MessageHandler>;

	connections: Record<string, WebSocket[]> = {};

	constructor(args: WebsocketServerArguments, message_handlers: WebsocketMessageHandler) {
		this.message_handlers = message_handlers;

		this.ws_server = new WebSocketServer({ port: args.port });
		this.ws_server.on("connection", (ws: WebSocket) => this.on_connection(ws));
	}

	private on_connection(ws: WebSocket) {
		logger.debug(`new WebSocket-connection (${ws.url})`);

		// check wether there is a protocol handler for the used protocol
		if (Object.keys(this.message_handlers).includes(ws.protocol)) {
			if (!Object.keys(this.connections).includes(ws.protocol)) {
				this.connections[ws.protocol] = [];
			}

			this.connections[ws.protocol].push(ws);

			// register the different action-handlers
			Object.keys(this.message_handlers[ws.protocol]).forEach((s_type) => {
				switch (s_type as keyof MessageHandler) {
					case "message":
						ws.on("message", (data) => {
							this.message_handlers[ws.protocol]["message"](ws, data);
						});
						break;
				}
			});

			// execute the on_connection function
			const handle_function = this.message_handlers[ws.protocol].open;
			if (handle_function !== undefined) {
				handle_function(ws);
			}
		} else {
			logger.error(`closing WebSocket (${ws.url}): protocol not supported (${ws.protocol})`);

			// reject connection
			ws.send("Protocol not supported");

			ws.send(
				JSON.stringify({
					command: "response",
					message: `protocol '${ws.protocol}' is not supported`,
					code: 400
				})
			);
			ws.close();
		}

		// redirect errors to the console
		ws.on("error", (event: Error) => {
			logger.error(`WebSocket-connection error (${ws.url}): ${event.name}: ${event.message}`);

			ws.close();
		});

		ws.on("close", () => {
			logger.log(`WebSocket-connection closed (${ws.url})`);

			ws.close();

			// remove the connection from the list
			const index = this.connections[ws.protocol]?.indexOf(ws);

			if (index > -1) {
				this.connections[ws.protocol].splice(index, 1);
			}
		});
	}

	get_connections(protocol: string): WebSocket[] {
		if (Object.keys(this.connections).includes(protocol)) {
			return this.connections[protocol];
		} else {
			return [];
		}
	}
}

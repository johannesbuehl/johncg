import { WebSocketServer, WebSocket, RawData } from 'ws';

// defintion of a JCGP-response
interface i_JGCP_response {
	command: "response";
	message: string;
	code: number;
}

class websocket_server {
	ws_server: WebSocketServer;

	// store the message handlers for the different protocols
	o_message_handlers: Record<string, (ws: WebSocket, data: RawData) => void>;

	constructor(i_port: number, o_message_handlers: Record<string, (ws: WebSocket, data: RawData) => void>) {
		this.o_message_handlers = o_message_handlers;

		this.ws_server = new WebSocketServer({ port: i_port });

		this.ws_server.on("connection", (data) => this.on_connection(this, data));
	}

	private on_connection(self: websocket_server, ws_connection: WebSocket) {
		// check wether there is a protocol handler for the used protocol
		if (Object.keys(this.o_message_handlers).includes(ws_connection.protocol)) {
			// redirect messages to the protocol
			ws_connection.on("message", (data) => this.o_message_handlers[ws_connection.protocol](ws_connection, data));
		} else {
			// reject connection
			ws_connection.send("Protocol not supported");

			ws_connection.send(JSON.stringify({
				command: "response",
				message: `protocol '${ws_connection.protocol}' is not supported`,
				code: 400
			}));
			ws_connection.close();
		}

		// redirect errors to the console
		ws_connection.on("error", console.error);

		// TESTING: answer pings with pongs
		ws_connection.on("ping", ws_connection.pong);
	}
}

export { websocket_server, i_JGCP_response };

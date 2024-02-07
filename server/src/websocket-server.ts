import { WebSocketServer, WebSocket, RawData } from 'ws';

class websocket_server {
	ws_server: WebSocketServer;

	o_message_handlers: Record<string, (ws: WebSocket, data: RawData) => void>;

	constructor(i_port: number, o_message_handlers: Record<string, (ws: WebSocket, data: RawData) => void>) {
		this.o_message_handlers = o_message_handlers;

		this.ws_server = new WebSocketServer({ port: i_port });

		this.ws_server.on("connection", (data) => this.on_connection(this, data));
	}

	private on_connection(self: websocket_server, ws_connection: WebSocket) {
		if (Object.keys(this.o_message_handlers).includes(ws_connection.protocol)) {
			ws_connection.on("message", (data) => this.o_message_handlers[ws_connection.protocol](ws_connection, data));
		} else {
			ws_connection.send("Protocol not supported");
			ws_connection.close();
		}

		ws_connection.on("error", console.error);

		ws_connection.on("ping", ws_connection.pong);
	}
}

export { websocket_server };

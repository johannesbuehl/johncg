import HTTPServer from "./servers/http-server";

import Control from "./control";

import Config from "./config";

// http-server
const server = new HTTPServer(Config.client_server.http.port);

new Control(Config.client_server.websocket, {
	port_receive: Config.osc_server.port,
	address_send: Config.companion.address,
	port_send: Config.companion.osc_port
});

server.start();

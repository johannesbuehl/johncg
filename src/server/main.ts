import { http_server } from "./http-server";
import Control from "./control";

import Config from "./config";

// http-server
const server = new http_server(Config.clientServer.http.port);

new Control(Config.clientServer.websocket, {
	portReceive: Config.oscServer.port,
	addressSend: Config.companion.address,
	portSend: Config.companion.oscPort
});

server.start();

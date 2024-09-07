import HTTPServer from "./servers/http-server";

import Control from "./control";

import Config from "./config/config";

// http-server
new HTTPServer(Config.client_server.http.port);

new Control(Config.client_server.websocket);

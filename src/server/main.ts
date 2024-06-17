import HTTPServer from "./servers/http-server.ts";

import Control from "./control.ts";

import Config from "./config/config.ts";

// http-server
new HTTPServer(Config.client_server.http.port);

new Control(Config.client_server.websocket);

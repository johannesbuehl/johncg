import fs from "fs";
import http from "http";
import path from "path";
import mime from "mime-types";
import { unescape } from "querystring";

import Config from "./config";

class http_server {
	private port: number;

	server: http.Server;

	constructor(port: number) {
		this.port = port;
	}

	start() {
		this.server = http.createServer((request, response) => {
			let resource_dir = "client";

			// unescape the percent signs in the url
			request.url = unescape(request.url);

			// override different requested urls
			switch (request.url) {
				// redirect the root to the main-site
				case "/":
					request.url = "main.html";
					break;
				default:
					if (/\/BackgroundImage\/.*/.test(request.url)) {
						resource_dir = Config.path.backgroundImage;
						request.url = request.url.replace(/\/BackgroundImage\//, "");
					}
			}
				
			// try to serve the requested url
			fs.readFile(path.join(resource_dir, request.url), (err, data) => {
				// if there was an error while opening the file, serve a 404-error
				if (err) {
					response.writeHead(404, {
						"Content-Type": "text/plain"
					});

					response.write("Resource not found");
				} else {
					response.writeHead(200, {
						"Content-Type": mime.lookup(request.url)
					});
	
					// serve the file-content
					response.write(data);
				}
				
				response.end();
			});
		}).listen(this.port);
	}
}

export { http_server };

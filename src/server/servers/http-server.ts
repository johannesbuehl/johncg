import fs from "fs";
import http from "http";
import path from "path";
import mime from "mime-types";
import { unescape } from "querystring";

import Config from "../config";

class HTTPServer {
	private port: number;

	server: http.Server;

	constructor(port: number) {
		this.port = port;
	}

	start() {
		this.server = http.createServer((request, response) => {
			let resource_dir = "client";

			// unescape the percent signs in the url
			request.url = unescape(request.url!);

			// override different requested urls
			switch (true) {
				// redirect the root to the main-site
				case /^\/$/.test(request.url):
					request.url = "main.html";
					break;
				// serve the casparcg-templates
				case /^\/Templates\//.test(request.url):
					resource_dir = "casparcg-templates/JohnCG";
					request.url = request.url.replace(/\/Templates\//, "");
					break;
				// serve the background-images
				case /^\/BackgroundImage\//.test(request.url):
					resource_dir = Config.path.background_image;
					request.url = request.url.replace(/\/BackgroundImage\//, "");
					break;
			}
				
			// try to serve the requested url
			fs.readFile(path.join(resource_dir, request.url), (err, data) => {
				// if there was an error while opening the file, serve a 404-error
				if (err) {
					response.writeHead(404, {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						"Content-Type": "text/plain"
					});

					response.write("Resource not found");
				} else {
					response.writeHead(200, {
						// eslint-disable-next-line @typescript-eslint/naming-convention
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

export default HTTPServer;

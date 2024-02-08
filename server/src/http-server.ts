import fs from "fs";
import http from "http";
import path from "path";

class http_server {
	i_port: number;

	server: http.Server

	constructor(i_port: number) {
		this.i_port = i_port;
	}

	start() {
		this.server = http.createServer((request, response) => {
			// override different requested urls
			switch (request.url) {
				// redirect the root to the main-site
				case "/":
					request.url = "main.html";
					break;
			}
				
			let s_content_type = "";

			// guess the content-type based on the extension
			switch (path.extname(request.url)) {
				case "html":
					s_content_type = "text/html";
					break;
			}

			// try to serve the requested url
			fs.readFile(path.join("client", request.url), (err, data) => {
				// if there was an error while opening the file, serve a 404-error
				if (err) {
					response.writeHead(404, {
						"Content-Type": "text/plain"
					});

					response.write("Resource not found");
				} else {
					response.writeHead(200, {
						"Content-Type": s_content_type
					});
	
					// serve the file-content
					response.write(data);
				}
				
				response.end();
			});
		}).listen(this.i_port);
	}
}

export { http_server };

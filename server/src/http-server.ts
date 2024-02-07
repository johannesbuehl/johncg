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
			switch (request.url) {
				case "/":
					request.url = "main.html";
					break;
			}
				
			let s_content_type = "";

			switch (path.extname(request.url)) {
				case "html":
					s_content_type = "text/html";
					break;
			}

			fs.readFile(path.join("client", request.url), (err, data) => {
				if (err) {
					response.writeHead(404, {
						"Content-Type": "text/plain"
					});

					response.write("Resource not found");
				} else {
					response.writeHead(200, {
						"Content-Type": s_content_type
					});
	
					response.write(data);
				}
				
				response.end();
			});
		}).listen(this.i_port);
	}
}

export { http_server };

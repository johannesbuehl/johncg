interface ConfigJSON {
	behaviour: {
		showOnLoad: boolean;
	};
	path: {
		backgroundImage: string;
		song: string;
	};
	casparcg: {
		templates: {
			song: string
		};
		connections: {
			host: string;
			port: number;
			channel: number;
			layers: [number, number];
		}[];
	};
	clientServer: {
		http: {
			port: number;
		};
		websocket: {
			port: number;
		};
	};
	client: {
		ping: {
			frequency: number;
			timeout: number;
		};
	};
}



import fs from "fs";

const config_path = "config.json";

const Config: ConfigJSON = JSON.parse(fs.readFileSync(config_path, { encoding: "utf-8" }));

export default Config;

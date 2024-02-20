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
			Song: string,
			Countdown: string
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
	oscServer: {
		port: number;
	};
	companion: {
		address: string;
		oscPort: number;
	}
}



import fs from "fs";

const config_path = "config.json";

const Config: ConfigJSON = JSON.parse(fs.readFileSync(config_path, { encoding: "utf-8" }));

export default Config;

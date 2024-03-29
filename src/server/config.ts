export interface CasparCGConnectionSettings {
	host: string;
	port: number;
	channel: number;
	layers: [number, number];
}

export interface ConfigJSON {
	behaviour: {
		show_on_load: boolean;
	};
	path: {
		background_image: string;
		song: string;
	};
	casparcg: {
		templates: string;
		transition_length: number;
		connections: CasparCGConnectionSettings[];
	};
	client_server: {
		http: {
			port: number;
		};
		websocket: {
			port: number;
		};
	};
	osc_server: {
		port: number;
	};
	companion: {
		address: string;
		osc_port: number;
	}
}



import fs from "fs";

const config_path = "config.json";


// eslint-disable-next-line @typescript-eslint/naming-convention
const Config: ConfigJSON = JSON.parse(fs.readFileSync(config_path, { encoding: "utf-8" })) as ConfigJSON;

export default Config;

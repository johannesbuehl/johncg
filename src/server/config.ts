export interface CasparCGConnectionSettings {
	host: string;
	port: number;
	channel: number;
	layers: {
		song: [number, number];
		command_comment: number;
	};
}

interface ConfigJSON {
	behaviour: {
		show_on_load: boolean;
	};
	path: {
		background_image: string;
		song: string;
	};
	casparcg: {
		templates: string;
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

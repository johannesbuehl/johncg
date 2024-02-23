export interface CasparCGConnectionSettings {
	host: string;
	port: number;
	channel: number;
	layers: [number, number];
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
		templates: {
			/* eslint-disable @typescript-eslint/naming-convention */
			Song: string,
			Countdown: string
			/* eslint-enable @typescript-eslint/naming-convention */
		};
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

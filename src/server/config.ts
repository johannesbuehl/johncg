export interface CasparCGConnectionSettings {
	host: string;
	port: number;
	channel: number;
	layers: {
		media?: number;
		template: number;
	};
}

export interface ConfigJSON {
	log_level: keyof Levels;
	behaviour: {
		show_on_load: boolean;
	};
	path: {
		playlist: string;
		song: string;
		psalm: string;
		pdf: string;
		bible: string;
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
	};
}

import fs from "fs";
import { Levels } from "log4js";
import path from "path";
import { recurse_object_check } from "./lib";

const config_path = "config.json";

// eslint-disable-next-line @typescript-eslint/naming-convention
const Config: ConfigJSON = JSON.parse(
	fs.readFileSync(config_path, { encoding: "utf-8" })
) as ConfigJSON;

// validate the config file
const config_template: ConfigJSON = {
	log_level: "INFO",
	behaviour: {
		show_on_load: true
	},
	path: {
		playlist: "template",
		song: "template",
		psalm: "template",
		pdf: "template",
		bible: "template"
	},
	casparcg: {
		templates: "template",
		transition_length: 5,
		connections: [
			{
				channel: 0,
				host: "template",
				layers: {
					template: 0
				},
				port: 0
			}
		]
	},
	client_server: {
		http: {
			port: 0
		},
		websocket: {
			port: 0
		}
	},
	osc_server: {
		port: 0
	},
	companion: {
		address: "template",
		osc_port: 0
	}
};

let file_check = recurse_object_check(Config, config_template);

file_check &&= ["ALL", "MARK", "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF"].includes(
	Config?.log_level
);
file_check &&= Config?.casparcg?.transition_length > 0;
file_check &&= Config?.casparcg?.connections?.every(
	(connection) => connection?.layers?.media !== connection?.layers?.template
);
file_check &&= Config?.casparcg?.connections?.every((connection) =>
	Object.values(connection?.layers).every((layer) => layer >= 0)
);

const check_valid_port = (port: unknown) =>
	typeof port === "number" && Number.isInteger(port) && port >= 0 && port <= 65535;

file_check &&= Config?.casparcg?.connections?.every((connection) =>
	check_valid_port(connection?.port)
);
file_check &&= check_valid_port(Config?.client_server?.http?.port);
file_check &&= check_valid_port(Config?.client_server?.websocket?.port);
file_check &&= check_valid_port(Config?.osc_server?.port);
file_check &&= check_valid_port(Config?.companion?.osc_port);

if (!file_check) {
	throw new SyntaxError("can't load config-file: invalid syntax");
}

export function get_song_path(pth: string): string {
	const return_path = path.isAbsolute(pth) ? pth : path.resolve(Config.path.song, pth);

	return return_path.replaceAll("\\", "/");
}

export function get_playlist_path(pth: string): string {
	const return_path = path.isAbsolute(pth) ? pth : path.resolve(Config.path.playlist, pth);

	return return_path.replaceAll("\\", "/");
}

export function get_psalm_path(pth: string): string {
	const return_path = path.isAbsolute(pth) ? pth : path.resolve(Config.path.psalm, pth);

	return return_path.replaceAll("\\", "/");
}

export function get_pdf_path(pth: string): string {
	const return_path = path.isAbsolute(pth) ? pth : path.resolve(Config.path.pdf, pth);

	return return_path.replaceAll("\\", "/");
}

export default Config;

export interface CasparCGConnectionSettings {
	host: string;
	port: number;
	channel: number;
	layers: [number, number];
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

const config_path = "config.json";

// eslint-disable-next-line @typescript-eslint/naming-convention
const Config: ConfigJSON = JSON.parse(
	fs.readFileSync(config_path, { encoding: "utf-8" })
) as ConfigJSON;

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

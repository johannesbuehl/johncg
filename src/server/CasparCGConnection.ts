import { CasparCG, ClipInfo } from "casparcg-connection";
import Config, { CasparCGConnectionSettings, get_casparcg_transition } from "./config";
import { logger } from "./logger";
import { XMLParser } from "fast-xml-parser";
import CasparCGServer from "./CasparCGServer";

interface CasparCGPathsSettings {
	/* eslint-disable @typescript-eslint/naming-convention */
	/* eslint-disable @typescript-eslint/naming-convention */
	"data-path": string;
	"initial-path": string;
	"log-path": string;
	"media-path": string;
	"template-path": string;
	/* eslint-enable @typescript-eslint/naming-convention */
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface CasparCGResolution {
	width: number;
	height: number;
}

export interface CasparCGConnection {
	connection: CasparCG;
	settings: CasparCGConnectionSettings;
	media: ClipInfo[];
	template: string[];
	server?: CasparCGServer;
}

interface CallbackObject {
	connect: ((casparcg_connection: CasparCGConnection) => void)[];
	disconnect: ((casparcg_connection: CasparCGConnection) => void)[];
	error: ((casparcg_connection: CasparCGConnection, err?: Error) => void)[];
}
const callbacks: CallbackObject = {
	connect: [],
	disconnect: [],
	error: []
};
export function add_casparcg_listener<T extends keyof CallbackObject>(
	type: T,
	func: CallbackObject[T][number]
) {
	callbacks[type].push(func);
}

const xml_parser = new XMLParser();

// initiate all casparcg-connections
export const casparcg: { visibility: boolean; casparcg_connections: CasparCGConnection[] } = {
	visibility: true,
	casparcg_connections: []
};

void (async () => {
	casparcg.casparcg_connections = await Promise.all(
		Config.casparcg.connections.map(async (connection_setting) => {
			logger.log(`Adding CasparCG-connection ${JSON.stringify(connection_setting)}`);

			let connection: CasparCG;
			let server: CasparCGServer;

			// if a path is specified, try to launch it
			if (connection_setting.path !== undefined) {
				try {
					server = new CasparCGServer(connection_setting.path);

					// wait for a few seconds before trying to connect
					await new Promise((resolve) => setTimeout(resolve, 5000));
				} catch (e) {
					/* empty */
				}
			}

			try {
				connection = new CasparCG({
					...connection_setting,
					/* eslint-disable @typescript-eslint/naming-convention */
					autoConnect: true
					/* eslint-enable @typescript-eslint/naming-convention */
				});
			} catch (e) {
				/* empty */
			}

			const casparcg_connection: CasparCGConnection = {
				connection,
				settings: connection_setting,
				media: (await (await connection.cls()).request)?.data ?? [],
				template: (await (await connection.tls()).request)?.data ?? [],
				server
			};

			connection.addListener("connect", () => {
				callbacks.connect.forEach((ele) => ele(casparcg_connection));
			});

			connection.addListener("disconnect", () => {
				callbacks.disconnect.forEach((ele) => ele(casparcg_connection));
			});

			connection.addListener("error", (err) => {
				callbacks.error.forEach((ele) => ele(casparcg_connection, err));
			});

			// add the connection to the stored connections
			return casparcg_connection;
		})
	);

	let casparcg_config;
	const connection = casparcg.casparcg_connections[0];

	try {
		casparcg_config = (await (await connection.connection.infoConfig()).request).data;
	} catch (e) {
		if (e instanceof Error) {
			logger.error(
				`Can't add CasparCG-connection (${connection.settings.host}:${connection.settings.port})`
			);
		} else {
			logger.error(
				`Can't add CasparCG-connection (${connection.settings.host}:${connection.settings.port}): unknown error`
			);
		}

		if (e instanceof TypeError) {
			return;
		}
	}

	let framerate: number = 25;

	let video_mode_regex_results: RegExpMatchArray | undefined | null;

	if (casparcg_config?.channels !== undefined) {
		video_mode_regex_results = casparcg_config?.channels[
			connection.settings.channel - 1
		].videoMode?.match(
			/(?:(?<dci>dci)?(?:(?<width>\d+)x)?(?<height>\d+)[pi](?<framerate>\d{4})|(?<mode>PAL|NTSC))/
		);
	}

	if (video_mode_regex_results?.groups !== undefined) {
		// if the resolution is given as PAL or NTSC, convert it
		if (video_mode_regex_results.groups.mode) {
			switch (video_mode_regex_results.groups.mode) {
				case "PAL":
					Config.casparcg_resolution = {
						width: 720,
						height: 576
					};
					framerate = 25;
					break;
				case "NTSC":
					Config.casparcg_resolution = {
						width: 720,
						height: 480
					};
					framerate = 29.97;
					break;
			}
		} else {
			Config.casparcg_resolution = {
				width:
					Number(video_mode_regex_results.groups.width) ??
					(Number(video_mode_regex_results.groups.height) / 9) * 16,
				height: Number(video_mode_regex_results.groups.height)
			};
			framerate = Number(video_mode_regex_results.groups.framerate) / 100;
		}
	}

	logger.log(
		`using resolution: '${Config.casparcg_resolution.width}x${Config.casparcg_resolution.height}p${framerate}'`
	);

	const paths = (
		xml_parser.parse(
			((await (await connection.connection.infoPaths()).request)?.data as string) ?? ""
		) as {
			paths: object;
		}
	)?.paths as CasparCGPathsSettings;

	Config.casparcg_template_path = paths["template-path"];
})();

export function casparcg_clear(casparcg_connection?: CasparCGConnection) {
	const connections =
		casparcg_connection !== undefined ? [casparcg_connection] : casparcg.casparcg_connections;

	return connections.map((casparcg_connection) => {
		return Promise.allSettled([
			casparcg_connection.connection.play({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers.media,
				clip: "EMPTY",
				transition: get_casparcg_transition()
				/* eslint-enable @typescript-eslint/naming-convention */
			}),
			casparcg_connection.connection.play({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers.template,
				clip: "EMPTY",
				transition: get_casparcg_transition()
				/* eslint-enable @typescript-eslint/naming-convention */
			})
		]);
	});
}

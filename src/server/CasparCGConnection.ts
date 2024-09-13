import { CasparCG } from "casparcg-connection";
import Config, { CasparCGConnectionSettings } from "./config/config";
import { logger } from "./logger";
import { XMLParser } from "fast-xml-parser";
import CasparCGServer from "./CasparCGServer";
import { sleep } from "./lib";

interface CasparCGPathsSettings {
	/* eslint-disable @typescript-eslint/naming-convention */
	"data-path": string;
	"initial-path": string;
	"log-path": string;
	"media-path": string;
	"template-path": string;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface CasparCGResolution {
	width: number;
	height: number;
}

export interface CasparCGConnection {
	connection: CasparCG;
	settings: CasparCGConnectionSettings;
	server?: CasparCGServer;
}

export interface TemplateSlideJump {
	command: "jump";
	slide: number;
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

export function stringify_json_for_tempalte<T>(data: T) {
	return JSON.stringify(
		JSON.stringify(data, (key, val: unknown) => {
			if (typeof val === "string") {
				return val.replaceAll('"', "\\u0022").replaceAll("\n", "\\n");
			} else {
				return val;
			}
		})
	);
}

const xml_parser = new XMLParser();

// initiate all casparcg-connections
export const casparcg: { visibility: boolean; casparcg_connections: CasparCGConnection[] } = {
	visibility: Config.behaviour.show_on_load,
	casparcg_connections: []
};

void (async () => {
	casparcg.casparcg_connections = Config.casparcg.connections.map((connection_setting) => {
		logger.log(`Adding CasparCG-connection ${JSON.stringify(connection_setting)}`);

		let server: CasparCGServer | undefined = undefined;

		// if a path is specified, try to launch it
		if (connection_setting.path !== undefined) {
			try {
				server = new CasparCGServer(connection_setting.path);

				// wait for a few seconds before trying to connect
				sleep(5);
			} catch {
				logger.error(`Can't launch CasparCG at ${connection_setting.path}`);
			}
		}

		const connection = new CasparCG({
			...connection_setting,
			/* eslint-disable @typescript-eslint/naming-convention */
			autoConnect: true
			/* eslint-enable @typescript-eslint/naming-convention */
		});

		const casparcg_connection: CasparCGConnection = {
			connection,
			settings: connection_setting,
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
	});

	const connection = casparcg.casparcg_connections[0];
	const casparcg_config = await catch_casparcg_timeout(
		async () => (await (await connection.connection.infoConfig()).request)?.data,
		"INFO CONFIG"
	);

	if (casparcg_config !== undefined) {
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
					width: Number(video_mode_regex_results.groups.width),
					height: Number(video_mode_regex_results.groups.height)
				};
				framerate = Number(video_mode_regex_results.groups.framerate) / 100;

				if (!isNaN(Config.casparcg_resolution.width) || Config.casparcg_resolution.width === 0) {
					Config.casparcg_resolution.width =
						(Number(video_mode_regex_results.groups.height) / 9) * 16;
				}
			}
		}

		logger.log(
			`using resolution: '${Config.casparcg_resolution.width}x${Config.casparcg_resolution.height}p${framerate}'`
		);
	}

	const casparcg_infopaths_string = await catch_casparcg_timeout(
		async () => (await (await connection.connection.infoPaths()).request)?.data as string,
		"INFO PATHS"
	);

	if (casparcg_infopaths_string !== undefined) {
		const paths = (
			xml_parser.parse(casparcg_infopaths_string) as {
				paths: object;
			}
		)?.paths as CasparCGPathsSettings;

		Config.casparcg_template_path = paths["template-path"];
	}
})();

export function casparcg_clear(casparcg_connection?: CasparCGConnection) {
	const connections =
		casparcg_connection !== undefined ? [casparcg_connection] : casparcg.casparcg_connections;

	return connections.map((casparcg_connection) => {
		return Promise.allSettled([
			casparcg_connection.settings.layers.media !== undefined
				? catch_casparcg_timeout(
						async () =>
							(
								await casparcg_connection.connection.play({
									/* eslint-disable @typescript-eslint/naming-convention */
									channel: casparcg_connection.settings.channel,
									layer: casparcg_connection.settings.layers.media ?? 20,
									clip: "EMPTY",
									transition: Config.casparcg_transition
									/* eslint-enable @typescript-eslint/naming-convention */
								})
							).request,
						"PLAY EMPTY on media-layer"
					)
				: undefined,
			catch_casparcg_timeout(
				async () =>
					(
						await casparcg_connection.connection.play({
							/* eslint-disable @typescript-eslint/naming-convention */
							channel: casparcg_connection.settings.channel,
							layer: casparcg_connection.settings.layers.template,
							clip: "EMPTY",
							transition: Config.casparcg_transition
							/* eslint-enable @typescript-eslint/naming-convention */
						})
					).request,
				"PLAY EMPTY on template-layer"
			)
		]);
	});
}

/**
 * execute a function inside of a try-catch-block and catch "Time out"-errors
 * @param func function to be wrapped
 * @param log_message `CasparCG-command timed out: '${handle}'`
 */
export async function catch_casparcg_timeout<T>(
	func: () => Promise<T>,
	log_message: string
): Promise<T | undefined>;
export async function catch_casparcg_timeout<T>(
	func: () => Promise<T>,
	error_handle: (e: unknown) => void
): Promise<T | undefined>;
export async function catch_casparcg_timeout<T>(
	func: () => Promise<T>,
	handle: string | ((e: unknown) => void)
): Promise<T | undefined> {
	let result: T | undefined = undefined;

	try {
		result = await func();
	} catch (e) {
		if (typeof handle === "function") {
			handle(e);
		} else {
			if (e instanceof Error && e.message === "Time out") {
				logger.error(`CasparCG-command timed out: '${handle}'`);
			} else {
				throw e;
			}
		}
	}

	return result;
}

export function thumbnail_retrieve(file_path: string) {
	return catch_casparcg_timeout(
		async () =>
			(
				await (
					await casparcg.casparcg_connections[0].connection.thumbnailRetrieve({
						filename: `"${file_path}"`
					})
				).request
			)?.data as string[],
		"THUMBNAIL RETRIEVE"
	);
}

export function thumbnail_generate(file_path: string) {
	return catch_casparcg_timeout(
		async () =>
			(
				await casparcg.casparcg_connections[0].connection.thumbnailGenerate({
					filename: `"${file_path}"`
				})
			).request,
		"THUMBNAIL GENERATE"
	);
}

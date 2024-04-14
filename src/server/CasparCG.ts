import { CasparCG, ClipInfo } from "casparcg-connection";
import Config, { CasparCGConnectionSettings, get_casparcg_transition } from "./config";
import { logger } from "./logger";
import { XMLParser } from "fast-xml-parser";

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
	paths: CasparCGPathsSettings;
	media: ClipInfo[];
	template: string[];
	resolution: CasparCGResolution;
	framerate: number;
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
// eslint-disable-next-line @typescript-eslint/no-misused-promises
Config.casparcg.connections.forEach(async (connection_setting) => {
	logger.log(`Adding CasparCG-connection ${JSON.stringify(connection_setting)}`);

	const connection: CasparCG = new CasparCG({
		...connection_setting,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		autoConnect: true
	});

	let casparcg_config;

	try {
		casparcg_config = (await (await connection.infoConfig()).request).data;
	} catch (e) {
		if (e instanceof Error) {
			logger.error(
				`Can't add CasparCG-connection (${connection_setting.host}:${connection_setting.port})`
			);
		} else {
			logger.error(
				`Can't add CasparCG-connection ${JSON.stringify(connection_setting)}: unknown exception`
			);
		}

		if (e instanceof TypeError) {
			return;
		}
	}

	let resolution: CasparCGResolution = {
		height: 1080,
		width: 1920
	};
	let framerate: number = 25;

	let video_mode_regex_results: RegExpMatchArray | undefined | null;

	if (casparcg_config?.channels !== undefined) {
		video_mode_regex_results = casparcg_config?.channels[
			connection_setting.channel - 1
		].videoMode?.match(
			/(?:(?<dci>dci)?(?:(?<width>\d+)x)?(?<height>\d+)[pi](?<framerate>\d{4})|(?<mode>PAL|NTSC))/
		);
	}

	if (video_mode_regex_results?.groups !== undefined) {
		// if the resolution is given as PAL or NTSC, convert it
		if (video_mode_regex_results.groups.mode) {
			switch (video_mode_regex_results.groups.mode) {
				case "PAL":
					resolution = {
						width: 720,
						height: 576
					};
					framerate = 25;
					break;
				case "NTSC":
					resolution = {
						width: 720,
						height: 480
					};
					framerate = 29.97;
					break;
			}
		} else {
			resolution = {
				width:
					(Number(video_mode_regex_results.groups.width ?? video_mode_regex_results.groups.height) /
						9) *
					16,
				height: Number(video_mode_regex_results.groups.height)
			};
			framerate = Number(video_mode_regex_results.groups.framerate) / 100;
		}
	}

	logger.log(`using resolution: '${resolution.width}x${resolution.height}p${framerate}'`);

	const casparcg_connection: CasparCGConnection = {
		connection,
		settings: connection_setting,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		paths: (
			xml_parser.parse(((await (await connection.infoPaths()).request)?.data as string) ?? "") as {
				paths: object;
			}
		)?.paths as CasparCGPathsSettings,
		media: (await (await connection.cls()).request)?.data ?? [],
		template: (await (await connection.tls()).request)?.data ?? [],
		resolution,
		framerate
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
	casparcg.casparcg_connections.push(casparcg_connection);
});

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

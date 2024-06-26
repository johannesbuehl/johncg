import fs from "fs";
import { Levels } from "log4js";
import path from "path";
import { recurse_object_check } from "./lib";
import { TransitionParameters } from "casparcg-connection";
import { TransitionType } from "casparcg-connection/dist/enums";
import { CasparCGResolution } from "./CasparCGConnection";
import yaml from "yaml";

export interface CasparCGConnectionSettings {
	host: string;
	port: number;
	channel: number;
	layers: {
		media?: number;
		template: number;
	};
	path?: string;
}

export interface ConfigYAML {
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
}

const config_path = "config.yaml";

// validate the config file
const config_template: ConfigYAML = {
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
	}
};

class ConfigClass {
	private config_path: string;

	private config: ConfigYAML;
	private config_internal: {
		casparcg_template_path?: string;
		casparcg_resolution: CasparCGResolution;
	} = {
		casparcg_resolution: { height: 1080, width: 1920 }
	};

	constructor(pth: string = config_path) {
		if (!this.open(pth)) {
			throw new SyntaxError("invalid config file");
		}
	}

	open(pth: string = config_path): boolean {
		const new_config = yaml.parse(fs.readFileSync(pth, "utf-8")) as ConfigYAML;

		if (this.check_config(new_config)) {
			this.config_path = pth;

			this.config = new_config;

			return true;
		} else {
			return false;
		}
	}

	reload(): boolean {
		return this.open(this.config_path);
	}

	save(pth: string = this.config_path) {
		fs.writeFileSync(pth, JSON.stringify(this.config, undefined, "\t"));
	}

	private check_config(config: ConfigYAML): boolean {
		let file_check = recurse_object_check(config, config_template);

		file_check &&= [
			"ALL",
			"MARK",
			"TRACE",
			"DEBUG",
			"INFO",
			"WARN",
			"ERROR",
			"FATAL",
			"OFF"
		].includes(config?.log_level);
		file_check &&= config?.casparcg?.transition_length > 0;
		file_check &&= config?.casparcg?.connections?.every(
			(connection) => connection?.layers?.media !== connection?.layers?.template
		);
		file_check &&= config?.casparcg?.connections?.every((connection) => {
			let check = Object.values(connection?.layers).every((layer) => layer >= 0);

			if (connection.path !== undefined) {
				check &&= typeof connection.path === "string";
			}

			return check;
		});

		const check_valid_port = (port: unknown) =>
			typeof port === "number" && Number.isInteger(port) && port >= 0 && port <= 65535;

		file_check &&= config?.casparcg?.connections?.every((connection) =>
			check_valid_port(connection?.port)
		);
		file_check &&= check_valid_port(config?.client_server?.http?.port);
		file_check &&= check_valid_port(config?.client_server?.websocket?.port);

		return file_check;
	}

	get_path(type: keyof ConfigYAML["path"] | "template", pth?: string): string {
		let base_path: string;

		if (type === "template") {
			base_path = this.config_internal.casparcg_template_path;
		} else if (Object.keys(this.config.path).includes(type)) {
			base_path = this.config.path[type];
		}

		if (base_path !== undefined) {
			if (pth !== undefined) {
				const return_path = path.isAbsolute(pth) ? pth : path.resolve(base_path, pth);

				return return_path.replaceAll("\\", "/");
			} else {
				return base_path;
			}
		}
	}

	set casparcg_template_path(pth: string) {
		if (typeof pth === "string" && pth.length > 0) {
			this.config_internal.casparcg_template_path = structuredClone(pth);
		}
	}

	set casparcg_resolution(res: CasparCGResolution) {
		const template: CasparCGResolution = {
			height: 0,
			width: 0
		};

		let result = recurse_object_check(res, template);

		result &&= res?.height > 0 && res?.width > 0;

		if (result) {
			this.config_internal.casparcg_resolution = structuredClone(res);
		}
	}

	get casparcg_resolution(): CasparCGResolution {
		return structuredClone(this.config_internal.casparcg_resolution);
	}

	get path(): ConfigYAML["path"] {
		return structuredClone(this.config.path);
	}

	get casparcg(): ConfigYAML["casparcg"] {
		return structuredClone(this.config.casparcg);
	}

	get log_level(): ConfigYAML["log_level"] {
		return structuredClone(this.config.log_level);
	}

	get client_server(): ConfigYAML["client_server"] {
		return structuredClone(this.config.client_server);
	}

	get behaviour(): ConfigYAML["behaviour"] {
		return structuredClone(this.config.behaviour);
	}
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const Config = new ConfigClass();
export default Config;

export function get_casparcg_transition(): TransitionParameters {
	return {
		duration: Config.casparcg.transition_length,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		transitionType: TransitionType.Mix
	};
}

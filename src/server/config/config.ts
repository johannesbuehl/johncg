import fs from "fs";
import { Levels } from "log4js";
import path from "path";
import yaml from "yaml";
import { ErrorObject, JSONSchemaType } from "ajv";

import config_schema from "../../../config.schema.json";

import { TransitionParameters } from "casparcg-connection";
import { TransitionType } from "casparcg-connection/dist/enums";
import { CasparCGResolution } from "../CasparCGConnection";
import { ajv } from "../lib";

export interface CasparCGConnectionSettings {
	host: string;
	port: number;
	channel: number;
	layers: {
		media?: number;
		template: number;
	};
	path?: string;
	stageview?: boolean;
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

const validate_config_file = ajv.compile(config_schema);
const config_path = "config.yaml";
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
		const open_result = this.open(pth);

		if (open_result !== null) {
			const errors = open_result
				.map((error) => `${error.instancePath}: ${error.message}`)
				.join(", ");

			throw new SyntaxError(`invalid config file: ${errors}`);
		}
	}

	open(pth: string = config_path): null | ErrorObject[] {
		const new_config = yaml.parse(fs.readFileSync(pth, "utf-8")) as ConfigYAML;

		if (validate_config_file(new_config)) {
			this.config_path = pth;

			this.config = new_config;

			return null;
		} else {
			return validate_config_file.errors ?? null;
		}
	}

	save(pth: string = this.config_path) {
		fs.writeFileSync(pth, JSON.stringify(this.config, undefined, "\t"));
	}

	get_path(type: keyof ConfigYAML["path"] | "template", pth?: string): string {
		let base_path: string = "";

		if (type === "template") {
			base_path = this.config_internal.casparcg_template_path ?? "Templates";
		} else if (Object.keys(this.config.path).includes(type)) {
			base_path = this.config.path[type];
		}

		if (pth !== undefined) {
			const return_path = path.isAbsolute(pth) ? pth : path.resolve(base_path, pth);

			return return_path.replaceAll("\\", "/");
		} else {
			return base_path;
		}
	}

	set casparcg_template_path(pth: string) {
		if (typeof pth === "string" && pth.length > 0) {
			this.config_internal.casparcg_template_path = structuredClone(pth);
		}
	}

	set casparcg_resolution(res: CasparCGResolution) {
		const casparcg_resolution_schema: JSONSchemaType<CasparCGResolution> = {
			/* eslint-disable @typescript-eslint/naming-convention */
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				width: {
					type: "integer",

					exclusiveMinimum: 0
				},
				height: {
					type: "integer",
					exclusiveMinimum: 0
				}
			},
			required: ["width", "height"],
			additionalProperties: false,
			definitions: {}
			/* eslint-enable @typescript-eslint/naming-convention */
		};

		const validate = ajv.compile(casparcg_resolution_schema);

		if (validate(res)) {
			this.config_internal.casparcg_resolution = structuredClone(res);
		}
	}

	get casparcg_resolution(): CasparCGResolution {
		return structuredClone(this.config_internal.casparcg_resolution);
	}

	get casparcg_transition(): TransitionParameters | undefined {
		if (Config.casparcg.transition_length) {
			return {
				duration: Config.casparcg.transition_length,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				transitionType: TransitionType.Mix
			};
		}
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

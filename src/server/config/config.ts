import fs from "fs";
import { Levels } from "log4js";
import path from "path";
import yaml from "yaml";
import { JSONSchemaType } from "ajv";

import config_schema from "../../../config.schema.json";

import { TransitionParameters } from "casparcg-connection";
import { TransitionType } from "casparcg-connection/dist/enums";
import { CasparCGResolution } from "../CasparCGConnection";
import { ajv } from "../lib";
import { BibleProps } from "../PlaylistItems/Bible";

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
		bible_citation_style: string;
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

export interface BibleCitationSeperatorsMap {
	sep_book_chapter: string;
	sep_chapter: string;
	sep_chapter_verse: string;
	sep_verse: string;
	range_verse: string;
}

const validate_config_file = ajv.compile(config_schema);
const validate_bible_file = ajv.compile({
	/* eslint-disable @typescript-eslint/naming-convention */
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		name: {
			type: "string"
		},
		version: {
			type: "string",
			pattern: "^v1\\.\\d+\\.\\d+$"
		},
		parts: {
			type: "object",
			additionalProperties: {
				type: "array",
				items: {
					type: "object",
					properties: {
						name: {
							type: "string"
						},
						books: {
							type: "array",
							items: {
								type: "object",
								properties: {
									name: {
										type: "string"
									},
									id: {
										type: "string"
									},
									chapters: {
										type: "array",
										items: {
											type: "number"
										}
									}
								},
								required: ["name", "id", "chapters"],
								additionalProperties: false
							}
						}
					},
					required: ["name", "books"],
					additionalProperties: false
				}
			}
		}
	},
	required: ["name", "version", "parts"],
	additionalProperties: false,
	definitions: {}
	/* eslint-enable @typescript-eslint/naming-convention */
});
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
			throw new SyntaxError(`invalid config file: ${open_result.join(", ")}`);
		}

		// validate the bible-file
		if (!validate_bible_file(JSON.parse(fs.readFileSync(this.get_path("bible"), "utf-8")))) {
			const errors =
				validate_bible_file.errors?.map((error) => `${error.instancePath}: ${error.message}`) ?? [];

			throw new SyntaxError(`invalid bible file: ${errors.join(", ")}`);
		}
	}

	open(pth: string = config_path): null | string[] {
		const new_config = yaml.parse(fs.readFileSync(pth, "utf-8")) as ConfigYAML;

		if (validate_config_file(new_config)) {
			// check wether all the paths exist
			const path_check_result = Object.entries(new_config.path)
				.map(([key, pth]) => {
					if (!fs.existsSync(pth)) {
						return `path for "${key}" doesn't exist ("${pth}")`;
					} else {
						switch (key) {
							case "bible":
								if (!fs.statSync(pth).isFile()) {
									return `path for "${key}" is no file ("${pth}")`;
								}
								break;
							default:
								if (!fs.statSync(pth).isDirectory()) {
									return `path for "${key}" is no directory ("${pth}")`;
								}
								break;
						}
					}
				})
				.filter((r) => r !== undefined);

			if (path_check_result.length > 0) {
				return path_check_result;
			}

			// parse the bible-citation-style
			const bible_citation_style =
				/^(?:1\. Moses)(?<sep_book_chapter>.*?)(?:1)(?<sep_chapter_verse>.*?)(?:2)(?<range_verse>.*?)(?:4)(?<sep_verse>.*?)(?:6)(?<sep_chapter>.*?)(?:7)$/.exec(
					new_config.behaviour.bible_citation_style
				);

			if (!bible_citation_style?.groups) {
				return ["bible-citation-template is invalid"];
			}

			this.bible_citation_seperators = {
				sep_book_chapter: bible_citation_style.groups["sep_book_chapter"],
				sep_chapter: bible_citation_style.groups["sep_chapter"],
				sep_chapter_verse: bible_citation_style.groups["sep_chapter_verse"],
				sep_verse: bible_citation_style.groups["sep_verse"],
				range_verse: bible_citation_style.groups["range_verse"]
			};

			this.config_path = pth;

			this.config = new_config;

			return null;
		} else {
			return (
				validate_config_file.errors?.map((error) => `${error.instancePath}: ${error.message}`) ?? []
			);
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

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private bible_citation_seperators: BibleCitationSeperatorsMap;

	create_bible_citation_string(book_id: string, chapters: BibleProps["chapters"]) {
		const seperators = this.bible_citation_seperators;

		// add the individual chapters
		const chapter_strings = Object.entries(chapters).map(([chapter, verses]): string => {
			// stop the loop-iteration, if there are no verses defined
			if (verses.length === 0) {
				return `${chapter}`;
			}

			const verse_range: { start: number; last: number } = {
				start: verses[0],
				last: verses[0]
			};

			// add the individual verses
			const verse_strings: string[] = [];

			for (let index = 1; index <= verses.length; index++) {
				const verse = verses[index];

				// if the current verse is not a direct successor of the last one, return the previous verse_range
				if (verse !== verse_range.last + 1) {
					// if in the verse-range start and last are the same, return them as a single one
					if (verse_range.start === verse_range.last) {
						verse_strings.push(verse_range.last.toString());
					} else {
						verse_strings.push(`${verse_range.start}${seperators.range_verse}${verse_range.last}`);
					}

					verse_range.start = verse;
				}

				verse_range.last = verse;
			}

			return `${chapter}${seperators.sep_chapter_verse}${verse_strings.filter(Boolean).join(seperators.sep_verse)}`;
		});

		return `${book_id}${seperators.sep_book_chapter}${chapter_strings.join(seperators.sep_chapter)}`;
	}
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const Config = new ConfigClass();
export default Config;

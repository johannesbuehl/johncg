import fs from "fs";

import { PlaylistItemBase } from "./PlaylistItem";
import type { ClientItemBase, ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem";
import Config from "../config/config";
import { logger } from "../logger";
import { TemplateSlideJump } from "../CasparCGConnection";
import { ajv } from "../lib";
import { JSONSchemaType } from "ajv";

export interface PsalmFile {
	metadata: {
		caption: string;
		id?: string;
		book?: string;
		indent: boolean;
	};
	text: string[][][];
}

export type PsalmTemplateMessage = PsalmTemplateData | TemplateSlideJump;

export interface PsalmTemplateData {
	command: "data";
	data: PsalmFile;
	slide: number;
}

export interface PsalmTemplate {
	template: "JohnCG/Psalm";
	data: PsalmTemplateData;
}

export interface PsalmProps extends ItemPropsBase {
	type: "psalm";
	file: string;
}

export type ClientPsalmItem = PsalmProps & ClientItemBase;

export interface ClientPsalmSlides extends ClientItemSlidesBase {
	type: "psalm";
	template: PsalmTemplate;
}

const psalm_props_schema: JSONSchemaType<PsalmProps> = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		type: {
			type: "string",
			const: "psalm"
		},
		caption: {
			type: "string"
		},
		color: {
			type: "string"
		},
		file: {
			type: "string"
		}
	},
	required: ["caption", "color", "file", "type"],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	additionalProperties: false
};
const validate_psalm_props = ajv.compile(psalm_props_schema);
export default class Psalm extends PlaylistItemBase {
	protected item_props: PsalmProps;

	// amount of slides this element has
	protected slide_count: number = 0;

	// currently active slide-number
	private active_slide_number: number = 0;

	constructor(props: PsalmProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);

		const psalm_content = this.psalm_file;

		if (psalm_content === false) {
			this.is_displayable = false;
		}
	}

	/**
	 * set the slide-number as active
	 * @param slide
	 */
	set_active_slide(slide: number): number {
		slide = this.validate_slide_number(slide);

		this.active_slide_number = slide;

		// display the slide
		void this.casparcg_navigate();

		return this.active_slide_number;
	}

	navigate_slide(steps: number): number {
		if (typeof steps !== "number") {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new TypeError(`steps ('${steps}') is no number`);
		}

		if (![-1, 1].includes(steps)) {
			throw new RangeError(`steps must be -1 or 1, but is ${steps}`);
		}

		const new_active_slide_number = this.active_slide + steps;
		let slide_steps = 0;

		// new active item has negative index -> roll over to the last slide of the previous element
		if (new_active_slide_number < 0) {
			slide_steps = -1;

			// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_slide_number >= this.slide_count) {
			slide_steps = 1;
		} else {
			this.active_slide_number = new_active_slide_number;

			// display the slide
			void this.casparcg_navigate();
		}

		return slide_steps;
	}

	create_client_object_item_slides(): Promise<ClientPsalmSlides | false> {
		const template = this.get_template();

		if (template !== undefined) {
			let title: string = "";
			const psalm_file = this.psalm_file;

			if (psalm_file !== false) {
				if (psalm_file.metadata.id !== undefined) {
					title = `${psalm_file.metadata.id} - `;
				}

				title += psalm_file.metadata.caption;
			}

			const return_item: ClientPsalmSlides = {
				type: "psalm",
				caption: this.item_props.caption,
				title,
				media: this.media,
				template
			};

			return Promise.resolve(return_item);
		} else {
			return Promise.resolve(false);
		}
	}

	protected validate_props = validate_psalm_props;

	get props(): PsalmProps {
		return this.item_props;
	}

	get active_slide(): number {
		return this.active_slide_number;
	}

	get playlist_item(): PsalmProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
	}

	get media(): string {
		return "JOHNCG/PSALM";
	}

	get loop(): boolean {
		return true;
	}

	protected get psalm_file(): PsalmFile | false {
		let psalm_content_string: string;

		try {
			psalm_content_string = fs.readFileSync(Config.get_path("psalm", this.props.file), "utf-8");
		} catch (e) {
			this.is_displayable = false;

			// if the error is because the file doesn't exist, skip the rest of the loop iteration
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				logger.error(`psalm '${this.props.file}' does not exist`);
				return false;
			} else if (e instanceof SyntaxError) {
				logger.error(`psalm '${this.props.file}' has invalid json`);
				return false;
			} else {
				throw e;
			}
		}

		let psalm: PsalmFile;

		try {
			psalm = JSON.parse(psalm_content_string) as PsalmFile;
		} catch (e) {
			if (e instanceof SyntaxError) {
				return false;
			} else {
				throw e;
			}
		}

		if (validate_psalm_file(psalm)) {
			this.slide_count = psalm.text.length;

			return psalm;
		} else {
			this.slide_count = 0;

			return false;
		}
	}

	get_template(): PsalmTemplate | undefined {
		const psalm_file = this.psalm_file;

		if (psalm_file !== false) {
			const template: PsalmTemplate = {
				template: "JohnCG/Psalm",
				data: {
					command: "data",
					slide: this.active_slide,
					data: psalm_file
				}
			};

			template.data.slide = this.active_slide;

			return template;
		} else {
			return undefined;
		}
	}

	get_markdown_export_string(full: boolean): string {
		let return_string = `# Psalm: "${this.props.caption}"`;

		if (this.psalm_file) {
			return_string += " (";

			if (this.psalm_file.metadata.id !== undefined) {
				return_string += `${this.psalm_file.metadata.id}: `;
			}

			return_string += `${this.psalm_file.metadata.caption})\n`;

			if (full) {
				this.psalm_file.text.forEach((slide) => {
					slide.forEach((block) => {
						block.forEach((line) => {
							return_string += `${line}  \n`;
						});

						return_string += "\n";
					});
				});
			}
		}

		return_string += "\n";

		return return_string;
	}
}

const psalm_file_schema: JSONSchemaType<PsalmFile> = {
	/* eslint-disable @typescript-eslint/naming-convention */
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		metadata: {
			type: "object",
			properties: {
				caption: {
					type: "string"
				},
				id: {
					type: "string",
					nullable: true
				},
				book: {
					type: "string",
					nullable: true
				},
				indent: {
					type: "boolean"
				}
			},
			required: ["caption", "indent"],
			additionalProperties: false
		},
		text: {
			type: "array",
			items: {
				type: "array",
				items: {
					type: "array",
					items: {
						type: "string"
					}
				}
			}
		}
	},
	required: ["metadata", "text"],
	additionalProperties: false
	/* eslint-enable @typescript-eslint/naming-convention */
};

export const validate_psalm_file = ajv.compile(psalm_file_schema);

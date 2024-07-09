import fs from "fs";

import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemBase, ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";
import { recurse_object_check } from "../lib.ts";
import Config from "../config/config.ts";
import { logger } from "../logger.ts";
import { TemplateSlideJump } from "../CasparCGConnection.ts";

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

	create_client_object_item_slides(): Promise<ClientPsalmSlides> {
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
			template: this.template
		};

		return Promise.resolve(return_item);
	}

	protected validate_props(props: PsalmProps): boolean {
		const template: PsalmProps = {
			type: "psalm",
			caption: "Template",
			color: "Template",
			file: "Template"
		};

		return props.type === "psalm" && recurse_object_check(props, template);
	}

	protected validate_psalm_file(psalm_string: string): PsalmFile | false {
		let psalm: PsalmFile;

		try {
			psalm = JSON.parse(psalm_string) as PsalmFile;
		} catch (e) {
			if (e instanceof SyntaxError) {
				return false;
			}
		}

		// check, that is no array
		if (Array.isArray(psalm)) {
			return false;
		}

		const template: PsalmFile = {
			metadata: {
				caption: "Template",
				indent: false
			},
			text: [[["Template"]]]
		};

		let result = true;

		if (psalm.metadata.book) {
			result &&= typeof psalm.metadata.book === "string";
		}

		if (psalm.metadata.id) {
			result &&= typeof psalm.metadata.id === "string";
		}

		if (psalm.metadata.indent) {
			result &&= typeof psalm.metadata.indent === "boolean";
		}

		result &&= recurse_object_check(psalm, template);

		if (result) {
			return psalm;
		} else {
			return false;
		}
	}

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
				return;
			} else if (e instanceof SyntaxError) {
				logger.error(`psalm '${this.props.file}' has invalid json`);
				return;
			} else {
				throw e;
			}
		}

		const psalm_content = this.validate_psalm_file(psalm_content_string);

		this.slide_count = psalm_content !== false ? psalm_content.text.length : 0;

		return this.validate_psalm_file(psalm_content_string);
	}

	get template(): PsalmTemplate {
		const psalm_file = this.psalm_file;

		const template: PsalmTemplate = {
			template: "JohnCG/Psalm",
			data: {
				command: "data",
				slide: this.active_slide,
				data: psalm_file !== false ? psalm_file : undefined
			}
		};

		template.data.slide = this.active_slide;

		return template;
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

import fs from "fs";

import { PlaylistItemBase, recurse_check } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";

export interface PsalmFile {
	metadata: {
		caption: string;
		id?: string;
		book?: string;
		indent?: boolean;
	};
	text: string[][][];
}

export interface PsalmTemplateData {
	data?: PsalmFile;
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

		this.is_selectable = this.validate_props(props);

		const psalm_content = this.psalm_file;

		if (psalm_content === false) {
			this.is_selectable = false;
		}
	}

	/**
	 * set the slide-number as active
	 * @param slide
	 */
	set_active_slide(slide: number): number {
		slide = this.validate_slide_number(slide);

		this.active_slide_number = slide;

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
		}

		return slide_steps;
	}

	create_client_object_item_slides(): Promise<ClientPsalmSlides> {
		const return_item: ClientPsalmSlides = {
			type: "psalm",
			caption: this.item_props.caption,
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

		return props.type === "psalm" && recurse_check(props, template);
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
				caption: "Template"
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

		result &&= recurse_check(psalm, template);

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

	get playlist_item(): PsalmProps & { selectable: boolean } {
		return { ...this.props, selectable: this.selectable };
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
			psalm_content_string = fs.readFileSync(this.props.file, { encoding: "utf-8" });
		} catch (e) {
			this.is_selectable = false;

			// if the error is because the file doesn't exist, skip the rest of the loop iteration
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				console.error(`psalm '${this.props.file}' does not exist`);
				return;
			} else if (e instanceof SyntaxError) {
				console.error(`psalm '${this.props.file}' has invalid json`);
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
				slide: this.active_slide,
				data: psalm_file !== false ? psalm_file : undefined
			}
		};

		template.data.slide = this.active_slide;

		return template;
	}
}

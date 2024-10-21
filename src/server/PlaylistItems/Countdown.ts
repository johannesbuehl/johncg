import { JSONSchemaType } from "ajv";

import { CountdownMode, ajv, countdown_title_map } from "../lib";
import { PlaylistItemBase } from "./PlaylistItem";
import type { ClientItemBase, ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem";

interface CountdownPosition {
	x: number;
	y: number;
}

export interface CountdownProps extends ItemPropsBase, CountdownTemplateData {
	type: "countdown";
	media: string;
}

export type ClientCountdownItem = CountdownProps & ClientItemBase;

export interface CountdownTemplate {
	template: "JohnCG/Countdown";
	data: CountdownTemplateData;
}

export interface ClientCountdownSlides extends ClientItemSlidesBase {
	type: "countdown";
	template: CountdownTemplate;
}

export interface CountdownTemplateData {
	position: CountdownPosition;
	font_size: number;
	font_color: string;
	time: string;
	show_seconds: boolean;
	mode: CountdownMode;
}

const countdown_props_schema: JSONSchemaType<CountdownProps> = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		position: {
			type: "object",
			properties: {
				x: {
					type: "number"
				},
				y: {
					type: "number"
				}
			},
			required: ["x", "y"],
			// eslint-disable-next-line @typescript-eslint/naming-convention
			additionalProperties: false
		},
		font_size: {
			type: "number"
		},
		font_color: {
			type: "string"
		},
		time: {
			type: "string"
		},
		show_seconds: {
			type: "boolean"
		},
		mode: {
			type: "string",
			enum: [
				CountdownMode.Duration,
				CountdownMode.EndTime,
				CountdownMode.Stopwatch,
				CountdownMode.Clock
			]
		},
		type: {
			type: "string",
			const: "countdown"
		},
		caption: {
			type: "string"
		},
		color: {
			type: "string"
		},
		media: {
			type: "string"
		}
	},
	required: [
		"caption",
		"color",
		"font_color",
		"font_size",
		"media",
		"mode",
		"position",
		"show_seconds",
		"time",
		"type"
	],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	additionalProperties: false
};

const validate_countdown_props = ajv.compile(countdown_props_schema);
export default class Countdown extends PlaylistItemBase {
	protected item_props: CountdownProps;

	protected slide_count: number = 1;

	private time: Date;

	constructor(props: CountdownProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);
	}

	navigate_slide(steps: number): number {
		if (typeof steps !== "number") {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new TypeError(`steps ('${steps}') is no number`);
		}

		if (![-1, 1].includes(steps)) {
			throw new RangeError(`steps must be -1 or 1, but is ${steps}`);
		}

		// directly return the steps as item-navigation-steps, since this can't be navigated
		return steps;
	}

	set_active_slide(slide?: number): number {
		slide = this.validate_slide_number(slide);

		const time = this.props.time.match(
			/(?<hours>\d+)(?::)(?<minutes>\d\d)((?::)(?<seconds>\d\d))?/
		);

		if (time?.groups !== undefined) {
			// depending on the countdown_mode, set the counter to now
			switch (this.props.mode) {
				case CountdownMode.Stopwatch:
					this.time = new Date();
					break;
				case CountdownMode.EndTime:
					this.time = new Date();

					this.time.setHours(parseInt(time.groups.hours));
					this.time.setMinutes(parseInt(time.groups.minutes));
					this.time.setSeconds(parseInt(time.groups?.seconds ?? "0"));

					// if the end-time is already passed, advance a day;
					if (this.time < new Date()) {
						this.time.setDate(this.time.getDate() + 1);
					}

					break;
				case CountdownMode.Duration:
					this.time = new Date();

					this.time.setHours(this.time.getHours() + parseInt(time.groups.hours));
					this.time.setMinutes(this.time.getMinutes() + parseInt(time.groups.minutes));
					this.time.setSeconds(this.time.getSeconds() + parseInt(time.groups?.seconds ?? "0"));
					break;
			}
		}

		return slide;
	}

	create_client_object_item_slides(): Promise<ClientCountdownSlides> {
		let title = countdown_title_map[this.props.mode];

		if (CountdownMode.Duration === this.props.mode || CountdownMode.EndTime === this.props.mode) {
			title += `: ${this.props.time}`;
		}

		return Promise.resolve({
			caption: this.props.caption,
			title,
			type: this.props.type,
			media: this.media,
			template: this.get_template()
		});
	}

	protected validate_props = validate_countdown_props;

	get active_slide(): number {
		// always return 0, because there is only 1 slide
		return 0;
	}

	get props(): CountdownProps {
		return this.item_props;
	}

	get playlist_item(): CountdownProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
	}

	get media(): string {
		return this.props.media;
	}

	get loop(): boolean {
		return true;
	}

	get_template(): CountdownTemplate {
		return {
			template: "JohnCG/Countdown",
			data: {
				time: this.time?.toLocaleTimeString("de-DE"),
				mode: this.props.mode,
				position: this.props.position,
				font_size: this.props.font_size,
				font_color: this.props.font_color,
				show_seconds: this.props.show_seconds
			}
		};
	}

	get_markdown_export_string(full: boolean): string {
		let return_string = `# ${countdown_title_map[this.props.mode]}: "${this.props.caption}"`;

		if (full) {
			switch (this.props.mode) {
				case CountdownMode.Duration:
					return_string += `\nDuration: ${this.props.time}`;
					break;
				case CountdownMode.EndTime:
					return_string += `\nEnd time: ${this.props.time}`;
					break;
			}
		}

		return_string += "\n\n";

		return return_string;
	}
}

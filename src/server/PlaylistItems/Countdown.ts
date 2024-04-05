import { PlaylistItemBase, recurse_check } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";

const countdown_mode_items = ["duration", "end_time", "stopwatch", "clock"];
export type CountdownMode = (typeof countdown_mode_items)[number];

interface CountdownPosition {
	x: number;
	y: number;
}

export interface CountdownProps extends ItemPropsBase, CountdownTemplateData {
	type: "countdown";
	media: string;
}

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
	time: string;
	show_seconds: boolean;
	mode: CountdownMode;
}

export default class Countdown extends PlaylistItemBase {
	protected item_props: CountdownProps;

	protected slide_count: number = 1;

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

		return slide;
	}

	create_client_object_item_slides(): Promise<ClientCountdownSlides> {
		const title_map: Record<CountdownMode, string> = {
			clock: "Clock",
			stopwatch: "Stopwatch",
			duration: "Countdown (duration)",
			end_time: "Countdown (end time)"
		};

		return Promise.resolve({
			caption: `${title_map[this.template.data.mode]}: ${this.props.time}`,
			type: this.props.type,
			media: this.media,
			template: this.template
		});
	}

	protected validate_props(props: CountdownProps): boolean {
		const template: CountdownProps = {
			type: "countdown",
			caption: "Template",
			color: "Template",
			position: {
				x: 0,
				y: 0
			},
			font_size: 0,
			time: "Template",
			show_seconds: false,
			mode: "clock",
			media: "Template"
		};

		return (
			props.type === "countdown" &&
			countdown_mode_items.includes(props.mode) &&
			recurse_check(props, template)
		);
	}

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

	get template(): CountdownTemplate {
		return {
			template: "JohnCG/Countdown",
			data: {
				time: this.props.time,
				mode: this.props.mode,
				position: this.props.position,
				font_size: this.props.font_size,
				show_seconds: this.props.show_seconds
			}
		};
	}
}

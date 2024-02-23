import path from "path";
import { convert_color_to_hex } from "../Sequence";
import Config from "../config";
import { ClientItemSlidesBase, DeepPartial, FontFormat, ItemPropsBase, ItemRenderObjectBase, SequenceItemBase } from "./SequenceItem";

const countdown_mode_items = ["duration", "end_time", "stopwatch", "clock"];
type CountdownMode = (typeof countdown_mode_items)[number];

interface CountdownPosition { x: number, y: number }

interface CountdownSequenceItemProps extends ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type: "Countdown";
	Time: string;
	Data: string;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface CountdownProps extends CountdownSequenceItemProps {
	font_format: FontFormat;
	position: CountdownPosition;
	mode: CountdownMode;
	show_seconds: boolean;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	fileName?: string;
	background_color?: string;
}

export interface ClientCountdownSlides extends ClientItemSlidesBase {
	type: "Countdown";
	slides: [{
		time: string;
		mode: CountdownMode;
	}],
	slides_template: CountdownRenderObject & { mute_transition: true; };
}

export interface CountdownRenderObject extends ItemRenderObjectBase {
	type: "Countdown";
	caspar_type: "template";
	slides: [];
	position: CountdownPosition;
	font_format: FontFormat;
	time: string;
	show_seconds: boolean;
}

// data from in the hex-string of the countdown, uses CSS-notation for easy translation in the renderer
interface CountdownData {
	mode: CountdownMode;
	font_format: {
		/* eslint-disable @typescript-eslint/naming-convention */
		fontFamily?: string;
		fontSize: number;
		color: string;
		fontWeight?: "bold";
		fontStyle?: "italic";
		textDecoration?: "underline";
		/* eslint-enable @typescript-eslint/naming-convention */
	}
	x: number;
	y: number;
	show_seconds: boolean;
	background_image?: string;
	background_color?: string;
}

export default class Countdown extends SequenceItemBase {
	protected item_props: CountdownProps;
	
	protected slide_count: number = 1;

	constructor(props: CountdownSequenceItemProps) {
		super();

		const hex_data = parse_hex_data(props.Data);
		
		this.item_props = {
			...props,
			position: {
				x: hex_data.x,
				y: hex_data.y
			},
			show_seconds: hex_data.show_seconds,
			font_format: hex_data.font_format,
			mode: hex_data.mode,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			fileName: hex_data.background_image,
			background_color: hex_data.background_color
		};
	}

	navigate_slide(steps: number): number {
		if (typeof steps !== "number") {
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
	
	async create_client_object_item_slides(): Promise<ClientCountdownSlides> {
		const title_map = {
			clock: "Clock",
			stopwatch: "Stopwatch",
			duration: "Countdown (duration)",
			end_time: "Countdown (end time)"
		};
		
		return {
			title: `${title_map[this.props.mode]}: ${this.props.Time}`,
			type: this.props.type,
			item: this.props.item,
			slides: [{
				mode: this.props.mode,
				time: this.props.Time
			}],
			slides_template: {
				...await this.create_render_object(true),
				mute_transition: true
			}
		};
	}

	async create_render_object(proxy?: boolean): Promise<CountdownRenderObject> {
		return {
			caspar_type: "template",
			type: "Countdown",
			background_image: await this.get_background_image(proxy),
			slide: 0,
			slides: [],
			time: this.props.Time,
			font_format: this.props.font_format,
			position: this.props.position,
			show_seconds: this.props.show_seconds
		};
	}

	protected async get_background_image(proxy?: boolean): Promise<string> {
		// check wether the images have yet been laoded
		if (this.props.BackgroundImage === undefined) {
			const image_path = path.join(Config.path.background_image, this.props.fileName ?? "");

			await this.load_background_images(image_path, this.props.background_color);
		}

		return this.props.BackgroundImage![proxy ? "proxy" : "orig"];
	}

	get active_slide(): number {
		// always return 0, because there is only 1 slide
		return 0;
	}

	get props(): CountdownProps {
		return this.item_props;
	}
}

function parse_hex_data(data_hex): CountdownData {
	const regex_curse = /(?:546578745374796C6573060[1-3](?<bold>42)?(?<italic>49)?(?<underline>55)?|54657874436F6C6F72(?:(?:04|0707)(?<color>[0-9A-F]{6}|(?:[0-9A-F]{2})+?)0)|466F6E744E616D650604(?<font_name>(?:[A-F0-9]{2})+?)09|547970020(?<mode>[0-3])09|506F736974696F6E5802(?<x>[A-F0-9]{2})09|506F736974696F6E5902(?<y>[A-F0-9]{2})08|466F6E7453697A6502(?<font_size>[A-F0-9]{2})0F|4261636B67726F756E64496D616765(?:[A-F0-9]{4}636F6C6F723A2F2F244646(?<background_color>[A-F0-9]{12})|(?:[A-F0-9]{2})*?0[0-F]{3}(?<background_image>(?:[0-9A-F]{2})+?))0|53686F775365636F6E647308(?<show_seconds>.))/g;


	const data: DeepPartial<CountdownData> = {
		font_format: {
			color: undefined,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			fontSize: undefined
		},
		mode: undefined,
		x: undefined,
		y: undefined,
		show_seconds: true
	};
	
	const to_string = (raw) => Buffer.from(raw, "hex").toString();

	const to_int = (r) => parseInt(r, 16);

	const to_rgb = (r) => {
		// if it is longer than 6 bytes, it is an colorName
		if (r.length > 6) {
			return convert_color_to_hex(to_string(r));
		} else {
			return `#${r}`;
		}
	};

	// regex match the data
	for (const res of data_hex.matchAll(regex_curse)) {
		// parse the results and add them to the results-object
		Object.entries(res.groups).forEach(([key, val]) => {
			if (val !== undefined) {
				switch (key) {
					case "mode":
						data.mode = countdown_mode_items[Number(val)];
						break;
					case "color":
						data.font_format!.color = to_rgb(val);
						break;
					case "font_size":
						data.font_format!.fontSize = to_int(val);
						break;
					case "x":
					case "y":
						data[key] = to_int(val);
						break;
					case "show_seconds":
						data.show_seconds = !val;
						break;
					case "bold":
						data.font_format!.fontWeight = "bold";
						break;
					case "italic":
						data.font_format!.fontStyle = "italic";
						break;
					case "underline":
						data.font_format!.textDecoration = "underline";
						break;
					case "font_family":
						data.font_format!.fontFamily = to_string(val);
						break;
					case "background_image":
						data.background_image = to_string(val);
						break;
					case "background_color":
						data.background_color = `#${to_string(val)}`;
						break;
					default:
						console.error(`countdown_data['${key}'] is not implemented yet`);
						break;
				}
			}
		});
	}

	return data as CountdownData;
}
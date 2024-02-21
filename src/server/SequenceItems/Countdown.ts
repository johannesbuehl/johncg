import { convert_color_to_hex } from "../Sequence";
import { ClientItemSlidesBase, FontFormat, ItemPropsBase, ItemRenderObjectBase, SequenceItemBase, get_image_b64 } from "./SequenceItem";

const countdown_mode_items = ["duration", "end-time", "stopwatch", "clock"];
type CountdownMode = (typeof countdown_mode_items)[number];

interface CountdownPosition { x: number, y: number }

interface CountdownSequenceItemProps extends ItemPropsBase {
	Type: "Countdown";
	Time: string;
	Data: string;
}

export interface CountdownProps extends CountdownSequenceItemProps {
	FontFormat: FontFormat;
	Position: CountdownPosition;
	Mode: CountdownMode;
	showSeconds: boolean;
	BackgroundImage?: string;
	BackgroundColor?: string;
}

export interface ClientCountdownSlides extends ClientItemSlidesBase {
	Type: "Countdown";
	slides: [{
		time: string;
		mode: CountdownMode;
	}],
	slides_template: CountdownRenderObject;
}

export interface CountdownRenderObject extends ItemRenderObjectBase {
	slides: undefined;
	position: CountdownPosition;
	fontFormat: FontFormat;
	time: string;
	showSeconds: boolean;
}

// data from in the hex-string of the countdown, uses CSS-notation for easy translation in the renderer
interface CountdownData {
	mode: CountdownMode;
	fontFormat: {
		fontFamily?: string;
		fontSize: number;
		color: string;
		fontWeight?: "bold";
		fontStyle?: "italic";
		textDecoration?: "underline";
	}
	x: number;
	y: number;
	showSeconds: boolean;
	backgroundImage?: string;
	backgroundColor?: string;
}

export default class Countdown extends SequenceItemBase {
	protected item_props: CountdownProps;
	
	protected SlideCount: number = 1;

	constructor(props: CountdownSequenceItemProps) {
		super();

		const hex_data = parse_hex_data(props.Data);
		
		this.item_props = {
			...props,
			Position: {
				x: hex_data.x,
				y: hex_data.y
			},
			showSeconds: hex_data.showSeconds,
			FontFormat: hex_data.fontFormat,
			Mode: hex_data.mode,
			BackgroundImage: hex_data.backgroundImage,
			BackgroundColor: hex_data.backgroundColor
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
		this.validate_slide_number(slide);

		return slide;
	}
	
	create_client_object_item_slides(): ClientCountdownSlides {
		const title_map = {
			clock: "Clock",
			stopwatch: "Stopwatch",
			duration: "Countdown (endtime)",
			"end-time": "Countdown (duration)"
		};
		
		return {
			title: `${title_map[this.item_props.Mode]}: ${this.item_props.Time}`,
			Type: this.item_props.Type,
			item: this.item_props.Item,
			slides: [{
				mode: this.item_props.Mode,
				time: this.item_props.Time
			}],
			slides_template: this.create_render_object(),
		};
	}

	create_render_object(): CountdownRenderObject {
		return {
			backgroundImage: get_image_b64(this.item_props.BackgroundImage),
			backgroundColor: this.item_props.BackgroundColor,
			slide: 0,
			slides: undefined,
			time: this.item_props.Time,
			fontFormat: this.item_props.FontFormat,
			position: this.item_props.Position,
			showSeconds: this.item_props.showSeconds
		};
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
	const regex_curse = /(?:546578745374796C6573060[1-3](?<bold>42)?(?<italic>49)?(?<underline>55)?|54657874436F6C6F72(?:(?:04|0707)(?<color>[0-9A-F]{6}|(?:[0-9A-F]{2})+?)0)|466F6E744E616D650604(?<fontName>(?:[A-F0-9]{2})+?)09|547970020(?<mode>[0-3])09|506F736974696F6E5802(?<x>[A-F0-9]{2})09|506F736974696F6E5902(?<y>[A-F0-9]{2})08|466F6E7453697A6502(?<fontSize>[A-F0-9]{2})0F|4261636B67726F756E64496D616765(?:[A-F0-9]{4}636F6C6F723A2F2F244646(?<backgroundColor>[A-F0-9]{12})|(?:[A-F0-9]{2})*?0[0-F]{3}(?<backgroundImage>(?:[0-9A-F]{2})+?))0|53686F775365636F6E647308(?<showSeconds>.))/g;


	const data: CountdownData = {
		fontFormat: {
			color: undefined,
			fontSize: undefined
		},
		mode: undefined,
		x: undefined,
		y: undefined,
		showSeconds: true
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
						data.fontFormat.color = to_rgb(val);
						break;
					case "fontSize":
						data.fontFormat.fontSize = to_int(val);
						break;
					case "x":
					case "y":
						data[key] = to_int(val);
						break;
					case "showSeconds":
						data.showSeconds = !val;
						break;
					case "bold":
						data.fontFormat.fontWeight = "bold";
						break;
					case "italic":
						data.fontFormat.fontStyle = "italic";
						break;
					case "underline":
						data.fontFormat.textDecoration = "underline";
						break;
					case "fontFamily":
						data.fontFormat.fontFamily = to_string(val);
						break;
					case "backgroundImage":
						data.backgroundImage = to_string(val);
						break;
					case "backgroundColor":
						data.backgroundColor = `#${to_string(val)}`;
						break;
					default:
						console.error(`countdown_data['${key}'] is not implemented yet`);
						break;
				}
			}
		});
	}

	return data;
}
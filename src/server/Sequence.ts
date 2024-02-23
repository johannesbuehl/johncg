import path from "path";
import { CasparCG, ClipInfo, Commands } from "casparcg-connection";
import mime from "mime-types";
import { XMLParser } from "fast-xml-parser";

import { SongElement } from "./SequenceItems/SongFile";
import { ClientItemSlides, ItemProps, ItemPropsBase, SequenceItem } from "./SequenceItems/SequenceItem";
import Song, { SongProps } from "./SequenceItems/Song";

import * as JGCPSend from "./JGCPSendMessages";

import Config, { CasparCGConnectionSettings } from "./config";
import Countdown, { CountdownProps } from "./SequenceItems/Countdown";
import Comment, { CommentProps } from "./SequenceItems/Comment";
import Image, { ImageProps } from "./SequenceItems/Image";
import { TransitionType } from "casparcg-connection/dist/enums";

interface ClientSequenceItems {
	sequence_items: ItemProps[];
	metadata: {
		item: number;
		visibility: boolean;
	}
}

interface ActiveItemSlide {
	item: number,
	slide: number
}

interface CasparCGPathsSettings {
	/* eslint-disable @typescript-eslint/naming-convention */
	"data-path": string;
	"initial-path": string;
	"log-path": string;
	"media-path": string;
	"template-path": string;
	/* eslint-enable @typescript-eslint/naming-convention */
}

interface CasparCGConnection {
	connection:	CasparCG,
	settings: CasparCGConnectionSettings,
	paths: CasparCGPathsSettings,
	media: ClipInfo[]
}

class Sequence {
	// store the individual items of the sequence
	sequence_items: SequenceItem[] = [];

	private active_item_number: number = 0;

	private casparcg_visibility: boolean = Config.behaviour.show_on_load;

	readonly casparcg_connections: CasparCGConnection[] = [];

	constructor(sequence: string) {
		this.parse_sequence(sequence);

		const xml_parser = new XMLParser();

		// create the casparcg-connections
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		Config.casparcg.connections.forEach(async (connection_setting) => {
			const connection: CasparCG = new CasparCG({
				...connection_setting,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				autoConnect: true
			});

			const casparcg_connection: CasparCGConnection = {
				connection,
				settings: connection_setting,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				paths: xml_parser.parse((await (await connection.infoPaths()).request)?.data as string ?? "")?.paths as CasparCGPathsSettings,
				media: (await (await connection.cls()).request)?.data ?? []
			};

			// add a listener to send send the current-slide on connection
			connection.addListener("connect", () => {
				// load the active-item
				this.casparcg_load_item(casparcg_connection);
			});
			
			// clear the previous casparcg-output on the layers
			this.casparcg_clear_layers(casparcg_connection);

			// load the first slide
			this.casparcg_load_item(casparcg_connection);
			
			// add the connection to the stored connections
			this.casparcg_connections.push(casparcg_connection);
		});

		this.set_active_item(0, 0);
	}

	destroy() {
		this.casparcg_clear_layers();

		this.casparcg_connections.forEach((casparcg_connection) => {
			casparcg_connection.connection.removeAllListeners();
			casparcg_connection.connection.disconnect();
		});
	}

	/**
	 * clear the casparcg-layers used
	 */
	casparcg_clear_layers(casparcg_connection?: CasparCGConnection) {
		const clear_layers = (connection: CasparCGConnection) => {
			void connection.connection.cgClear({
				channel: connection.settings.channel,
				layer: connection.settings.layers[0]
			});
			void connection.connection.cgClear({
				channel: connection.settings.channel,
				layer: connection.settings.layers[1]
			});
		};

		// if a conneciton was given as an argument, clear only it's layers
		if (casparcg_connection !== undefined) {
			clear_layers(casparcg_connection);
		} else {
			// clear the layers on all connnections
			this.casparcg_connections.forEach(clear_layers);
		}
	}

	parse_sequence(sequence: string): void {
		// check, wether the file starts like a songbeamer schedule
		if (sequence.startsWith("object AblaufPlanItems: TAblaufPlanItems")) {
			this.parse_songbeamer_sequence(sequence);
		}
	}

	parse_songbeamer_sequence(sequence: string) {
		// regex to split a sequence-file into individual items
		const re_scan_sequence_file = /item\r?\n(\r?\n|.)+?end/gm;
		// regex to extract information from an individual sequence-item
		const re_scan_sequence_item = /(\s+(Caption =\s+'(?<Caption>[\s\S]*?)'|CaptionFmtValue =\s+'(?<CaptionFmtValue>[\s\S]*?)'|Color =\s+(?<Color>[\s\S]*?)|FileName =\s+'(?<FileName>[\s\S]*?)'|VerseOrder =\s+'(?<VerseOrder>[\s\S]*?)'|Props =\s+\[(?<Props>)\]|StreamClass =\s+'(?<StreamClass>[\s\S]*?)'|Data =\s*\{\s*(?<Data>[\s\S]+)\s*\}|Lang = \(\s+(?<Language>\d)\)|PrimaryLang = (?<PrimaryLanguage>\d))$)/gm;

		// split the sequence into the individual items
		const re_results = sequence.match(re_scan_sequence_file);

		if (!re_results) {
			// if there were no results, check wether the sequence is empty
			if (/items\s*=\s*<\s*>/.test(sequence)) {
				throw new SyntaxError("sequence is empty");	
			}

			throw new SyntaxError("unable to parse sequence");
		}

		// process every element individually
		re_results.forEach((sequence_item) => {
			// reset the regex
			re_scan_sequence_item.lastIndex = 0;

			// store the regex results
			let re_results_item: RegExpExecArray | null;

			// store the data of the object
			let item_data: ItemPropsBase = {
				/* eslint-disable @typescript-eslint/naming-convention */
				type: "",
				Caption: "",
				Color: "",
				slide_count: 0,
				item: this.sequence_items.length,
				selectable: true
				/* eslint-enable @typescript-eslint/naming-convention */
			};

			// exec the item-regex until there are no more results
			do {
				re_results_item = re_scan_sequence_item.exec(sequence_item);
				
				// if there was a result, process it
				if (re_results_item !== null) {
					const results = re_results_item.groups;

					// only proceeds, when there are results
					if (results !== undefined) {	
						// remove all undefined values
						Object.keys(results).forEach(key => results[key] === undefined && delete results[key]);
						
						// parse all remaining values
						item_data = { ...item_data, ...parse_item_value_string(...Object.entries(results)[0]) };
					}
				}

			} while (re_results_item !== null);

			// store the sequence-item
			switch (item_data.type) {
				case "Song":
					this.sequence_items.push(new Song(item_data as SongProps));
					break;
				case "Countdown":
					this.sequence_items.push(new Countdown(item_data as CountdownProps));
					break;
				case "Image":
					this.sequence_items.push(new Image(item_data as ImageProps));
					break;
				default:
					// if it wasn't caught by other cases, it is either a comment or not implemented yet -> if there is no file specified, treat it as comment
					if (!Object.keys(item_data).includes("FileName")) {
						this.sequence_items.push(new Comment(item_data as CommentProps));
					}
					break;
			}
		});
	}
	
	create_client_object_sequence(): ClientSequenceItems {
		const return_sequence: ClientSequenceItems = {
			sequence_items: this.sequence_items.map((item) => item.props),
			metadata: {
				item: this.active_item_number,
				visibility: this.visibility
			}
		};

		return return_sequence;
	}

	async create_client_object_item_slides(item: number): Promise<ClientItemSlides> {
		return this.sequence_items[item].create_client_object_item_slides();
	}

	set_active_item(item: number, slide: number = 0): ActiveItemSlide {
		item = this.validate_item_number(item);

		this.active_item_number = item;

		this.active_sequence_item.set_active_slide(slide);

		this.casparcg_load_item();

		return this.active_item_slide;
	}

	set_active_slide(slide: number): number {
		const response = this.active_sequence_item.set_active_slide(slide);
		
		this.casparcg_select_slide(this.active_slide);
		
		return response;
	}

	/**
	 * Navigate to the next or previous item
	 * @param direction navigate forward ('next') or backward ('prev')
	 */
	// navigate_item(direction: NavigateDirection, slide: number = 0): void {
	navigate_item(steps: number, slide: number = 0): void {
		if (typeof steps !== "number") {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new TypeError(`steps ('${steps}') is no number`);
		}
		
		if (![-1, 1].includes(steps)) {
			throw new RangeError(`steps must be -1 or 1, but is ${steps}`);
		}

		let new_active_item_number = this.active_item_number;
		// steps until there is a selectable item
		do {
			new_active_item_number += steps;

			// if the new_active_item_number is back at the start, break, since there are no selectable items
			if (new_active_item_number === this.active_item_number) {
				console.error("loop around");
				return;
			}

			// sanitize the item-number
			new_active_item_number = this.sanitize_item_number(new_active_item_number);
		} while (!this.sequence_items[new_active_item_number].props.selectable);

		// new active item has negative index -> roll over to other end
		if (new_active_item_number < 0) {
			new_active_item_number = this.sequence_items.length - 1;
		// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_item_number > this.sequence_items.length - 1) {
			new_active_item_number = 0;
		}

		this.set_active_item(new_active_item_number, slide);
	}

	/**
	 * navigate to the next or previous slide
	 * @param direction navigate forward ('next') or backward ('prev')
	 * @returns wether the slide has been changed
	 */
	navigate_slide(steps: number): boolean {
		const item_steps = this.active_sequence_item.navigate_slide(steps);

		if (item_steps !== 0) {
			// if the item_steps is forwards, navigate to the first slide; if it is backwards navigate to the last one
			this.navigate_item(steps, steps > 0 ? 0 : -1);
		} else {
			this.casparcg_select_slide(this.active_sequence_item.active_slide);
		}

		return item_steps !== 0;
	}

	private validate_item_number(item: number): number {
		const item_count = this.sequence_items.length;

		if (item < -item_count || item >= this.sequence_items.length) {
			throw new RangeError(`item-number is out of range (${-item_count}-${item_count - 1})`);
		}

		if (item < 0) {
			item += item_count;
		}

		return item;
	}

	/**
	 * sanitize the item-number by over- / underrolling it.
	 * @param item
	 * @returns sanitized number; active_item_number if no integer was given
	 */
	private sanitize_item_number(item: number): number {
		if (!Number.isInteger(item)) {
			return this.active_item;
		}

		// clamp the range
		item = item % this.sequence_items.length;

		// if it is negative, roll over
		if (item < 0) {
			item += this.sequence_items.length;
		}

		return item;
	}

	private casparcg_load_item(casparcg_connection?: CasparCGConnection): void {
		const connections = casparcg_connection ? [casparcg_connection] : this.casparcg_connections;

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		connections.forEach(async (connection) => {
			// if no connection was give, flip the layers
			if (casparcg_connection === undefined) {
				// clear the lower layer
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				await connection.connection.cgClear({
					channel: connection.settings.channel,
					layer: connection.settings.layers[0]
				});
	
				await connection.connection.swap({
					channel: connection.settings.channel,
					layer: connection.settings.layers[0],
					channel2: connection.settings.channel,
					layer2: connection.settings.layers[1],
					transforms: true
				});
			}
		
			// generate the render-object
			const render_object = await this.active_sequence_item.create_render_object();

			// depending on the type, use different caspar-cg-functions
			switch (render_object?.caspar_type) {
				case "template": {

					void connection.connection.cgAdd({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: connection.settings.channel,
						layer: connection.settings.layers[1],
						cgLayer: 0,
						playOnLoad: this.casparcg_visibility,
						template: Config.casparcg.templates[this.active_sequence_item.props.type] as string,
						// escape quotation-marks by hand, since the old chrom-version of casparcg appears to have a bug
						data: JSON.stringify(JSON.stringify(render_object, (_key, val: unknown) => {
							if (typeof val === "string") {
								return val.replace("\"", "\\u0022");
							} else {
								return val;
							}
						}))
						/* eslint-enable @typescript-eslint/naming-convention */
					});
				} break;
				case "media": {
					// make it all uppercase and remove the extension to match casparcg-clips and make sure it uses forward slashes
					const req_name = render_object.file_name.replace(/\.[^(\\.]+$/, "").toUpperCase().replace(/\\/g, "/");

					let media_result: ClipInfo | undefined;

					// check all the casparcg-files, wether they contain a media-file that matches the path
					for (const m of connection.media) {
						const media_file = m.clip.toUpperCase().replace(/\\/, "/");
	
						if (req_name.endsWith(media_file)) {
							media_result = m;
							break;
						}
					}

					// if a matching media-file was found, use it
					if (media_result !== undefined) {
						void connection.connection.play({
							/* eslint-disable @typescript-eslint/naming-convention */
							channel:  connection.settings.channel,
							layer:  connection.settings.layers[1],
							clip: media_result.clip,
							transition: {
								duration: 12.5, // 25 frames = 1s@25fps
								transitionType: TransitionType.Mix
							}
							/* eslint-enable @typescript-eslint/naming-convention */
						});
					} else {
						void connection.connection.executeCommand({
							/* eslint-disable @typescript-eslint/naming-convention */
							command: Commands.PlayHtml,
							params: {
								channel:  connection.settings.channel,
								layer:  connection.settings.layers[1],
								url: JSON.stringify(render_object.background_image),
								transition: {
									duration: 12.5, // 25 frames = 1s@25fps
									transitionType: TransitionType.Mix
								}
								/* eslint-enable @typescript-eslint/naming-convention */
							}
						});
					}
				} break;
			}
		});
	}

	private casparcg_select_slide(slide: number): void {
		this.casparcg_connections.forEach((casparcg_connection) => {
			// jump to the slide-number in casparcg
			void casparcg_connection.connection.cgInvoke({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers[1],
				cgLayer: 0,
				method: `jump(${slide})`
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		});
	}

	async set_visibility(visibility: boolean): Promise<void> {
		for (const casparcg_connection of this.casparcg_connections) {
			// clear the background-layer, so that the foreground has an hide-animation
			await casparcg_connection.connection.clear({
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers[0]
			});

			const options = {
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers[1],
				cgLayer: 0
				/* eslint-enable @typescript-eslint/naming-convention */
			};
	
			this.casparcg_visibility = visibility;
	
			if (visibility) {
				void casparcg_connection.connection.cgPlay(options);
			} else {
				void casparcg_connection.connection.cgStop(options);
			}
		}
	}

	get active_item(): number {
		return this.active_item_number;
	}

	get active_sequence_item(): SequenceItem {
		return this.sequence_items[this.active_item];
	}

	get active_slide(): number {
		return this.active_sequence_item.active_slide;
	}

	get active_item_slide(): ActiveItemSlide {
		return {
			item: this.active_item_number,
			slide: this.active_sequence_item.active_slide
		};
	}

	get visibility(): boolean {
		return this.casparcg_visibility;
	}

	get state(): JGCPSend.State {
		return {
			command: "state",
			active_item_slide: this.active_item_slide,
			visibility: this.visibility
		};
	}
}

// parse an individual sequence-item-value
function parse_item_value_string(key: string, value: string): { [P in keyof ItemProps]?: ItemProps[P]; } {
	// remove line-breaks
	value = value.replace(/'\s\+\s+'/gm, "");
	// un-escape escaped characters
	value = value.replace(/'#(\d+)'/gm, (match, group: string) => String.fromCharCode(Number(group)));
	
	const return_props: { [P in keyof ItemProps]?: ItemProps[P]; } = {};
	
	// do value-type specific stuff
	switch (key) {
		case "Data":
			// remove whitespace and linebreaks
			return_props[key] = value.replace(/\s+/gm, "");
			break;
		case "VerseOrder":
			// split csv-line into an array
			return_props["VerseOrder"] = value.split(",") as SongElement[];
			break;
		case "FileName":
			// assume the type from the file-extension
			if (path.extname(value) === ".sng") {
				return_props.type = "Song";
			} else {
				const mime_type = mime.lookup(value);

				if (mime_type ? mime_type.split("/", 1)[0] === "image" : false) {
					return_props.type = "Image";
				}
			}
			return_props[key] = value;
			break;
		case "Color":
			if (value.substring(0, 2) === "cl") {
				return_props[key] = convert_color_to_hex(value);
			} else {
				const color_int = Number(value);

				const color = (color_int & 0x0000ff) << 16 | (color_int & 0x00ff00) | (color_int & 0xff0000) >> 16;

				const color_string = color.toString(16);
				return_props[key] = "#" + color_string.padStart(6, "0");
			}
			break;
		case "PrimaryLanguage":
		case "Language":
			return_props[key] = Number(value) - 1; // subtract 1, because Songbeamer start counting at 1
			break;
		case "CaptionFmtValue":
			return_props["Time"] = value;
			break;
		case "StreamClass":
			if (value === "TPresentationObjectTimer") {
				return_props.type = "Countdown";
			} else {
				return_props[key] = value;
			}
			break;
		default:
			return_props[key] = value;
			break;
	}

	return return_props;
}

function convert_color_to_hex(color: string): string | undefined {
	const colours = {
		claliceblue: "#f0f8ff",
		clantiquewhite: "#faebd7",
		claqua: "#00ffff",
		claquamarine: "#7fffd4",
		clazure: "#f0ffff",
		clbeige: "#f5f5dc",
		clbisque: "#ffe4c4",
		clblack: "#000000",
		clblanchedalmond: "#ffebcd",
		clblue: "#0000ff",
		clblueviolet: "#8a2be2",
		clbrown: "#a52a2a",
		clburlywood: "#deb887",
		clcadetblue: "#5f9ea0",
		clchartreuse: "#7fff00",
		clchocolate: "#d2691e",
		clcoral: "#ff7f50",
		clcornflowerblue: "#6495ed",
		clcornsilk: "#fff8dc",
		clcrimson: "#dc143c",
		clcyan: "#00ffff",
		cldarkblue: "#00008b",
		cldarkcyan: "#008b8b",
		cldarkgoldenrod: "#b8860b",
		cldarkgray: "#a9a9a9",
		cldarkgreen: "#006400",
		cldarkkhaki: "#bdb76b",
		cldarkmagenta: "#8b008b",
		cldarkolivegreen: "#556b2f",
		cldarkorange: "#ff8c00",
		cldarkorchid: "#9932cc",
		cldarkred: "#8b0000",
		cldarksalmon: "#e9967a",
		cldarkseagreen: "#8fbc8f",
		cldarkslateblue: "#483d8b",
		cldarkslategray: "#2f4f4f",
		cldarkturquoise: "#00ced1",
		cldarkviolet: "#9400d3",
		cldeeppink: "#ff1493",
		cldeepskyblue: "#00bfff",
		cldimgray: "#696969",
		cldodgerblue: "#1e90ff",
		clfirebrick: "#b22222",
		clfloralwhite: "#fffaf0",
		clforestgreen: "#228b22",
		clfuchsia: "#ff00ff",
		clgainsboro: "#dcdcdc",
		clghostwhite: "#f8f8ff",
		clgold: "#ffd700",
		clgoldenrod: "#daa520",
		clgray: "#808080",
		clgreen: "#008000",
		clgreenyellow: "#adff2f",
		clhoneydew: "#f0fff0",
		clhotpink: "#ff69b4",
		clindianred: "#cd5c5c",
		clindigo: "#4b0082",
		clivory: "#fffff0",
		clkhaki: "#f0e68c",
		cllavender: "#e6e6fa",
		cllavenderblush: "#fff0f5",
		cllawngreen: "#7cfc00",
		cllemonchiffon: "#fffacd",
		cllightblue: "#add8e6",
		cllightcoral: "#f08080",
		cllightcyan: "#e0ffff",
		cllightgoldenrodyellow: "#fafad2",
		cllightgrey: "#d3d3d3",
		cllightgreen: "#90ee90",
		cllightpink: "#ffb6c1",
		cllightsalmon: "#ffa07a",
		cllightseagreen: "#20b2aa",
		cllightskyblue: "#87cefa",
		cllightslategray: "#778899",
		cllightsteelblue: "#b0c4de",
		cllightyellow: "#ffffe0",
		cllime: "#00ff00",
		cllimegreen: "#32cd32",
		cllinen: "#faf0e6",
		clmagenta: "#ff00ff",
		clmaroon: "#800000",
		clmediumaquamarine: "#66cdaa",
		clmediumblue: "#0000cd",
		clmediumorchid: "#ba55d3",
		clmediumpurple: "#9370d8",
		clmediumseagreen: "#3cb371",
		clmediumslateblue: "#7b68ee",
		clmediumspringgreen: "#00fa9a",
		clmediumturquoise: "#48d1cc",
		clmediumvioletred: "#c71585",
		clmidnightblue: "#191970",
		clmintcream: "#f5fffa",
		clmistyrose: "#ffe4e1",
		clmoccasin: "#ffe4b5",
		clnavajowhite: "#ffdead",
		clnavy: "#000080",
		cloldlace: "#fdf5e6",
		clolive: "#808000",
		clolivedrab: "#6b8e23",
		clorange: "#ffa500",
		clorangered: "#ff4500",
		clorchid: "#da70d6",
		clpalegoldenrod: "#eee8aa",
		clpalegreen: "#98fb98",
		clpaleturquoise: "#afeeee",
		clpalevioletred: "#d87093",
		clpapayawhip: "#ffefd5",
		clpeachpuff: "#ffdab9",
		clperu: "#cd853f",
		clpink: "#ffc0cb",
		clplum: "#dda0dd",
		clpowderblue: "#b0e0e6",
		clpurple: "#800080",
		clrebeccapurple: "#663399",
		clred: "#ff0000",
		clrosybrown: "#bc8f8f",
		clroyalblue: "#4169e1",
		clsaddlebrown: "#8b4513",
		clsalmon: "#fa8072",
		clsandybrown: "#f4a460",
		clseagreen: "#2e8b57",
		clseashell: "#fff5ee",
		clsienna: "#a0522d",
		clsilver: "#c0c0c0",
		clskyblue: "#87ceeb",
		clslateblue: "#6a5acd",
		clslategray: "#708090",
		clsnow: "#fffafa",
		clspringgreen: "#00ff7f",
		clsteelblue: "#4682b4",
		cltan: "#d2b48c",
		clteal: "#008080",
		clthistle: "#d8bfd8",
		cltomato: "#ff6347",
		clturquoise: "#40e0d0",
		clviolet: "#ee82ee",
		clwheat: "#f5deb3",
		clwhite: "#ffffff",
		clwhitesmoke: "#f5f5f5",
		clyellow: "#ffff00",
		clyellowgreen: "#9acd32"
	};
	
	const return_value: unknown = colours[color.toLowerCase()];

	if (typeof return_value !== "string") {
		return "";
	} else {
		return return_value;
	}
}

// export { NavigateType, isItemNavigateType, ClientSequenceItems, ClientItemSlides, ActiveItemSlide };
export { ClientSequenceItems, ActiveItemSlide, convert_color_to_hex };
export default Sequence;

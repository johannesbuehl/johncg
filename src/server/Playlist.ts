import path from "path";
import type { APIRequest, Commands, TransitionParameters } from "casparcg-connection";
import mime from "mime-types";

import type { SongElement } from "./PlaylistItems/SongFile.ts";
import type {
	ClientItemSlides,
	ItemProps,
	ItemPropsBase,
	PlaylistItem
} from "./PlaylistItems/PlaylistItem.ts";
import Song from "./PlaylistItems/Song.ts";
import type { SongProps } from "./PlaylistItems/Song.ts";

import * as JGCPSend from "./JGCPSendMessages.ts";
import * as JGCPRecv from "./JGCPReceiveMessages.ts";

import Config from "./config.ts";
import Countdown from "./PlaylistItems/Countdown.ts";
import type { CountdownProps } from "./PlaylistItems/Countdown.ts";
import Comment from "./PlaylistItems/Comment.ts";
import type { CommentProps } from "./PlaylistItems/Comment.ts";
import Image from "./PlaylistItems/Image.ts";
import type { ImageProps } from "./PlaylistItems/Image.ts";
import CommandComment from "./PlaylistItems/CommandComment.ts";
import type { CommandCommentProps } from "./PlaylistItems/CommandComment.ts";
import type { CasparCGConnection } from "./control.ts";
import PDF from "./PlaylistItems/PDF.ts";
import type { PDFProps } from "./PlaylistItems/PDF.ts";

export interface ClientPlaylistItems {
	playlist_items: ItemProps[];
}

export interface ActiveItemSlide {
	item: number;
	slide: number;
}

export interface CasparCGResolution {
	width: number;
	height: number;
}

/* eslint-disable @typescript-eslint/naming-convention */
enum TransitionType {
	Cut = "CUT",
	Mix = "MIX",
	Push = "PUSH",
	Wipe = "WIPE",
	Slide = "SLIDE",
	Sting = "STING"
}
/* eslint-enable @typescript-eslint/naming-convention */

export default class Playlist {
	// store the individual items of the playlist
	playlist_items: PlaylistItem[] = [];

	private active_item_number: number = 0;

	private casparcg_visibility: boolean = Config.behaviour.show_on_load;

	readonly casparcg_connections: CasparCGConnection[] = [];

	readonly casparcg_transition: TransitionParameters = {
		/* eslint-disable @typescript-eslint/naming-convention */
		duration: Config.casparcg.transition_length,
		transitionType: TransitionType.Mix
		/* eslint-enable @typescript-eslint/naming-convention */
	};

	constructor(playlist?: string) {
		if (typeof playlist === "string") {
			this.parse_playlist(playlist);

			this.set_active_item(0, 0);
		}
	}

	destroy() {
		this.casparcg_clear_layers();

		this.casparcg_connections.forEach((casparcg_connection) => {
			// casparcg_connection.connection.removeAllListeners();

			casparcg_connection.connection.removeListener("connect");
		});
	}

	add_casparcg_connection(casparcg_connection: CasparCGConnection) {
		this.casparcg_connections.push(casparcg_connection);

		// add a listener to send send the current-slide on connection
		casparcg_connection.connection.addListener("connect", () => {
			// load the active-item
			this.casparcg_load_item(casparcg_connection);
		});

		// clear the previous casparcg-output on the layers
		this.casparcg_clear_layers(casparcg_connection);

		// load the first slide
		this.casparcg_load_item(casparcg_connection);
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

	add_item(type: JGCPRecv.AddItem["type"], data: JGCPRecv.AddItem["data"]): boolean {
		switch (type) {
			case "song": {
				const song_props: SongProps = {
					/* eslint-disable @typescript-eslint/naming-convention */
					Caption: path.basename(data.path).replace(/\.[^(\\.]+$/, ""),
					Color: "#0000FF",
					FileName: data.path,
					selectable: true
					/* eslint-enable @typescript-eslint/naming-convention */
				};

				this.playlist_items.push(new Song(song_props));
				break;
			}
			default:
				return false;
		}

		this.set_active_item(-1, 0);

		return true;
	}

	delete_item(position: number): boolean {
		position = this.validate_item_number(position);

		this.playlist_items.splice(position, 1);

		// if the deleted item came before the ative-item, adjust the index of the active-item
		if (this.active_item > position) {
			this.active_item_number--;

			return true;
		} else {
			// if the deleted item was the active one, load the new-active-item into casparcg
			if (this.active_item === position) {
				this.casparcg_load_item();
			}

			return false;
		}
	}

	parse_playlist(playlist: string): void {
		// check, wether the file starts like a songbeamer schedule
		if (playlist.startsWith("object AblaufPlanItems: TAblaufPlanItems")) {
			this.parse_songbeamer_playlist(playlist);
		}
	}

	parse_songbeamer_playlist(playlist: string) {
		// regex to split a playlist-file into individual items
		const re_scan_playlist_file = /item\r?\n(\r?\n|.)+?end/gm;
		// regex to extract information from an individual playlist-item
		const re_scan_playlist_item =
			/(\s+(Caption =\s+'(?<Caption>[\s\S]*?)'|CaptionFmtValue =\s+'(?<CaptionFmtValue>[\s\S]*?)'|Color =\s+(?<Color>[\s\S]*?)|FileName =\s+'(?<FileName>[\s\S]*?)'|VerseOrder =\s+'(?<VerseOrder>[\s\S]*?)'|Props =\s+\[(?<Props>)\]|StreamClass =\s+'(?<StreamClass>[\s\S]*?)'|Data =\s*\{\s*(?<Data>[\s\S]+)\s*\}|Lang = \(\s+(?<Language>\d)\)|PrimaryLang = (?<PrimaryLanguage>\d))$)/gm;

		// split the playlist into the individual items
		const re_results = playlist.match(re_scan_playlist_file);

		if (!re_results) {
			// if there were no results, check wether the playlist is empty
			if (/items\s*=\s*<\s*>/.test(playlist)) {
				throw new SyntaxError("playlist is empty");
			}

			throw new SyntaxError("unable to parse playlist");
		}

		// process every element individually
		re_results.forEach((playlist_item) => {
			// reset the regex
			re_scan_playlist_item.lastIndex = 0;

			// store the regex results
			let re_results_item: RegExpExecArray | null;

			// store the data of the object
			let item_data: ItemPropsBase = {
				/* eslint-disable @typescript-eslint/naming-convention */
				type: "",
				Caption: "",
				Color: "",
				slide_count: 0,
				selectable: true
				/* eslint-enable @typescript-eslint/naming-convention */
			};

			// exec the item-regex until there are no more results
			do {
				re_results_item = re_scan_playlist_item.exec(playlist_item);

				// if there was a result, process it
				if (re_results_item !== null) {
					const results = re_results_item.groups;

					// only proceeds, when there are results
					if (results !== undefined) {
						// remove all undefined values
						Object.keys(results).forEach(
							(key) => results[key] === undefined && delete results[key]
						);

						// parse all remaining values
						item_data = {
							...item_data,
							...parse_item_value_string(...Object.entries(results)[0])
						};
					}
				}
			} while (re_results_item !== null);

			// store the playlist-item
			switch (item_data.type) {
				case "Song":
					this.playlist_items.push(new Song(item_data as SongProps));
					break;
				case "Countdown":
					this.playlist_items.push(new Countdown(item_data as CountdownProps));
					break;
				case "Image":
					this.playlist_items.push(new Image(item_data as ImageProps));
					break;
				case "PDF":
					this.playlist_items.push(new PDF(item_data as PDFProps));
					break;
				default:
					// if it wasn't caught by other cases, it is either a comment or not implemented yet -> if there is no file specified, treat it as comment
					if (!Object.keys(item_data).includes("FileName")) {
						// try to parse the caption as an JSON-object for AMCP-Commands
						try {
							const caption_json = JSON.parse(item_data.Caption) as unknown;

							if (typeof caption_json === "object") {
								const props: CommandCommentProps = {
									...item_data,
									type: "CommandComment",
									template: caption_json as { template: string; data: object }
								};

								props.type = "CommandComment";

								this.playlist_items.push(new CommandComment(props));
							} else {
								throw new SyntaxError();
							}
						} catch (e) {
							if (e instanceof SyntaxError) {
								item_data.type = "Comment";

								this.playlist_items.push(new Comment(item_data as CommentProps));
							}
						}
					}
					break;
			}
		});
	}

	create_client_object_playlist(): ClientPlaylistItems {
		const return_playlist: ClientPlaylistItems = {
			playlist_items: this.playlist_items.map((item) => item.props)
		};

		return return_playlist;
	}

	async create_client_object_item_slides(item: number): Promise<ClientItemSlides> {
		return this.playlist_items[item].create_client_object_item_slides();
	}

	set_active_item(item: number, slide: number = 0): ActiveItemSlide {
		item = this.validate_item_number(item);

		this.active_item_number = item;

		this.active_playlist_item.set_active_slide(slide);

		this.casparcg_load_item();

		return this.active_item_slide;
	}

	set_active_slide(slide: number): number {
		const response = this.active_playlist_item.set_active_slide(slide);

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

		let new_active_item_number = this.active_item;
		// steps until there is a selectable item
		do {
			new_active_item_number += steps;

			// if the new_active_item_number is back at the start, break, since there are no selectable items
			if (new_active_item_number === this.active_item) {
				console.error("loop around");
				return;
			}

			// sanitize the item-number
			new_active_item_number = this.sanitize_item_number(new_active_item_number);
		} while (!this.playlist_items[new_active_item_number].props.selectable);

		// new active item has negative index -> roll over to other end
		if (new_active_item_number < 0) {
			new_active_item_number = this.playlist_items.length - 1;
			// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_item_number > this.playlist_items.length - 1) {
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
		const item_steps = this.active_playlist_item.navigate_slide(steps);

		if (item_steps !== 0) {
			// if the item_steps is forwards, navigate to the first slide; if it is backwards navigate to the last one
			this.navigate_item(steps, steps > 0 ? 0 : -1);
		} else {
			this.casparcg_select_slide(this.active_playlist_item.active_slide);
		}

		return item_steps !== 0;
	}

	move_playlist_item(from: number, to: number) {
		from = this.validate_item_number(from);
		to = this.validate_item_number(to);

		if (this.active_item === from) {
			this.active_item_number = to;

			// if one of the move-positions lays before and the other after the active-item, adjust the active-item-number
		} else if (this.active_item < from !== this.active_item < to) {
			// if the moved item is the active one, set it accordingly
			if (this.active_item < from) {
				// if the item gets moved from before the active-item to after, increase the active-item-number
				this.active_item_number++;
			} else {
				// else decrease it
				this.active_item_number--;
			}
		}

		const new_item_order: number[] = Array.from(Array(this.playlist_items.length).keys());
		new_item_order.splice(from, 0, new_item_order.splice(to, 1)[0]);
		this.playlist_items.splice(to, 0, this.playlist_items.splice(from, 1)[0]);

		return new_item_order;
	}

	private validate_item_number(item: number): number {
		const item_count = this.playlist_items.length;

		if (item < -item_count || item >= this.playlist_items.length) {
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
		item = item % this.playlist_items.length;

		// if it is negative, roll over
		if (item < 0) {
			item += this.playlist_items.length;
		}

		return item;
	}

	private casparcg_load_item(casparcg_connection?: CasparCGConnection, media_only?: boolean): void {
		const connections = casparcg_connection ? [casparcg_connection] : this.casparcg_connections;

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		connections.forEach(async (connection) => {
			await this.casparcg_load_media(connection);

			if (!media_only) {
				void this.casparcg_load_template(connection);
			}
		});
	}

	private casparcg_load_media(
		casparcg_connection: CasparCGConnection
	): Promise<APIRequest<Commands.CgAdd>> {
		let media = this.active_playlist_item?.media?.replace(/^(?<drive>\w:)\//, "$<drive>//");

		// if a media-file is defined, load it
		if (media) {
			// test wether it is a color-string
			const test_rgb_string = media.match(
				/^#(?<alpha>[\dA-Fa-f]{2})?(?<rgb>(?:[\dA-Fa-f]{2}){3})$/
			);

			// if it is an rgb-string, put the alpha-value at the beginning (something something CasparCG)
			if (test_rgb_string) {
				media = `#${test_rgb_string.groups?.alpha ?? ""}${test_rgb_string.groups?.rgb}`;
			} else {
				// make it all uppercase and remove the extension to match casparcg-clips
				const req_name = media.replace(/\.[^(\\.]+$/, "").toUpperCase();

				// check all the casparcg-files, wether they contain a media-file that matches the path
				for (const m of casparcg_connection.media) {
					const media_file = m.clip.toUpperCase().replace(/\\/, "/");

					if (req_name.endsWith(media_file)) {
						media = m.clip;
						break;
					}
				}
			}

			// if the state is "visible", play it directly
			if (this.visibility) {
				return casparcg_connection.connection.play({
					/* eslint-disable @typescript-eslint/naming-convention */
					channel: casparcg_connection.settings.channel,
					layer: casparcg_connection.settings.layers[0],
					clip: media,
					transition: this.casparcg_transition
					/* eslint-enable @typescript-eslint/naming-convention */
				});
			} else {
				//  if the current stat is invisible, only load it in the background
				return casparcg_connection.connection.loadbg({
					/* eslint-disable @typescript-eslint/naming-convention */
					channel: casparcg_connection.settings.channel,
					layer: casparcg_connection.settings.layers[0],
					clip: media,
					transition: this.casparcg_transition
					/* eslint-enable @typescript-eslint/naming-convention */
				});
			}
		} else {
			// no media-file selected -> clear the media-output
			return casparcg_connection.connection.play({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers[0],
				clip: "EMPTY",
				transition: this.casparcg_transition
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		}
	}

	private casparcg_load_template(
		casparcg_connection: CasparCGConnection
	): Promise<APIRequest<Commands.CgAdd>> {
		// if a template was specified, load it
		if (this.active_playlist_item?.template !== undefined) {
			return casparcg_connection.connection.cgAdd({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers[1],
				cgLayer: 0,
				playOnLoad: this.casparcg_visibility,
				template: this.active_playlist_item.template.template,
				// escape quotation-marks by hand, since the old chrom-version of casparcg appears to have a bug
				data: JSON.stringify(
					JSON.stringify(this.active_playlist_item.template.data, (_key, val: unknown) => {
						if (typeof val === "string") {
							return val.replace('"', "\\u0022");
						} else {
							return val;
						}
					})
				)
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		} else {
			// if not, clear the previous template
			return casparcg_connection.connection.play({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers[1],
				clip: "EMPTY",
				transition: this.casparcg_transition
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		}
	}

	private casparcg_select_slide(slide: number): void {
		this.casparcg_connections.forEach((casparcg_connection) => {
			// if the item has multiple media-files, load the new one
			if (this.active_playlist_item.props.media?.length ?? 0 > 1) {
				void this.casparcg_load_media(casparcg_connection);
			}

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
		this.casparcg_visibility = visibility;

		for (const casparcg_connection of this.casparcg_connections) {
			if (visibility) {
				// load the media-item. Since it is invisible, it will only be prepared
				this.casparcg_load_item(casparcg_connection, true);

				await casparcg_connection.connection.cgPlay({
					/* eslint-disable @typescript-eslint/naming-convention */
					channel: casparcg_connection.settings.channel,
					layer: casparcg_connection.settings.layers[1],
					cgLayer: 0
					/* eslint-enable @typescript-eslint/naming-convention */
				});
			} else {
				await Promise.allSettled([
					// fade-out the media
					casparcg_connection.connection.play({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: casparcg_connection.settings.channel,
						layer: casparcg_connection.settings.layers[0],
						clip: "EMPTY",
						transition: this.casparcg_transition
						/* eslint-enable @typescript-eslint/naming-convention */
					}),

					// stop the template-layer
					casparcg_connection.connection.cgStop({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: casparcg_connection.settings.channel,
						layer: casparcg_connection.settings.layers[1],
						cgLayer: 0
						/* eslint-enable @typescript-eslint/naming-convention */
					})
				]);
			}
		}
	}

	async toggle_visibility(): Promise<boolean> {
		await this.set_visibility(!this.visibility);

		return this.visibility;
	}

	get active_item(): number {
		return this.active_item_number;
	}

	get active_playlist_item(): PlaylistItem | undefined {
		return this.playlist_items[this.active_item];
	}

	get active_slide(): number {
		return this.active_playlist_item.active_slide;
	}

	get active_item_slide(): ActiveItemSlide {
		return {
			item: this.active_item,
			slide: (this.active_playlist_item ?? { active_slide: 0 }).active_slide
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

// parse an individual playlist-item-value
function parse_item_value_string(
	key: string,
	value: string
): { [P in keyof ItemProps]?: ItemProps[P] } {
	// remove line-breaks
	value = value.replace(/'?\s\+\s+'?/gm, "");
	// un-escape escaped characters
	value = value.replace(/'?((?:#(?:\d+))+)'?/gm, (match, group: string) => {
		const chars = group.split("#").slice(1);

		let return_string = "";

		chars.forEach((char) => (return_string += String.fromCharCode(Number(char))));

		return return_string;
	});

	const return_props: { [P in keyof ItemProps]?: ItemProps[P] } = {};

	// do value-type specific stuff
	switch (key) {
		case "Data":
			// remove whitespace and linebreaks
			return_props.Data = value.replace(/\s+/gm, "");
			break;
		case "VerseOrder":
			// split csv-line into an array
			return_props.VerseOrder = value.split(",") as SongElement[];
			break;
		case "FileName":
			{
				// assume the type from the mime-type
				const mime_type = mime.lookup(value);
				switch (true) {
					case mime_type ? mime_type.split("/", 1)[0] === "image" : false:
						return_props.type = "Image";
						break;
					case mime_type === "application/pdf":
						return_props.type = "PDF";
						break;
					case !mime_type:
						if (path.extname(value) === ".sng") {
							return_props.type = "Song";
						}
						break;
				}
				return_props.FileName = value;
			}
			break;
		case "Color":
			if (value.substring(0, 2) === "cl") {
				return_props[key] = convert_color_to_hex(value);
			} else {
				const color_int = Number(value);

				const color =
					((color_int & 0x0000ff) << 16) | (color_int & 0x00ff00) | ((color_int & 0xff0000) >> 16);

				const color_string = color.toString(16);
				return_props[key] = "#" + color_string.padStart(6, "0");
			}
			break;
		case "PrimaryLanguage":
		case "Language":
			return_props[key] = Number(value) - 1; // subtract 1, because Songbeamer start counting at 1
			break;
		case "CaptionFmtValue":
			return_props.Time = value;
			break;
		case "StreamClass":
			if (value === "TPresentationObjectTimer") {
				return_props.type = "Countdown";
			} else {
				return_props.StreamClass = value;
			}
			break;
		case "Caption":
			return_props[key] = value;
			break;
	}

	return return_props;
}

export function convert_color_to_hex(color: string): string {
	const colours: Record<string, string> = {
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

	return colours[color.toLowerCase()] ?? "";
}

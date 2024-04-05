import type { APIRequest, Commands, TransitionParameters } from "casparcg-connection";

import type { ClientItemSlides, ItemProps, PlaylistItem } from "./PlaylistItems/PlaylistItem.ts";
import Song from "./PlaylistItems/Song.ts";

import * as JGCPSend from "./JGCPSendMessages.ts";

import Config from "./config.ts";
import type { CasparCGConnection } from "./control.ts";
import PlaylistObject from "./PlaylistFile.ts";
import Comment from "./PlaylistItems/Comment.ts";
import Countdown from "./PlaylistItems/Countdown.ts";
import Media from "./PlaylistItems/Media.ts";
import PDF from "./PlaylistItems/PDF.ts";
import TemplateItem from "./PlaylistItems/Template.ts";
import * as fs from "fs";
import Bible from "./PlaylistItems/Bible.ts";
import Psalm from "./PlaylistItems/Psalm.ts";
import { logger } from "./logger.ts";

export type ClientPlaylistItem = ItemProps & { displayable: boolean };

export interface ClientPlaylistItems {
	playlist_items: ClientPlaylistItem[];
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
	private caption: string = "";

	// store the individual items of the playlist
	playlist_items: PlaylistItem[] = [];

	private changes: boolean = false;

	private active_item_number: number = 0;

	private casparcg_visibility: boolean = Config.behaviour.show_on_load;

	readonly casparcg_connections: CasparCGConnection[] = [];

	readonly casparcg_transition: TransitionParameters = {
		/* eslint-disable @typescript-eslint/naming-convention */
		duration: Config.casparcg.transition_length,
		transitionType: TransitionType.Mix
		/* eslint-enable @typescript-eslint/naming-convention */
	};

	constructor(
		casparcg_connections?: CasparCGConnection[],
		playlist?: string,
		callback?: () => void
	) {
		casparcg_connections?.forEach((cc) => this.add_casparcg_connection(cc));

		if (playlist !== undefined) {
			this.load_playlist_file(playlist, callback);

			let first_item = 0;

			while (!this.playlist_items[first_item].displayable) {
				first_item++;

				if (first_item === this.playlist_items.length) {
					return;
				}
			}

			this.set_active_item(first_item, 0);
		}
	}

	add_casparcg_connection(casparcg_connection: CasparCGConnection) {
		logger.debug(
			`adding CasparCG-connection to playlist: '${casparcg_connection.settings.host}:${casparcg_connection.settings.port}'`
		);

		this.casparcg_connections.push(casparcg_connection);

		// add a listener to send send the current-slide on connection
		casparcg_connection.connection.addListener("connect", () => {
			// load the active-item
			this.casparcg_load_item(casparcg_connection);
		});

		// load the first slide
		this.casparcg_load_item(casparcg_connection);
	}

	destroy() {
		this.casparcg_connections.forEach((casparcg_connection) => {
			casparcg_connection.connection.removeListener("connect");
		});
	}

	add_item(
		item: ItemProps,
		set_active: boolean = false,
		callback?: () => void,
		index: number = this.playlist_items.length
	) {
		const item_class_map: {
			[key in ItemProps["type"]]: new (props: ItemProps, callback: () => void) => PlaylistItem;
		} = {
			song: Song,
			comment: Comment,
			countdown: Countdown,
			media: Media,
			pdf: PDF,
			template: TemplateItem,
			bible: Bible,
			psalm: Psalm
		};

		const new_item = new item_class_map[item.type](item, () => {
			callback();

			if (set_active) {
				this.set_active_item(index, 0);
			}
		});

		this.playlist_items.splice(index, 0, new_item);

		if (this.active_item >= index) {
			this.active_item_number++;
		}

		if (set_active) {
			this.set_active_item(index, 0);
		}

		this.changes = true;
	}

	update_item(position: number, props: ItemProps): ItemProps | false {
		position = this.validate_item_number(position);

		// check, wether the props are of the same type as the item at the position
		if (props.type === this.playlist_items[position].props.type) {
			const result = this.playlist_items[position].update(props);

			return result;
		} else {
			return false;
		}
	}

	delete_item(position: number): boolean {
		position = this.validate_item_number(position);

		this.playlist_items.splice(position, 1);
		this.changes = true;

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

	protected load_playlist_file(playlist_path: string, callback?: () => void): void {
		let playlist_string: string;

		try {
			playlist_string = fs.readFileSync(playlist_path, "utf-8");
		} catch (e) {
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				logger.error(`can't load playlist: playlist does not exist (${playlist_path})`);

				return;
			} else {
				throw e;
			}
		}

		const playlist: PlaylistObject = JSON.parse(playlist_string) as PlaylistObject;

		this.caption = playlist.caption;

		playlist.items.forEach((item) => {
			this.add_item(item, false, callback);
		});
	}

	save(): PlaylistObject {
		const save_object: PlaylistObject = {
			caption: this.caption,
			items: this.playlist_items.map((item) => item.props)
		};

		return save_object;
	}

	create_client_object_playlist(): ClientPlaylistItems {
		const return_playlist: ClientPlaylistItems = {
			playlist_items: this.playlist_items.map((item) => item.playlist_item)
		};

		return return_playlist;
	}

	async create_client_object_item_slides(item: number): Promise<ClientItemSlides> {
		if (this.playlist_items[item] !== undefined) {
			if (this.playlist_items[item].displayable) {
				const client_object = await this.playlist_items[item].create_client_object_item_slides();

				if (client_object.media !== undefined) {
					// check wether it is a color string
					const test_rgb_string = client_object.media.match(
						/^#(?<alpha>[\dA-Fa-f]{2})?(?<rgb>(?:[\dA-Fa-f]{2}){3})$/
					);

					if (!test_rgb_string) {
						let thumbnails: string[] = (
							await (
								await this.casparcg_connections[0].connection.thumbnailRetrieve({
									filename: '"' + client_object.media + '"'
								})
							).request
						)?.data as string[];

						if (thumbnails === undefined) {
							await this.casparcg_connections[0].connection.thumbnailGenerate({
								filename: '"' + client_object.media + '"'
							});

							thumbnails = (
								await (
									await this.casparcg_connections[0].connection.thumbnailRetrieve({
										filename: '"' + client_object.media + '"'
									})
								).request
							).data as string[];
						}

						client_object.media = thumbnails ? "data:image/png;base64," + thumbnails[0] : "";
					} else {
						client_object.media = `#${test_rgb_string.groups?.alpha ?? ""}${test_rgb_string.groups?.rgb}`;
					}
				}

				return client_object;
			}
		}
	}

	set_active_item(item: number, slide: number = 0): ActiveItemSlide | false {
		item = this.validate_item_number(item);

		if (this.playlist_items[item].displayable) {
			this.active_item_number = item;

			this.active_playlist_item.set_active_slide(slide);

			this.casparcg_load_item();

			return this.active_item_slide;
		} else {
			return false;
		}
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
		// steps until there is a displayable item
		do {
			new_active_item_number += steps;

			// if the new_active_item_number is back at the start, break, since there are no displayable items
			if (new_active_item_number === this.active_item) {
				console.error("loop around");
				return;
			}

			// sanitize the item-number
			new_active_item_number = this.sanitize_item_number(new_active_item_number);
		} while (!this.playlist_items[new_active_item_number].displayable);

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

		this.changes = true;

		return new_item_order;
	}

	private validate_item_number(item: unknown): number {
		const item_count = this.playlist_items.length;

		if (typeof item !== "number") {
			throw new TypeError(`'${JSON.stringify(item)} is not of type 'number'`);
		}

		if (item < -item_count || item >= this.playlist_items.length) {
			throw new RangeError(`item-number is out of range (${-item_count} - ${item_count - 1})`);
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
	): Promise<APIRequest<Commands.Play>> {
		if (casparcg_connection.media !== undefined) {
			let api_request: Promise<APIRequest<Commands.Play>>;

			// if the state is "visible", play it directly
			if (this.visibility) {
				const clip = this.active_playlist_item?.media ?? "#00000000";

				logger.log(`loading CasparCG-media: '${clip}'`);

				const message = {
					channel: casparcg_connection.settings.channel,
					layer: casparcg_connection.settings.layers.media,
					clip,
					loop: this.active_playlist_item?.loop,
					transition: this.casparcg_transition
				};

				api_request = casparcg_connection.connection.play(message);
			} else {
				logger.log(
					`loading CasparCG-media in the background: '${this.active_playlist_item.media}'`
				);

				//  if the current stat is invisible, only load it in the background
				api_request = casparcg_connection.connection.loadbg({
					channel: casparcg_connection.settings.channel,
					layer: casparcg_connection.settings.layers.media,
					clip: this.active_playlist_item?.media,
					loop: this.active_playlist_item?.loop,
					transition: this.casparcg_transition
				});
			}

			return api_request;
		}
	}

	private casparcg_load_template(
		casparcg_connection: CasparCGConnection
	): Promise<APIRequest<Commands.CgAdd>> {
		let api_request: Promise<APIRequest<Commands.CgAdd>>;

		// if a template was specified, load it
		if (this.active_playlist_item?.template !== undefined) {
			logger.log(`loading CasparCG-template: '${this.active_playlist_item.template.template}'`);

			api_request = casparcg_connection.connection.cgAdd({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers.template,
				cgLayer: 0,
				playOnLoad: this.casparcg_visibility,
				template: this.active_playlist_item.template.template,
				// escape quotation-marks by hand, since the old chrom-version of CasparCG appears to have a bug
				data: JSON.stringify(
					JSON.stringify(this.active_playlist_item.template.data, (_key, val: unknown) => {
						if (typeof val === "string") {
							return val.replaceAll('"', "\\u0022");
						} else {
							return val;
						}
					})
				)
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		} else {
			logger.log("clearing CasparCG-template");

			// if not, clear the previous template
			api_request = casparcg_connection.connection.play({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers.template,
				clip: "EMPTY",
				transition: this.casparcg_transition
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		}

		return api_request;
	}

	private casparcg_select_slide(slide: number): void {
		this.casparcg_connections.forEach((casparcg_connection) => {
			// if the item has multiple media-files, load the new one
			if (this.active_playlist_item.multi_media) {
				void this.casparcg_load_media(casparcg_connection);
			}

			console.debug(`jumping CasparCG-template: slide '${slide}'`);

			// jump to the slide-number in casparcg
			void casparcg_connection.connection.cgInvoke({
				/* eslint-disable @typescript-eslint/naming-convention */
				channel: casparcg_connection.settings.channel,
				layer: casparcg_connection.settings.layers.template,
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
					layer: casparcg_connection.settings.layers.template,
					cgLayer: 0
					/* eslint-enable @typescript-eslint/naming-convention */
				});
			} else {
				const promises = [
					// stop the template-layer
					casparcg_connection.connection.cgStop({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: casparcg_connection.settings.channel,
						layer: casparcg_connection.settings.layers.template,
						cgLayer: 0
						/* eslint-enable @typescript-eslint/naming-convention */
					})
				];

				if (casparcg_connection.media !== undefined) {
					promises.push(
						// fade-out the media
						casparcg_connection.connection.play({
							/* eslint-disable @typescript-eslint/naming-convention */
							channel: casparcg_connection.settings.channel,
							layer: casparcg_connection.settings.layers.media,
							clip: "EMPTY",
							transition: this.casparcg_transition
							/* eslint-enable @typescript-eslint/naming-convention */
						})
					);
				}

				await Promise.allSettled(promises);
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

	get unsaved_changes(): boolean {
		return this.changes;
	}
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

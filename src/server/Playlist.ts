import type { TransitionParameters } from "casparcg-connection";

import type {
	ClientItemSlides,
	ClientPlaylistItem,
	ItemProps,
	PlaylistItem
} from "./PlaylistItems/PlaylistItem.ts";
import Song from "./PlaylistItems/Song.ts";

import * as JGCPSend from "./JGCPSendMessages.ts";

import Config from "./config.ts";
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
import AMCP from "./PlaylistItems/AMCP.ts";
import { CasparCGConnection, add_casparcg_listener, casparcg, casparcg_clear } from "./CasparCG.ts";

export interface ClientPlaylistItems {
	playlist_items: ClientPlaylistItem[];
}

export interface ActiveItemSlide {
	item: number | null;
	slide: number | null;
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

	private active_item_number: number | null = null;

	readonly casparcg_transition: TransitionParameters = {
		/* eslint-disable @typescript-eslint/naming-convention */
		duration: Config.casparcg.transition_length,
		transitionType: TransitionType.Mix
		/* eslint-enable @typescript-eslint/naming-convention */
	};

	constructor(playlist?: string, callback?: () => void) {
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

		// add a listener to send send the current-slide on connection
		add_casparcg_listener("connect", (casparcg_connection) => {
			// load the active-item
			void this.active_playlist_item?.play(casparcg_connection);
		});

		casparcg.casparcg_connections.forEach((casparcg_connection) => {
			// load the first slide
			void this.active_playlist_item?.play(casparcg_connection);
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
			psalm: Psalm,
			amcp: AMCP
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

	update_item(position: number, props: ClientPlaylistItem): boolean {
		position = this.validate_item_number(position);

		// check, wether the props are of the same type as the item at the position
		if (props.type === this.playlist_items[position].props.type) {
			const update_props = structuredClone(props);
			delete update_props.displayable;

			const result = this.playlist_items[position].update(update_props, () => {
				if (this.active_item === position) {
					this.casparcg_update_template();
				}
			});

			return result;
		} else {
			return false;
		}
	}

	delete_item(position: number): boolean {
		position = this.validate_item_number(position);

		// save wether the state changed
		let new_state = false;
		const old_active_item = this.active_item;

		// if the deleted item was the last item or lower than the active-item, adjust the index of the active-item
		if (position < this.active_item || position === this.playlist_items.length - 1) {
			this.active_item_number--;

			if (this.active_item === -1) {
				this.active_item_number = null;
			}

			new_state = true;
		}

		// remove the item
		const old_item = this.playlist_items.splice(position, 1);
		void old_item[0].stop();

		// now we have unsaved playlist-changes
		this.changes = true;

		// if the deleted item was the active one, load the new-active-item into casparcg
		if (old_active_item === position) {
			void this.active_playlist_item?.play();
		}

		if (this.active_item === null) {
			void casparcg_clear();
		}

		return new_state;
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
								await casparcg.casparcg_connections[0].connection.thumbnailRetrieve({
									filename: '"' + client_object.media + '"'
								})
							).request
						)?.data as string[];

						if (thumbnails === undefined) {
							await casparcg.casparcg_connections[0].connection.thumbnailGenerate({
								filename: '"' + client_object.media + '"'
							});

							thumbnails = (
								await (
									await casparcg.casparcg_connections[0].connection.thumbnailRetrieve({
										filename: '"' + client_object.media + '"'
									})
								).request
							)?.data as string[];
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
			const old_playlist_item = this.active_playlist_item;

			this.active_item_number = item;

			this.active_playlist_item.set_active_slide(slide);

			void old_playlist_item?.stop();

			void this.active_playlist_item.play();

			return this.active_item_slide;
		} else {
			return false;
		}
	}

	set_active_slide(slide: number): number {
		const response = this.active_playlist_item.set_active_slide(slide);

		return response;
	}

	/**
	 * Navigate to the next or previous item
	 * @param direction navigate forward ('next') or backward ('prev')
	 */
	// navigate_item(direction: NavigateDirection, slide: number = 0): void {
	navigate_item(steps: number, slide: number = 0): boolean {
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
				logger.error("can't determine new_item, there is no selectable");
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
		const item_steps = this.active_playlist_item?.navigate_slide(steps);

		if (item_steps !== 0) {
			// if the item_steps is forwards, navigate to the first slide; if it is backwards navigate to the last one
			this.navigate_item(steps, steps > 0 ? 0 : -1);
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
			throw new RangeError(`item-number is out of range ('${-item_count}' - '${item_count - 1}')`);
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

	private casparcg_update_template(casparcg_connection?: CasparCGConnection) {
		const connections =
			casparcg_connection !== undefined ? [casparcg_connection] : casparcg.casparcg_connections;

		connections.forEach((casparcg_connection) => {
			this.active_playlist_item.update_template(casparcg_connection);
		});
	}

	async set_visibility(visibility: boolean): Promise<boolean> {
		await this.active_playlist_item.set_visibility(visibility);

		return casparcg.visibility;
	}

	async toggle_visibility(): Promise<boolean> {
		return await this.set_visibility(!this.visibility);
	}

	get length(): number {
		return this.playlist_items.length;
	}

	get active_item(): number | null {
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
			slide: this.active_playlist_item?.active_slide ?? null
		};
	}

	get visibility(): boolean {
		return casparcg.visibility;
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

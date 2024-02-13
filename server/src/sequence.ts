import path from "path";

import SongFile, { SongElement } from "./SongFile";

import Config from "./config";
import { CasparCG } from "casparcg-connection";

// individual data of the sequence-file
interface SequenceItemPartial {
	Caption?: string;
	Type?: string;
	Data?: string;
	FileName?: string;
	VerseOrder?: SongElement[];
	Song?: SongFile;
}

// individual data of the sequence-file with Caption mandatory
interface SequenceItem extends SequenceItemPartial {
	Caption: string;
	SlideCount: number;
}

// interface for a renderer-object
interface RenderObject {
	slides: string[][];
	slide: number;
	BackgroundImage?: string;
}

interface ClientSequenceItem {
	Caption: string;
	item: number;
}

interface ClientSequenceItems {
	sequence_items: ClientSequenceItem[];
	metadata: {
		item: number;
		slide: number;
		visibility: boolean;
	}
}

interface ClientItemSlides {
	metadata: {
		item: number;
		BackgroundImage: string;
	};
	slides: {
		type: string;
		slides: string[][];
	}[];
}

interface ActiveItem {
	item: number,
	slide: number
}

const _item_navigate_type = ["item", "slide"] as const;
type NavigateType = (typeof _item_navigate_type)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isItemNavigateType = (x: any): x is NavigateType => _item_navigate_type.includes(x);

const _item_navigate_direction = ["prev", "next"] as const;
type NavigateDirection = (typeof _item_navigate_direction)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isItemNavigateDirection = (x: any): x is NavigateDirection => _item_navigate_direction.includes(x);

class Sequence {
	// regex to split a sequence-file into individual items
	private re_scan_sequence_file = /item\r?\n(\r?\n|.)+?end/gm;
	// regex to extract information from an individual sequence-item
	private re_scan_sequence_item = /(\s+(Caption =\s+'(?<Caption>[\s\S]*?)'|CaptionFmtValue =\s+'(?<CaptionFmtValue>[\s\S]*?)'|Color =\s+(?<Color>[\s\S]*?)|FileName =\s+'(?<FileName>[\s\S]*?)'|VerseOrder =\s+'(?<VerseOrder>[\s\S]*?)'|Props =\s+\[(?<Props>)\]|StreamClass =\s+'(?<StreamClass>[\s\S]*?)'|Data =\s*\{\s*(?<Data>[\s\S]+)\s*\})$)/gm;

	// store the individual items of the sequence
	sequence_items: SequenceItem[] = [];

	private active: ActiveItem = { item: 0, slide: 0 };

	private casparcg_visibility: boolean = Config.behaviour.showOnLoad;

	readonly casparcg_connection = new CasparCG({
		...Config.casparcg,
		autoConnect: true
	});

	constructor(sequence: string) {
		this.parse_sequence(sequence);

		this.set_active_item(0, 0);

		// setup auto-loading of the current-item on reconnection
		this.casparcg_connection.addListener("disconnect", () => {
			// on disconnect register a connect-listener
			this.casparcg_connection.addListener("connect", () => {
				// load the active-item
				this.casparcg_load_item(this.active_item, this.active_slide);

				// remove the connect-listener again
				this.casparcg_connection.removeAllListeners("connect");
			});

		});
	}

	destroy() {
		this.casparcg_connection.removeAllListeners();
		this.casparcg_connection.disconnect();
	}

	parse_sequence(sequence: string): void {
		// split the sequence into the individual items
		const re_results = sequence.match(this.re_scan_sequence_file);

		if (!re_results) {
			// if there were no results, check wether the sequence is empty
			if (/items\s*=\s*<\s*>/.test(sequence)) {
				throw new SyntaxError("sequence is empty");	
			}

			throw new SyntaxError("unable to parse sequence");
		}

		// process every element individually
		for (const sequence_item of re_results) {
			// reset the regex
			this.re_scan_sequence_item.lastIndex = 0;

			// store the regex results
			let re_results_item: RegExpExecArray;

			// store the data of the object
			let item_data: SequenceItem = {
				Caption: "",
				Type: "", // define it empty, so it doesn't stay undefined
				SlideCount: 0
			};

			// exec the item-regex until there are no more results
			do {
				re_results_item = this.re_scan_sequence_item.exec(sequence_item);
				
				// if there was a result, process it
				if (re_results_item !== null) {
					const results = re_results_item.groups;

					// remove all undefined values
					Object.keys(results).forEach(key => results[key] === undefined && delete results[key]);

					// merge the result with the data object
					item_data = { ...item_data, ...o_parse_item_value_string(...Object.entries(results)[0]) };
				}

			} while (re_results_item !== null);

			// store the sequence-item

			// TESTING only if it is song-element, since the others aren't implemented
			if (item_data.Type === "Song") {
				item_data.Song = new SongFile(s_get_song_path(item_data.FileName));
				
				// count the slides
				for (const part of this.get_verse_order(item_data)) {
					// check wether the part is actually defined in the songfile
					if (item_data.Song.has_text(part)) {
						item_data.SlideCount += item_data.Song.get_part(part).length;
					}
				}
				
				this.sequence_items.push(item_data);
			}
		}
	}
	
	// package an item into a package for the casparcg-template renderer
	private create_renderer_object(item: number, slide: number): RenderObject {
		item = this.validate_item_number(item);
		slide = this.validate_slide_number(slide, item);

		const sequence_item = this.sequence_items[item];
		
		const return_object: RenderObject = {
			slides: [],
			slide: slide
		};
		
		// add the individual part to the output-object
		for (const s_part of this.get_verse_order(item)) {
			const a_part = sequence_item.Song.get_part(s_part);

			// if a part is not available, skip it
			if (a_part !== undefined){
				return_object.slides.push(...a_part);
			}
		}

		return_object.BackgroundImage = s_get_image_path(sequence_item.Song.metadata.BackgroundImage).replaceAll("\\", "\\\\");

		return return_object;
	}

	create_client_object_sequence(): ClientSequenceItems {
		const o_return_sequence: ClientSequenceItems = {
			sequence_items: [],
			metadata: {
				item: this.active_item,
				slide: this.active_slide,
				visibility: this.visibility
			}
		};

		for (const [i, song_item] of this.sequence_items.entries()) {
			const current_item: ClientSequenceItem = {
					Caption: song_item.Caption,
					item: i
			};

			o_return_sequence.sequence_items.push(current_item);
		}

		return o_return_sequence;
	}

	create_client_object_item_slides(item: number):  ClientItemSlides{
		item = this.validate_item_number(item);

		const current_item: SequenceItem = this.sequence_items[item];

		const o_return_item: ClientItemSlides = {
			metadata: {
				item,
				BackgroundImage: path.join("BackgroundImage", current_item.Song.metadata.BackgroundImage)
			},
			slides: []
		};

		for (const s_part of this.get_verse_order(item)) {
			const a_part = current_item.Song.get_part(s_part);

			// if a part is not available, skip it
			if (a_part !== undefined){
				o_return_item.slides.push({
					type: s_part,
					slides: current_item.Song.get_part(s_part)
				});
			}
		}

		return o_return_item;
	}

	get_verse_order(item: number | SequenceItem): string[] {
		let sequence_item: SequenceItem;

		if (typeof item === "number") {
			item = this.validate_item_number(item);

			sequence_item = this.sequence_items[item];
		} else {
			sequence_item = item;
		}

		if (sequence_item.VerseOrder !== undefined) {
			return sequence_item.VerseOrder;
		} else {
			return sequence_item.Song.metadata.VerseOrder;
		}
	}

	set_active_item(item: number, slide: number = 0): ActiveItem {
		item = this.validate_item_number(item);
		slide = this.validate_slide_number(slide, item);

		this.active = { item, slide };

		this.casparcg_load_item(this.active.item, this.active.slide);

		return this.active;
	}

	set_active_slide(slide): ActiveItem {
		slide = this.validate_slide_number(slide);

		this.active.slide = slide;

		this.casparcg_select_slide(this.active_slide);

		return this.active;
	}

	/**
	 * Navigate to the next or previous item
	 * @param direction navigate forward ('next') or backward ('prev')
	 */
	navigate_item(direction: NavigateDirection, slide: number = 0): void {
		if (!isItemNavigateDirection(direction)) {
			throw new RangeError(`direction is invalid ('${direction}')`);
		}

		let i_direction;

		switch (direction) {
			case "prev":
				i_direction = -1;
				break;
			case "next":
				i_direction = 1;
		}

		let new_active_item_number = this.active_item + i_direction;

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
	navigate_slide(direction: NavigateDirection): boolean {
		if (!isItemNavigateDirection(direction)) {
			throw new RangeError(`direction is invalid ('${direction}')`);
		}

		let nav_direction;

		switch (direction) {
			case "prev":
				nav_direction = -1;
				break;
			case "next":
				nav_direction = 1;
		}

		let new_active_slide_number: number = this.active_slide + nav_direction;
		let slideChange: boolean = true;

		// new active item has negative index -> roll over to the last slide of the previous element
		if (new_active_slide_number < 0) {
			this.navigate_item("prev", -1);
			
			new_active_slide_number = this.sequence_items[this.active_item].SlideCount - 1;
		// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_slide_number >= this.sequence_items[this.active_item].SlideCount) {
			this.navigate_item("next");
			
			new_active_slide_number = 0;
		} else {
			slideChange = false;
		}

		this.active.slide = new_active_slide_number;

		this.casparcg_select_slide(this.active_slide);

		return slideChange;
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

	private validate_slide_number(slide: number, item?: number,): number {
		if (item === undefined) {
			item = this.active_item;
		}
		
		const slide_count = this.sequence_items[item].SlideCount;

		if (slide < -slide_count || slide >= slide_count) {
			throw new RangeError(`slide-number is out of range (${-slide_count}-${slide_count - 1})`);
		}

		if (slide < 0) {
			slide += slide_count;
		}

		return slide;
	}

	private casparcg_load_item(item: number, slide: number): void {
		// load the item into casparcg
		this.casparcg_connection.cgAdd({
			channel: Config.casparcg.channel,
			layer: Config.casparcg.layer,
			cgLayer: 0,
			playOnLoad: this.casparcg_visibility,
			template: "Song",
			data: this.create_renderer_object(item, slide)
		});
	}

	private casparcg_select_slide(slide: number): void {
		// jump to the slide-number in casparcg
		this.casparcg_connection.cgInvoke({
			channel: Config.casparcg.channel,
			layer: Config.casparcg.layer,
			cgLayer: 0,
			method: `jump(${slide})`
		});
	}

	casparcg_set_visibility(visibility: boolean): void {
		const options = {
			channel: Config.casparcg.channel,
			layer: Config.casparcg.layer,
			cgLayer: 0
		};

		this.casparcg_visibility = visibility;

		if (visibility) {
			this.casparcg_connection.cgPlay(options);
		} else {
			this.casparcg_connection.cgStop(options);
		}
	}

	get active_item(): number {
		return this.active.item;
	}

	get active_slide(): number {
		return this.active.slide;
	}

	get visibility(): boolean {
		return this.casparcg_visibility;
	}
}

// parse an individual sequence-item-value
function o_parse_item_value_string(s_key: string, s_value: string): SequenceItemPartial {
	// remove line-breaks
	s_value = s_value.replaceAll(/'\s\+\s+'/gm, "");
	// un-escape escaped characters
	s_value = s_value.replaceAll(/'#(\d+)'/gm, (_match, group) => String.fromCharCode(group));
	
	const o_result: SequenceItemPartial = {
	};

	// do value-type specific stuff
	switch (s_key) {
		case "Data":
			// remove whitespace and linebreaks
			o_result[s_key] = s_value.replaceAll(/\s+/gm, "");
			break;
		case "VerseOrder":
			// split csv-line into an array
			o_result.VerseOrder = s_value.split(",") as SongElement[];
			break;
		case "FileName":
			// assume the type from the file-extension
			if (path.extname(s_value) === ".sng") {
				o_result["Type"] = "Song";
			}
			o_result[s_key] = s_value;
			break;
		default:
			o_result[s_key] = s_value;
			break;
	}

	return o_result;
}

function s_get_image_path(s_path: string): string {
	return path.join(Config.path.BackgroundImage, s_path);
}

function s_get_song_path(s_path: string): string {
	return path.join(Config.path.Song, s_path);
}

export { Sequence, NavigateType, NavigateDirection, isItemNavigateType, isItemNavigateDirection, ClientSequenceItems, ClientItemSlides };

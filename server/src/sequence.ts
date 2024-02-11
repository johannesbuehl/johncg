import path from "path";

import SongFile, { SongElement } from "./SongFile";

const config = require("../config.json");

// individual data of the sequence-file
interface SequenceItemPartial {
	Caption?: string;
	Type?: string;
	Data?: string;
	FileName?: string;
	VerseOrder?: SongElement[];
	Song?: SongFile;
};

// individual data of the sequence-file with Caption mandatory
interface SequenceItem extends SequenceItemPartial {
	Caption: string;
	SlideCount: number;
};

// interface for a renderer-object
interface RenderObject {
	slides: string[][];
	slide: number;
	BackgroundImage?: string;
}

interface ClientSequenceItem {
	Caption: string;
	item: number;
};

interface ClientSequenceObject {
	sequence_items: ClientSequenceItem[];
	item: number;
};

interface ClientItemObject {
	metadata: {
		item: number;
		BackgroundImage: string;
	};
	slides: {
		type: string;
		slides: string[][];
	}[];
};

const _item_navigate_type = ["item", "slide"] as const;
type NavigateType = (typeof _item_navigate_type)[number];
const isItemNavigateType = (x: any): x is NavigateType => _item_navigate_type.includes(x);

const _item_navigate_direction = ["prev", "next"] as const;
type NavigateDirection = (typeof _item_navigate_direction)[number];
const isItemNavigateDirection = (x: any): x is NavigateDirection => _item_navigate_direction.includes(x);

class Sequence {
	// regex to split a sequence-file into individual items
	private re_scan_sequence_file = /item\r?\n(\r?\n|.)+?end/gm;
	// regex to extract information from an individual sequence-item
	private re_scan_sequence_item = /(\s+(Caption =\s+'(?<Caption>[\s\S]*?)'|CaptionFmtValue =\s+'(?<CaptionFmtValue>[\s\S]*?)'|Color =\s+(?<Color>[\s\S]*?)|FileName =\s+'(?<FileName>[\s\S]*?)'|VerseOrder =\s+'(?<VerseOrder>[\s\S]*?)'|Props =\s+\[(?<Props>)\]|StreamClass =\s+'(?<StreamClass>[\s\S]*?)'|Data =\s*\{\s*(?<Data>[\s\S]+)\s*\})$)/gm;

	// store the individual items of the sequence
	sequence_items: SequenceItem[] = [];

	private active: [number, number] = [0, 0];

	constructor(sequence: string) {
		this.parse_sequence(sequence);
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
		for (let sequence_item of re_results) {
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
					let results = re_results_item.groups;

					// remove all undefined values
					Object.keys(results).forEach(key => results[key] === undefined && delete results[key]);

					// merge the result with the data object
					item_data = {...item_data, ...o_parse_item_value_string(...Object.entries(results)[0])};
				}

			} while (re_results_item !== null);

			// store the sequence-item

			// TESTING only if it is song-element, since the others aren't implemented
			if (item_data.Type === "Song") {
				item_data.Song = new SongFile(s_get_song_path(item_data.FileName));
				
				// count the slides
				for (let part of this.get_verse_order(item_data)) {
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
	create_renderer_object(i_item: number): RenderObject {
		this.validate_item_number(i_item);

		const item = this.sequence_items[i_item];
		
		const o_return_object: RenderObject = {
			slides: [],
			slide: this.active[1]
		};
		
		// add the individual part to the output-object
		for (let s_part of this.get_verse_order(i_item)) {
			const a_part = item.Song.get_part(s_part);

			// if a part is not available, skip it
			if (a_part !== undefined){
				o_return_object.slides.push(...a_part);
			}
		}

		o_return_object.BackgroundImage = s_get_image_path(item.Song.metadata.BackgroundImage).replaceAll('\\', "\\\\");

		return o_return_object;
	}

	create_client_object_sequence(): ClientSequenceObject {
		const o_return_sequence: ClientSequenceObject = {
			"sequence_items": [],
			item: this.active_item
		};

		for (const [i, song_item] of this.sequence_items.entries()) {
			const current_item: ClientSequenceItem = {
					Caption: song_item.Caption,
					item: i
			};

			o_return_sequence.sequence_items.push(current_item)
		}

		return o_return_sequence;
	}

	create_client_object_item(i_item: number):  ClientItemObject{
		this.validate_item_number(i_item);

		const current_item: SequenceItem = this.sequence_items[i_item];

		const o_return_item: ClientItemObject = {
			metadata: {
				item: i_item,
				BackgroundImage: path.join("BackgroundImage", current_item.Song.metadata.BackgroundImage)
			},
			slides: []
		};

		for (let s_part of this.get_verse_order(i_item)) {
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

	get_verse_order(i_item: number | SequenceItem): string[] {
		let o_item: SequenceItem;

		if (typeof(i_item) === "number") {
			this.validate_item_number(i_item);

			o_item = this.sequence_items[i_item];
		} else {
			o_item = i_item;
		}

		if (o_item.VerseOrder !== undefined) {
			return o_item.VerseOrder;
		} else {
			return o_item.Song.metadata.VerseOrder;
		}
	}

	set_active_item(i_number): [number, number] {
		this.validate_item_number(i_number);

		this.active = [i_number, 0];

		return this.active;
	}

	set_active_slide(i_number): [number, number] {
		this.validate_slide_number(i_number);

		this.active[1] = i_number;

		return this.active;
	}

	/**
	 * Navigate to the next or previous item
	 * @param direction navigate forward ('next') or backward ('prev')
	 */
	navigate_item(direction: NavigateDirection): void {
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

		let new_active_item_number = this.active[0] + i_direction;

		// new active item has negative index -> roll over to other end
		if (new_active_item_number < 0) {
			new_active_item_number = this.sequence_items[this.active[0]].SlideCount;
		// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_item_number > this.sequence_items[this.active[0]].SlideCount) {
			new_active_item_number = 0;
		}

		// navigate to the first slide of the item
		this.active = [new_active_item_number, 0];
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

		let new_active_slide_number: number = this.active[1] + nav_direction;
		let slideChange: boolean = true;

		// new active item has negative index -> roll over to the last slide of the previous element
		if (new_active_slide_number < 0) {
			this.navigate_item("prev");
			
			new_active_slide_number = this.sequence_items[this.active[1]].SlideCount;
		// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_slide_number > this.sequence_items[this.active[1]].SlideCount) {
			this.navigate_item("next");
			
			new_active_slide_number = 0;
		} else {
			slideChange = false;
		}

		this.active[1] = new_active_slide_number;

		return slideChange;
	}

	private validate_item_number(item: number): void {
		if (item < 0 || item >= this.sequence_items.length) {
			throw new RangeError(`item-number is out of range (0-${this.sequence_items.length})`);
		}
	}

	private validate_slide_number(item: number): void {
		if (item < 0 || item >= this.sequence_items[this.active[0]].SlideCount) {
			throw new RangeError(`slide-number is out of range (0-${this.sequence_items[this.active[0]].SlideCount})`);
		}
	}

	get active_item(): number {
		return this.active[0];
	}

	get active_slide(): number {
		return this.active[1];
	}
}

// parse an individual sequence-item-value
function o_parse_item_value_string(s_key: string, s_value: string): SequenceItemPartial {
	// remove line-breaks
	s_value = s_value.replaceAll(/'\s\+\s+'/gm, "");
	// un-escape escaped characters
	s_value = s_value.replaceAll(/'#(\d+)'/gm, (_match, group, _offset) => String.fromCharCode(group));
	
	let o_result: SequenceItemPartial = {
	}

	// do value-type specific stuff
	switch (s_key) {
		case "Data":
			// remove whitespace and linebreaks
			o_result[s_key] = s_value.replaceAll(/\s+/gm, "");
			break;
		case "VerseOrder":
			// split csv-line into an array
			o_result.VerseOrder = s_value.split(',') as SongElement[];
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
	return path.join(config.path.BackgroundImage, s_path);
}

function s_get_song_path(s_path: string): string {
	return path.join(config.path.Song, s_path);
}

export { Sequence, NavigateType, NavigateDirection, isItemNavigateType, isItemNavigateDirection };

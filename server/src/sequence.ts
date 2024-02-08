import SongFile, { SongElement } from "./SongFile";
import path from "path";

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
};

// interface for a renderer-object
interface RenderItem {
	"slides": string[][];
}

class Sequence {
	// regex to split a sequence-file into individual items
	private re_scan_sequence_file = /item\r?\n(\r?\n|.)+?end/gm;
	// regex to extract information from an individual sequence-item
	private re_scan_sequence_item = /(\s+(Caption =\s+'(?<Caption>[\s\S]*?)'|CaptionFmtValue =\s+'(?<CaptionFmtValue>[\s\S]*?)'|Color =\s+(?<Color>[\s\S]*?)|FileName =\s+'(?<FileName>[\s\S]*?)'|VerseOrder =\s+'(?<VerseOrder>[\s\S]*?)'|Props =\s+\[(?<Props>)\]|StreamClass =\s+'(?<StreamClass>[\s\S]*?)'|Data =\s*\{\s*(?<Data>[\s\S]+)\s*\})$)/gm;

	// TESTING: store a render-object to test functionality
	temp_render_item: RenderItem;

	// store the individual items of the sequence
	a_sequence_items: SequenceItem[] = [];

	constructor(s_sequence: string) {
		this.parse_sequence(s_sequence);
	}

	parse_sequence(s_sequence: string) {
		// split the sequence into the individual items
		const re_results = s_sequence.match(this.re_scan_sequence_file);

		// process every element individually
		for (let s_sequence_item of re_results) {
			// reset the regex
			this.re_scan_sequence_item.lastIndex = 0;

			// store the regex results
			let re_results_item: RegExpExecArray;

			// store the data of the object
			let o_item_data: SequenceItem = {
				Caption: "",
				Type: "" // define it empty, so it doesn't stay undefined
			};

			// exec the item-regex until there are no more results
			do {
				re_results_item = this.re_scan_sequence_item.exec(s_sequence_item);
				
				// if there was a result, process it
				if (re_results_item !== null) {
					let o_results = re_results_item.groups;

					// remove all undefined values
					Object.keys(o_results).forEach(key => o_results[key] === undefined && delete o_results[key]);

					// merge the result with the data object
					o_item_data = {...o_item_data, ...o_parse_item_value_string(...Object.entries(o_results)[0])};
				}

			} while (re_results_item !== null);

			// TESTING: if the element is a song-element, parse it into a songfile and store it
			if (o_item_data.Type === "Song") {
				o_item_data.Song = new SongFile(o_item_data.FileName);

				this.temp_render_item = this.o_create_renderer_object(o_item_data);

				console.debug(this.temp_render_item);
			}

			// store the schedule-item
			this.a_sequence_items.push(o_item_data);
		}
	}
	
	// package an item into a package for the casparcg-template renderer
	o_create_renderer_object(item: SequenceItem): RenderItem {
		const o_return_object: RenderItem = {
			"slides": []
		};
		
		let verse_order: SongElement[];
		// if there is no verse-order specified in the schedule, take the verse-order of the song-file
		if (item.VerseOrder !== undefined) {
			verse_order = item.VerseOrder;
		} else {
			verse_order = item.Song.metadata.VerseOrder;
		}

		// add the individual part to the output-object
		for (let s_part of item.Song.metadata.VerseOrder) {
			const a_part = item.Song.get_part(s_part);

			// if a part is not available, skip it
			if (a_part !== undefined){
				o_return_object.slides.push(...a_part);
			}
		}

		return o_return_object;
	}
}

// parse an individual schedule-item-value
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

export { Sequence };

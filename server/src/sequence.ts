import SongFile, { SongElement } from "./SongFile";
import path from "path";

interface SongItem {
	Caption?: string;
	Type?: string;
	Data?: string;
	FileName?: string;
	VerseOrder?: SongElement[];
	Song?: SongFile;
};

interface RenderItem {
	"slides": string[][];
}

class Sequence {
	private re_scan_sequence_file = /item\r?\n(\r?\n|.)+?end/gm;
	private re_scan_sequence_item = /(\s+(Caption =\s+'(?<Caption>[\s\S]*?)'|CaptionFmtValue =\s+'(?<CaptionFmtValue>[\s\S]*?)'|Color =\s+(?<Color>[\s\S]*?)|FileName =\s+'(?<FileName>[\s\S]*?)'|VerseOrder =\s+'(?<VerseOrder>[\s\S]*?)'|Props =\s+\[(?<Props>)\]|StreamClass =\s+'(?<StreamClass>[\s\S]*?)'|Data =\s*\{\s*(?<Data>[\s\S]+)\s*\})$)/gm;

	temp_render_item: RenderItem;
	a_sequence_items: SongItem[] = [];

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
			let o_item_data: SongItem = {
				"Type": ""
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

			if (o_item_data.Type === "Song") {
				o_item_data.Song = new SongFile(o_item_data.FileName);

				this.temp_render_item = this.o_create_renderer_object(o_item_data);

				console.debug(this.temp_render_item);
			}

			this.a_sequence_items.push(o_item_data);
		}
	}
	
	o_create_renderer_object(item: SongItem): RenderItem {
		let o_return_object = {
			"slides": []
		};
		
		let verse_order: SongElement[];

		if (item.VerseOrder !== undefined) {
			verse_order = item.VerseOrder;
		} else {
			verse_order = item.Song.metadata.VerseOrder;
		}

		for (let s_part of item.Song.metadata.VerseOrder) {
			const a_part = item.Song.get_part(s_part);

			if (a_part !== undefined){
				o_return_object.slides.push(...a_part);
			}
		}

		return o_return_object;
	}
}

function o_parse_item_value_string(s_key: string, s_value: string): SongItem {
	// remove line-breaks
	s_value = s_value.replaceAll(/'\s\+\s+'/gm, "");
	// un-escape escaped characters
	s_value = s_value.replaceAll(/'#(\d+)'/gm, (_match, group, _offset) => String.fromCharCode(group));
	
	let o_result: SongItem = {
	}

	switch (s_key) {
		case "Data":
			o_result[s_key] = s_value.replaceAll(/\s+/gm, "");
			break;
		case "VerseOrder":
			const a_s_VerseOrer = s_value.split(',');

			o_result.VerseOrder = s_value.split(',') as SongElement[];
			break;
		case "FileName":
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

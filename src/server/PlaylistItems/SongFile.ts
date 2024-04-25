import fs from "fs";
import iconv from "iconv-lite";

export const verse_types = [
	"refrain",
	"chorus",
	"vers",
	"verse",
	"strophe",
	"intro",
	"coda",
	"ending",
	"bridge",
	"instrumental",
	"interlude",
	"zwischenspiel",
	"pre-chorus",
	"pre-refrain",
	"misc",
	"solo",
	"outro",
	"pre-bridge",
	"pre-coda",
	"part",
	"teil",
	"title",
	"unbekannt",
	"unknown",
	"unbenannt"
] as const;

export type SongElement = (typeof verse_types)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const is_song_element = (x: any): x is SongElement => {
	if (typeof x !== "string") {
		return false;
	}

	const stem = x.split(" ", 1)[0];

	return verse_types.includes(stem.toLowerCase() as SongElement);
};

// metadata of the songfile
export interface SongFileMetadata {
	/* eslint-disable @typescript-eslint/naming-convention */
	Title: string[];
	ChurchSongID?: string;
	Songbook?: string;
	VerseOrder?: SongElement[];
	BackgroundImage?: string;
	Author?: string;
	Melody?: string;
	Translation?: string;
	Copyright?: string;
	LangCount: number;
	Chords?: Chords;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface TitlePart {
	type: "title";
	title: string[];
	church_song_id?: string;
}

export interface LyricPart {
	type: "lyric";
	part: string;
	slides: string[][][];
}

export type ItemPart = TitlePart | LyricPart;

interface BasePartClient {
	type: string;
	part: string;
	slides: number;
}

export interface TitlePartClient extends BasePartClient {
	type: "title";
}

export interface LyricPartClient extends BasePartClient {
	type: "lyric";
}

export type ItemPartClient = TitlePartClient | LyricPartClient;

export type SongPart = string[][][];
export type SongParts = Record<string, SongPart>;

export type Chords = Record<number, Record<number, string>>;

/**
 * processes and saves song-files (*.sng)
 * They should be compatible with those created by songbeamer (no guarantee given)
 */
export default class SongFile {
	private song_file_path?: string;

	// private variables
	private text_parts: SongParts = {};

	metadata: SongFileMetadata = {
		/* eslint-disable @typescript-eslint/naming-convention */
		Title: [],
		LangCount: 1 // set it by default to 1. if there are more languages, they will be read from the header
		/* eslint-enable @typescript-eslint/naming-convention */
	};

	constructor(path?: string) {
		this.song_file_path = path;

		if (path !== undefined) {
			this.parse_song_file();
		}
	}

	/**
	 * parses the metadata in a text header
	 * @param header a string representing the header
	 */
	private parse_metadata(header: string): void {
		// split the header into the individual lines
		const header_data: string[] = header.split(/\r?\n/);

		header_data.forEach((row) => {
			const components = row.split("=");
			const [key, value] = [components.shift()?.substring(1), components.join("=")];

			// handle different data differently
			switch (key) {
				// direct string data
				case "Title":
					this.metadata["Title"][0] = value;
					break;
				case "TitleLang2":
				case "TitleLang3":
				case "TitleLang4":
					this.metadata["Title"][Number(key.charAt(key.length - 1)) - 1] = value;
					break;
				case "Songbook":
				case "ChurchSongID":
				case "BackgroundImage":
				case "Author":
				case "Melody":
					this.metadata[key] = value;
					break;
				case "(c)":
					this.metadata.Copyright = value;
					break;
				case "VerseOrder":
					this.metadata[key] = value.split(",") as SongElement[];
					break;
				case "LangCount":
					this.metadata[key] = Number(value);
					break;
				case "Chords":
					this.metadata.Chords = this.parse_base64_chords(value);
					break;
				default:
					break;
			}
		});
	}

	private parse_base64_chords(base64: string): Chords {
		const return_object: Chords = {};

		const chords = Buffer.from(base64, "base64").toString();

		const chord_regex = /(?<position>\d+),(?<line>\d+),(?<chord>.*)\r/g;

		let match = chord_regex.exec(chords);
		while (match !== null) {
			const check_number = (val: string): number | false => {
				const number = Number(val);

				if (Number.isNaN(number) || !Number.isInteger(number) || number < -1) {
					return false;
				} else {
					return number;
				}
			};

			const line = check_number(match.groups?.line);
			const position = check_number(match.groups?.position);
			const chord = match.groups?.chord;

			if (line !== false && position !== false && typeof chord === "string") {
				return_object[line] ??= {};

				return_object[line][position] = chord;
			}

			match = chord_regex.exec(chords);
		}

		return return_object;
	}

	// parse the text-content
	private parse_song_file() {
		if (!this.song_file_path) {
			return;
		}

		// read the song-file in a byte-array
		const raw_data_buffer = fs.readFileSync(this.song_file_path);
		// utf-8-BOM
		const bom = Buffer.from([239, 187, 191]);

		let encoding: string;

		// check wether the song-file starts with the utf-8-BOM
		if (raw_data_buffer.subarray(0, 3).compare(bom) === 0) {
			encoding = "utf8";
			// no utf-8-BOM -> encoding is cp1252
		} else {
			encoding = "cp1252";
		}

		// decode the song-file-bytes with the fitting encoding
		const raw_data = iconv.decode(raw_data_buffer, encoding);

		// the different slides are seperated by a line of 2 or 3 dashes
		const data = raw_data.split(/\r?\n---?(?:\r?\n|$)/);

		// parse metadata of the header
		this.parse_metadata(data[0]);

		// remove the header the array
		data.splice(0, 1);

		// go through all the text blocks and save them to the text-dictionary
		let key = "";
		for (const data_block of data) {
			// split the block into the individual lines
			const lines = data_block.split(/\r?\n/);

			const first_line_items = lines[0].split(" ");

			// check if the first row describes the part
			if (
				is_song_element(first_line_items[0].toLowerCase()) &&
				first_line_items.length <= 2 &&
				first_line_items.length > 0
			) {
				key = lines[0];

				// remove the first row
				lines.splice(0, 1);

				// if it is the element with the key, there is no entry in the text-dictionary --> create it
				this.text_parts[key] = [];
			}

			// pad the text with empty lines so that every language has an equal amount of lines
			while (lines.length % this.metadata.LangCount !== 0) {
				lines.push("");
			}

			const slide: string[][] = Array.from(
				Array(Math.ceil(lines.length / this.metadata.LangCount)),
				(): string[] => []
			);

			// split the lines into the different languages
			lines.forEach((vv, ii) => {
				slide[Math.floor(ii / this.metadata.LangCount)].push(vv);
			});

			if (this.text_parts[key] !== undefined) {
				this.text_parts[key].push(slide);
			}
		}
	}

	get part_title(): TitlePart {
		const response: TitlePart = {
			type: "title",
			title: this.metadata.Title
		};

		if (this.metadata.ChurchSongID !== undefined) {
			response.church_song_id = this.metadata.ChurchSongID;
		}

		return response;
	}

	// returns the different parts of the song
	get_part(part: string): LyricPart {
		if (!is_song_element(part) || !this.avaliable_parts.includes(part)) {
			throw new ReferenceError(`'${part}' is no valid song-part`);
		}

		return {
			type: "lyric",
			part,
			slides: this.text_parts[part]
		};
	}

	get_title_client(language: number): TitlePartClient {
		if (language < 0 || language >= this.language_count) {
			throw new RangeError("language-index is out of range");
		}

		const response: TitlePartClient = {
			type: "title",
			part: this.metadata.Title[language],
			slides: 1 // static, since there is always only one title-slide
		};

		return response;
	}

	get_part_client(part: string): LyricPartClient {
		if (!is_song_element(part) || !this.avaliable_parts.includes(part)) {
			throw new ReferenceError(`'${part}' is no valid song-part`);
		}

		return {
			type: "lyric",
			part,
			slides: this.text_parts[part].length
		};
	}

	has_text(part: string): boolean {
		return this.avaliable_parts.includes(part);
	}

	/**
	 * all the parts of the song in the order they are defined
	 */
	get avaliable_parts(): string[] {
		return Object.keys(this.text_parts);
	}

	get all_parts(): SongParts {
		return this.text_parts;
	}

	get languages(): number[] {
		return Array.from(Array(this.metadata.LangCount).keys());
	}

	get language_count(): number {
		return this.metadata.LangCount;
	}

	get text(): Record<string, string[][][]> {
		return this.text_parts;
	}
}

import fs from "fs";
import iconv from "iconv-lite";

const verse_types = [
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

type SongElement = (typeof verse_types)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isSongElement = (x: any): x is SongElement => {
	if (typeof x !== "string") {
		return false;
	}
	
	const stem = x.split(" ", 1)[0];

	return verse_types.includes(stem.toLowerCase() as SongElement);
};

// metadata of the songfile
interface SongFileMetadata {
	Title: string;
	ChurchSongID?: string;
	Book?: string;
	VerseOrder?: SongElement[];
	BackgroundImage?: string;
}

interface TitlePart {
	type: "title";
	title: string;
	ChurchSongID?: string;
}

interface LyricPart {
	type: "lyric";
	part: SongElement;
	slides: string[][];
}

type ItemPart = TitlePart | LyricPart;

/**
 * processes and saves song-files (*.sng)
 * They should be compatible with those created by songbeamer (no guarantee given)
 */
class SongFile {
	s_song_file_path: string;

	// private variables
	private text: Record<string, string[][]> = {};

	metadata: SongFileMetadata = {
		Title: ""
	};

	constructor(path: string) {
		if (path === undefined) {
			throw new ReferenceError();
		} else {
			this.s_song_file_path = path;
		}

		this.parse_song_text();
	}

	/**
	 * parses the metadata in a text header
	 * @param s_header a string representing the header
	 */
	private parse_text_header(s_header: string): void {
		// split the header into the individual lines
		const a_s_header_data: string[] = s_header.split(/\r?\n/);

		a_s_header_data.forEach((row) => {
			const components = row.split("=");
			const [s_key, s_value] = [components.shift().substring(1), components.join("=")];

			// handle different data differently
			switch (s_key) {
				// direct string data
				case "Title":
				case "ChurchSongID":
				case "Book":
				case "BackgroundImage":
					this.metadata[s_key] = s_value;
					break;
				case "VerseOrder":
					this.metadata[s_key] = s_value.split(",") as SongElement[];
					break;
				default:
					break;
			}
		});
	}

	// parse the text-content
	private parse_song_text() {
		// read the song-file in a byte-array
		const a_by_raw_data = fs.readFileSync(this.s_song_file_path);
		// utf-8-BOM
		const a_by_bom = Buffer.from([239, 187, 191]);

		let encoding;

		// check wether the song-file starts with the utf-8-BOM
		if (a_by_raw_data.subarray(0, 3).compare(a_by_bom) === 0) {
			encoding = "utf8";
		// no utf-8-BOM -> encoding is cp1252
		} else {
			encoding = "cp1252";
		}

		// decode the song-file-bytes with the fitting encoding
		const raw_data = iconv.decode(a_by_raw_data, encoding);

		// the different slides are seperated by a line of 2 or 3 dashes
		const data = String(raw_data).split(/\r?\n---?\r?\n/);

		// parse metadata of the header
		this.parse_text_header(data[0]);

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
				isSongElement(first_line_items[0].toLowerCase()) && 
				first_line_items.length <= 2 &&
				first_line_items.length > 0
			) {
				key = lines[0];

				// remove the first row
				lines.splice(0, 1);

				// if it is the element with the key, there is no entry in the text-dictionary --> create it
				this.text[key] = [];
			}

			// append the lines to the song-element
			this.text[key].push(lines);
		}
	}

	get_title(): TitlePart {
		const response: TitlePart = {
			type: "title",
			title: this.metadata.Title
		};

		if (this.metadata.ChurchSongID !== undefined) {
			response.ChurchSongID = this.metadata.ChurchSongID;
		}

		return response;
	}

	// returns the different parts of the song
	get_part(part: string): LyricPart {
		if (!isSongElement(part) || !this.avaliable_parts.includes(part)) {
			throw new ReferenceError(`'${part}' is no valid song-part`);
		}

		return {
			type: "lyric",
			part,
			slides: this.text[part]
		};
	}

	has_text(part: string): boolean {
		return this.avaliable_parts.includes(part);
	}

	/**
	 * all the parts of the song in the order they are defined
	 */
	get avaliable_parts() {
		return Object.keys(this.text);
	}
}

export default SongFile;
export { SongFileMetadata, SongElement, ItemPart, LyricPart, TitlePart };

import fs from "fs";

type SongElement =
	| "refrain"
	| "chorus"
	| "vers"
	| "verse"
	| "strophe"
	| "intro"
	| "coda"
	| "ending"
	| "bridge"
	| "interlude"
	| "zwischenspiel"
	| "pre-chorus"
	| "pre-refrain"
	| "misc"
	| "outro"
	| "pre-bridge"
	| "pre-coda"
	| "part"
	| "teil"
	| "unbekannt"
	| "unknown"
	| "unbenannt";

interface SongFileMetadata {
	Title: string;
	ChurchSongID?: string;
	Book?: string;
	VerseOrder?: SongElement[];
	BackgroundImage?: string;
}

/**
 * processes and saves song-files (*.sng)
 * They should be compatible with those created by songbeamer (no guarantee given)
 */
class SongFile {
	s_song_file_path: string;

	// private variables
	private text: Record<string, string[][]> = {};

	metadata: SongFileMetadata = {
		Title: "",
		BackgroundImage: ""
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
	 * @param header a string representing the header
	 */
	private parse_text_header(header: string): void {
		const header_data: string[] = header.split(/\r?\n/);

		header_data.forEach((row) => {
			let key = row.split("=")[0];
			const value = row.split("=")[1];

			key = key.substring(1);

			switch (key) {
				// direct string data
				case "Title":
				case "ChurchSongID":
				case "Book":
				case "BackgroundImage":
					this.metadata[key] = value;
					break;
				case "VerseOrder":
					this.metadata[key] = value.split(",") as SongElement[];
					break;
				default:
					break;
			}
		});
	}

	// parse the text-content
	private parse_song_text() {
		const raw_data = fs.readFileSync(this.s_song_file_path, "utf8");

		// stores the different types of song-verses
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
			"unbekannt",
			"unknown",
			"unbenannt"
		];

		// the different slides are seperated by a line of 2 or 3 dashes
		const data = String(raw_data).split(/\r?\n---?\r?\n/);

		// parse metadata of the header
		this.parse_text_header(data[0]);

		// remove the header the array
		data.splice(0, 1);

		// go through all the text blocks and save them to the text-dictionary
		// for-loop is allowed because the order is important
		let key = "";
		let index = 0;
		// eslint-disable-next-line no-restricted-syntax
		for (let data_block of data) {
			const lines = data_block.split(/\r?\n/);

			const first_line_items = lines[0].split(" ");

			// check if the first row describes the part
			if (
				verse_types.includes(first_line_items[0].toLowerCase()) &&
				first_line_items.length <= 2 &&
				first_line_items.length > 0
			) {
				key = lines[0];

				// remove the first row
				lines.splice(0, 1);

				// if it is the element with the key, there is no entry in the text-dictionary --> create it
				this.text[key] = [];

				// reset the index to 0
				index = 0;
			} else {
				// increase the index counter
				index += 1;
			}

			this.text[key][index] = lines;
		}
	}

	// returns the different parts of the song
	get_part(part: string): string[][] {
		return this.text[part];
	}

	/**
	 * all the parts of the song in the order they are defined
	 */
	get avaliable_parts() {
		return Object.keys(this.text);
	}
}

export default SongFile;
export { SongFileMetadata, SongElement };

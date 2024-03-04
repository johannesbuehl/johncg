import fs from "fs";
import path from "path";
import SongFile from "../src/server/SequenceItems/SongFile";

const search_dir = "D:/Coding_z1glr/liedtexte_git/";

function find_sng_files(pth: string): SongFile[] {
	const files = fs.readdirSync(pth);

	const song_files: SongFile[] = [];

	files.forEach((f) => {
		const ff = path.join(pth, f);

		const stat = fs.statSync(ff);
		if (stat.isDirectory()) {
			song_files.push(...find_sng_files(ff));
		} else if (path.extname(ff) === ".sng") {
			song_files.push(new SongFile(ff));
		}
	});

	return song_files;
}

const song_files = find_sng_files(search_dir);

const song_ids: Record<string, string> = {};
const song_text: Record<string, string> = {};

song_files.forEach((song) => {
	song_ids[song.song_file_path] = song.metadata.ChurchSongID;
	const this_song_text: string[] = [];
	Object.values(song.text).forEach((part) => {
		part.forEach((slide) => {
			slide.forEach((line) => {
				line.forEach((l) => this_song_text.push(l));
			});
		});
	});

	song_text[song.song_file_path] = this_song_text.join("\n").toLowerCase();
});

console.debug(Object.entries(song_ids).filter(([key, id]) => {
	if (id?.includes("FJ6 72")) {
		return key;
	}
}));

function

console.debug(Object.entries(song_text).filter(([, text]) => text.includes("sehnsucht".toLowerCase())).map(([file]) => file));
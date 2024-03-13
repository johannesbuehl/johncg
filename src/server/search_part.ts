import path from "path";
import fs from "fs";

import * as JGCPRecv from "./JGCPReceiveMessages";

import Config from "./config";
import SongFile from "./PlaylistItems/SongFile";

export interface SongResult {
	path: string;
	title?: string[];
	id?: string;
	text?: string;
}

interface SongIndexData {
	song: SongFile;
	search_values: {
		title?: string[];
		id?: string;
		text?: string;
	};
	result_values: SongResult;
}

export default class SearchPart {
	private song_index: SongIndexData[] = [];

	renew_search_index(type: JGCPRecv.RenewSearchIndex["type"]): boolean {
		switch (type) {
			case "song":
				this.create_song_search_index();
				break;
			default:
				return false;
		}

		return true;
	}

	private find_sng_files(pth: string): [SongFile, string][] {
		const files = fs.readdirSync(pth);

		const song_files: [SongFile, string][] = [];

		files.forEach((f) => {
			const ff = path.join(pth, f);

			const stat = fs.statSync(ff);
			if (stat.isDirectory()) {
				song_files.push(...this.find_sng_files(ff));
			} else if (path.extname(ff) === ".sng") {
				song_files.push([new SongFile(ff), path.relative(Config.path.song, path.join(pth, f))]);
			}
		});

		return song_files;
	}

	private create_song_search_index() {
		// delete the old index
		this.song_index = [];

		const song_files = this.find_sng_files(Config.path.song);

		song_files.forEach(([song, file_path]) => {
			const song_value: SongIndexData = {
				song,
				search_values: {
					title: song.metadata.Title.map((tt) => tt?.toLowerCase()),
					id: song.metadata.ChurchSongID?.toLowerCase()
				},
				result_values: {
					path: file_path,
					title: song.metadata.Title,
					id: song.metadata.ChurchSongID
				}
			};

			const this_song_text: string[] = [];
			Object.values(song.text).forEach((part) => {
				part.forEach((slide) => {
					this_song_text.push(slide.map((line) => line.join("\n")).join("\n"));
				});
			});

			song_value.result_values.text = this_song_text.join("\n\n");
			song_value.search_values.text = this_song_text.join(" ").replace("\n", " ").toLowerCase();

			this.song_index.push(song_value);
		});
	}

	search_song(search: JGCPRecv.SearchItem["search"]): SongResult[] {
		const results: SongResult[] = [];

		this.song_index.forEach((song_index) => {
			const { search_values } = song_index;

			if (
				search_values.title?.findIndex((tt) => tt.includes(search.title)) >= 0 &&
				(search_values.id ?? "").includes(search.id) &&
				(search_values.text ?? "").includes(search.text)
			) {
				results.push(song_index.result_values);
			}
		});

		return results;
	}
}

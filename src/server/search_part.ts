import path from "path";
import fs from "fs";

import * as JGCPRecv from "./JGCPReceiveMessages";
import * as JGCPSend from "./JGCPSendMessages";

import Config, { get_song_path } from "./config";
import SongFile, { SongParts } from "./PlaylistItems/SongFile";

export interface SongData {
	file: string;
	title: string[];
	id: string;
	text: SongParts;
	parts: {
		available: string[];
		default: string[];
	};
}

interface SongIndexData {
	song: SongFile;
	search_values: {
		title: string[];
		id: string;
		text: string;
	};
	result_values: SongData;
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

	private find_sng_files(pth: string): string[] {
		const files = fs.readdirSync(pth);

		const song_files: string[] = [];

		files.forEach((f) => {
			const ff = path.join(pth, f);

			const stat = fs.statSync(ff);
			if (stat.isDirectory()) {
				song_files.push(...this.find_sng_files(ff));
			} else if (path.extname(ff) === ".sng") {
				song_files.push(path.relative(Config.path.song, path.join(pth, f)));
			}
		});

		return song_files;
	}

	private create_song_data(path: string): SongIndexData {
		const song = new SongFile(get_song_path(path));

		const song_value: SongIndexData = {
			song,
			search_values: {
				title: song.metadata.Title.map((tt) => tt?.toLowerCase()),
				id: song.metadata.ChurchSongID?.toLowerCase(),
				text: Object.values(song.text)
					.map((part) =>
						part
							.map((slide) => {
								return slide.map((line) => line.join("\n")).join("\n");
							})
							.join(" ")
					)
					.join("\n")
			},
			result_values: {
				file: path,
				title: song.metadata.Title,
				text: song.all_parts,
				id: song.metadata.ChurchSongID,
				parts: {
					available: song.avaliable_parts,
					default: song.metadata.VerseOrder
				}
			}
		};

		const this_song_text: string[] = [];
		Object.values(song.text).forEach((part) => {
			part.forEach((slide) => {
				this_song_text.push(slide.map((line) => line.join("\n")).join("\n"));
			});
		});

		song_value.result_values.text = song.all_parts;
		song_value.search_values.text = this_song_text.join(" ").replace("\n", " ").toLowerCase();

		return song_value;
	}

	private create_song_search_index() {
		const song_files = this.find_sng_files(Config.path.song);

		this.song_index = song_files.map((file_path) => this.create_song_data(file_path));
	}

	search_song(search: JGCPRecv.SearchItem["search"]): SongData[] {
		const results: SongData[] = [];

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

	find_jcg_files(pth: string = Config.path.playlist): JGCPSend.File[] {
		const files = fs.readdirSync(pth);

		const jcg_files: JGCPSend.File[] = [];

		const check_jcg_file = /(?<name>.+)\.jcg$/;

		files.forEach((f) => {
			const file_regex = check_jcg_file.exec(f);

			if (file_regex) {
				const ff = path.join(pth, f);

				const stat = fs.statSync(ff);

				jcg_files.push({
					name: file_regex?.groups["name"],
					path: ff,
					children: stat.isDirectory() ? this.find_jcg_files(ff) : undefined
				});
			}
		});

		return jcg_files;
	}

	find_pdf_files(pth: string = Config.path.pdf): JGCPSend.File[] {
		const files = fs.readdirSync(pth);

		const pdf_files: JGCPSend.File[] = [];

		const check_pdf_file = /(?<name>.+)\.pdf$/;

		files.forEach((f) => {
			const file_regex = check_pdf_file.exec(f);

			if (file_regex) {
				const ff = path.join(pth, f);

				const stat = fs.statSync(ff);

				pdf_files.push({
					name: file_regex?.groups["name"],
					path: ff,
					children: stat.isDirectory() ? this.find_pdf_files(ff) : undefined
				});
			}
		});

		return pdf_files;
	}

	find_psalm_files(pth: string = Config.path.psalm): JGCPSend.File[] {
		const files = fs.readdirSync(pth);

		const psalm_files: JGCPSend.File[] = [];

		const check_psalm_file = /(?<name>.+)\.psm$/;

		files.forEach((f) => {
			const file_regex = check_psalm_file.exec(f);

			if (file_regex) {
				const ff = path.join(pth, f);

				const stat = fs.statSync(ff);

				psalm_files.push({
					name: file_regex?.groups["name"],
					path: ff,
					children: stat.isDirectory() ? this.find_psalm_files(ff) : undefined
				});
			}
		});

		return psalm_files;
	}

	get_item_data(type: JGCPRecv.GetItemData["type"], path: string): SongData | undefined {
		switch (type) {
			case "song": {
				try {
					return this.create_song_data(path).result_values;
				} catch (e) {
					// if the error is because the file doesn't exist, skip the rest of the loop iteration
					if (e instanceof Error && "code" in e && e.code === "ENOENT") {
						console.error(`song '${path}' does not exist`);

						return;
					} else {
						throw e;
					}
				}
			}
		}
	}
}

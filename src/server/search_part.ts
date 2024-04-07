import path from "path";
import fs from "fs";

import * as JGCPRecv from "./JGCPReceiveMessages";

import Config, { get_psalm_path, get_song_path } from "./config";
import SngFile, { SongParts } from "./PlaylistItems/SongFile";
import { PsalmFile as PsmFile } from "./PlaylistItems/Psalm";
import { CasparCGConnection } from "./control";
import { logger } from "./logger";

export interface File {
	name: string;
	path: string;
	children?: File[];
}

export interface SongFile extends File {
	data?: {
		id?: string;
		title?: string[];
		text?: SongParts;
		parts: {
			available: string[];
			default: string[];
		};
	};
}

export interface PsalmFile extends File {
	data?: {
		id?: string;
		title?: string;
	};
}

// export interface BibleFile extends File {
// 	bible: Bible;
// }

export type MediaFile = File;
export type TemplateFile = File;
export type PDFFile = File;
// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
export type ItemFile = SongFile | PsalmFile | MediaFile | TemplateFile | PDFFile;

export default class SearchPart {
	private casparcg_connections: CasparCGConnection[];

	constructor(casparcg_connections: CasparCGConnection[]) {
		this.casparcg_connections = casparcg_connections;
	}

	create_song_file(f: File): SongFile {
		const song = new SngFile(get_song_path(f.path));

		const song_value: SongFile = {
			...f,
			data: {
				title: song.metadata.Title,
				id: song.metadata.ChurchSongID?.toLowerCase(),
				text: song.all_parts,
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

		return song_value;
	}

	create_psalm_file(f: File): PsalmFile {
		const psalm = JSON.parse(fs.readFileSync(get_psalm_path(f.path), "utf-8")) as PsmFile;

		return {
			...f,
			data: {
				title: psalm.metadata.caption.toLowerCase(),
				id: psalm.metadata.id?.toLowerCase()
			}
		};
	}

	private find_files<T extends File>(
		pth: string,
		root: string,
		extensions: string[],
		file_converter?: (f: File) => T
	): (File | T)[] {
		const files = fs.readdirSync(pth);

		const result_files: (File | T)[] = [];

		const check_file = new RegExp(
			`^(?<name>.+)(?<extension>${extensions.join("|").replaceAll(".", "\\.")})$`
		);

		files.forEach((f) => {
			const file_regex = check_file.exec(f);
			const ff = path.join(pth, f);
			const directory = fs.statSync(ff).isDirectory();

			if (directory || file_regex) {
				const file_result: File = {
					name: directory ? f : file_regex?.groups["name"],
					path: path.relative(root, ff),
					children: directory ? this.find_files(ff, root, extensions, file_converter) : undefined
				};

				result_files.push(
					!directory && file_converter !== undefined ? file_converter(file_result) : file_result
				);
			}
		});

		return result_files;
	}

	find_sng_files(pth: string = Config.path.song): SongFile[] {
		logger.log("searching song-files");

		return this.find_files(pth, pth, [".sng"], (f) => this.create_song_file(f));
	}

	find_jcg_files(pth: string = Config.path.playlist): File[] {
		logger.log("searching jcg-files");

		return this.find_files(pth, pth, [".jcg"]);
	}

	find_pdf_files(pth: string = Config.path.pdf): PsalmFile[] {
		logger.log("searching PDF-files");

		return this.find_files(pth, pth, [".pdf"]);
	}

	find_psalm_files(pth: string = Config.path.psalm): PsalmFile[] {
		logger.log("searching psalm-files");

		return this.find_files(pth, pth, [".psm"], (f) => this.create_psalm_file(f));
	}

	async get_casparcg_media(): Promise<File[]> {
		if (this.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-media-list: no conneciton added");
			return;
		}

		logger.debug("requesting CasparCG-media-list");

		this.casparcg_connections[0].media =
			(await (await this.casparcg_connections[0].connection.cls()).request)?.data ?? [];

		return build_files(this.casparcg_connections[0].media.map((m) => m.clip.split("/")));
	}

	async get_casparcg_template(): Promise<File[]> {
		if (this.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-template-list: no conneciton added");
			return;
		}

		logger.debug("requesting CasparCG-template-list");

		this.casparcg_connections[0].template =
			(await (await this.casparcg_connections[0].connection.tls()).request)?.data ?? [];

		return build_files(this.casparcg_connections[0].template.map((m) => m.split("/")));
	}

	get_item_file(type: JGCPRecv.GetItemData["type"], path: string): SongFile | undefined {
		logger.log(`reading single ${type}-file (${path})`);

		const item_file: ItemFile = {
			name: path,
			path
		};

		switch (type) {
			case "song": {
				try {
					return this.create_song_file(item_file);
				} catch (e) {
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

function build_files(media_array: string[][], root?: string): File[] {
	const media_object: File[] = [];

	const temp_object: Record<string, string[][]> = {};

	media_array.forEach((m) => {
		if (typeof m === "string") {
			temp_object[m] = m;
		} else {
			const key = m.shift();

			if (key !== undefined) {
				if (temp_object[key] === undefined) {
					temp_object[key] = [];
				}

				if (m.length !== 0) {
					temp_object[key].push(m);
				}
			}
		}
	});

	Object.entries(temp_object).forEach(([key, files]) => {
		const file_path = (root ? root + "/" : "") + key;

		media_object.push({
			name: key,
			path: file_path,
			children: files.length !== 0 ? build_files(files, file_path) : undefined
		});
	});

	return media_object;
}

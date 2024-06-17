import path from "path";
import fs from "fs";

import Config from "./config/config";
import SngFile, { SongData } from "./PlaylistItems/SongFile/SongFile";
import { PsalmFile as PsalmData } from "./PlaylistItems/Psalm";
import { logger } from "./logger";
import { casparcg } from "./CasparCGConnection";

export interface FileBase<K extends keyof ItemFileType> {
	name: string;
	path: string;
	children?: ItemFileMapped<K>[];
	hidden?: boolean;
}

export interface SongFile extends FileBase<"song"> {
	data?: SongData;
}

export interface PsalmFile extends FileBase<"psalm"> {
	data?: PsalmData;
}

export type Directory<K extends keyof ItemFileType> = FileBase<K>;
export type MediaFile = FileBase<"media">;
export type TemplateFile = FileBase<"template">;
export type PDFFile = FileBase<"pdf">;
export type PlaylistFile = FileBase<"playlist">;
export type ItemFileMapped<K extends keyof ItemFileType> = ItemFileType[K] | Directory<K>;
export type ItemFile = ItemFileMapped<keyof ItemFileType>;

export interface ItemFileType {
	/* eslint-disable @typescript-eslint/naming-convention */
	song: SongFile;
	psalm: PsalmFile;
	media: MediaFile;
	template: TemplateFile;
	pdf: PDFFile;
	playlist: PlaylistFile;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export default class SearchPart {
	constructor() {}

	create_song_file(f: SongFile): SongFile {
		const song = new SngFile(Config.get_path("song", f.path));

		const song_value: SongFile = {
			...f,
			data: {
				text: song.all_parts,
				metadata: song.metadata
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

	create_psalm_file(f: PsalmFile): PsalmFile {
		const psalm = JSON.parse(
			fs.readFileSync(Config.get_path("psalm", f.path), "utf-8")
		) as PsalmData;

		return {
			...f,
			data: psalm
		};
	}

	private find_files<K extends keyof ItemFileType>(
		pth: string,
		root: string,
		extensions: string[],
		file_converter: (f: FileBase<K>) => ItemFileMapped<K>
	): ItemFileMapped<K>[] {
		const files = fs.readdirSync(pth);

		const result_files: ItemFileMapped<K>[] = [];

		const check_file = new RegExp(
			`^(?<name>.+)(?<extension>${extensions.join("|").replaceAll(".", "\\.")})$`
		);

		files.forEach((f) => {
			const file_regex = check_file.exec(f);
			const ff = path.join(pth, f);
			const directory = fs.statSync(ff).isDirectory();

			if (directory || file_regex) {
				const file_result: Directory<K> = {
					name: directory ? f : file_regex?.groups["name"],
					path: path.relative(root, ff),
					children: directory ? this.find_files<K>(ff, root, extensions, file_converter) : undefined
				};

				result_files.push(!directory ? file_converter(file_result) : file_result);
			}
		});

		return result_files;
	}

	find_sng_files(pth: string = Config.path.song): SongFile[] {
		logger.log("searching song-files");

		return this.find_files<"song">(pth, pth, [".sng"], (f): SongFile => this.create_song_file(f));
	}

	find_jcg_files(pth: string = Config.path.playlist): PlaylistFile[] {
		logger.log("searching jcg-files");

		return this.find_files<"playlist">(pth, pth, [".jcg"], (f) => f);
	}

	find_pdf_files(pth: string = Config.path.pdf): PDFFile[] {
		logger.log("searching PDF-files");

		return this.find_files<"pdf">(pth, pth, [".pdf"], (f) => f);
	}

	find_psalm_files(pth: string = Config.path.psalm): PsalmFile[] {
		logger.log("searching psalm-files");

		return this.find_files<"psalm">(pth, pth, [".psm"], (f) => this.create_psalm_file(f));
	}

	async get_casparcg_media(): Promise<ItemFileMapped<"media">[]> {
		if (casparcg.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-media-list: no connection added");
			return;
		}

		logger.debug("requesting CasparCG-media-list");

		const media =
			(await (await casparcg.casparcg_connections[0].connection.cls()).request)?.data ?? [];

		return build_files<"media">(
			"media",
			media.map((m) => m.clip.split("/"))
		);
	}

	async get_casparcg_template(): Promise<TemplateFile[]> {
		if (casparcg.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-template-list: no connection added");
			return;
		}

		logger.debug("requesting CasparCG-template-list");

		const template =
			(await (await casparcg.casparcg_connections[0].connection.tls()).request)?.data ?? [];

		return build_files<"template">(
			"template",
			template.map((m) => m.split("/"))
		);
	}

	get_song_file(path: string): SongFile | undefined {
		const item_file: SongFile = {
			name: path,
			path
		};

		try {
			return this.create_song_file(item_file);
		} catch (e) {
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				logger.error(`can't open song: '${path}' does not exist`);

				return undefined;
			} else {
				throw e;
			}
		}
	}

	get_psalm_file(path: string): PsalmFile | undefined {
		const item_file: PsalmFile = {
			name: path,
			path
		};

		try {
			return this.create_psalm_file(item_file);
		} catch (e) {
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				logger.error(`can't open psalm: '${path}' does not exist`);

				return undefined;
			} else {
				throw e;
			}
		}
	}
}

async function build_files<K extends "media" | "template">(
	type: K,
	input_array: string[][],
	root?: string
): Promise<ItemFileMapped<K>[]> {
	const return_array: ItemFileMapped<K>[] = [];

	const temp_object: Record<string, string[][]> = {};

	input_array.forEach((m) => {
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

	const promises = Object.entries(temp_object).map(async ([key, files]) => {
		const file_path = (root ? root + "/" : "") + key;

		const return_object = {
			name: key,
			path: file_path
		};

		return_array.push({
			...return_object,
			children: files.length !== 0 ? await build_files<K>(type, files, file_path) : undefined
		});
	});

	await Promise.all(promises);

	return return_array;
}

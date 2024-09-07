import path from "path";
import fs from "fs/promises";

import Config from "./config/config";
import SngFile, { SongData, SongFileFast } from "./PlaylistItems/SongFile/SongFile";
import { PsalmFile as PsalmData } from "./PlaylistItems/Psalm";
import { logger } from "./logger";
import { casparcg, catch_casparcg_timeout } from "./CasparCGConnection";

interface NodeBase {
	name: string;
	path: string;
	is_dir: boolean;
}

export interface FileBase extends NodeBase {
	is_dir: false;
}

export interface SongFile extends FileBase {
	data: SongData;
}

export interface PsalmFile extends FileBase {
	data: PsalmData;
}

export type CasparFile = FileBase;
export type PDFFile = FileBase;
export type PlaylistFile = FileBase;

export type Node<K extends keyof ItemFileMap> = ItemFileMapped<K> | Directory<K>;
export type Directory<K extends keyof ItemFileMap> = NodeBase &
	{
		[T in K]: {
			children: Node<T>[];
			is_dir: true;
		};
	}[K];
export interface ItemFileMap {
	song: SongFile;
	psalm: PsalmFile;
	media: CasparFile;
	template: CasparFile;
	pdf: PDFFile;
	playlist: PlaylistFile;
}
export type ItemFileMapped<K extends keyof ItemFileMap> = ItemFileMap[K];
export type ItemNodeMapped<K extends keyof ItemFileMap> = Node<K>;

export default class SearchPart {
	constructor() {}

	create_song_file(f: FileBase, fast: boolean): SongFile {
		let song;

		if (fast) {
			song = new SongFileFast(Config.get_path("song", f.path));
		} else {
			song = new SngFile(Config.get_path("song", f.path));
		}

		const song_value: SongFile = {
			...f,
			data: {
				text: song.text,
				metadata: song.metadata
			}
		};

		return song_value;
	}

	async create_psalm_file(f: FileBase): Promise<PsalmFile> {
		const psalm = JSON.parse(
			await fs.readFile(Config.get_path("psalm", f.path), "utf-8")
		) as PsalmData;

		return {
			...f,
			data: psalm
		};
	}

	private async find_files<K extends keyof ItemFileMap>(
		pth: string,
		root: string,
		extension: string,
		file_converter: (f: FileBase) => Promise<ItemFileMapped<K>>
	): Promise<Node<K>[]> {
		const files = await fs.readdir(pth);

		const promises = files.map(async (f) => {
			// if the file is hidden, skip it
			if (f[0] === ".") {
				return undefined;
			}

			const extension_index = f.lastIndexOf(extension);

			const ff = path.join(pth, f);

			const is_directory = (await fs.stat(ff)).isDirectory();

			if (is_directory) {
				return {
					is_dir: true,
					name: f,
					path: path.relative(root, ff),
					children: await this.find_files(ff, root, extension, file_converter)
				} as Directory<K>;
			} else if (extension_index >= 0) {
				const file_result: FileBase = {
					is_dir: false,
					name: f.slice(0, extension_index),
					path: path.relative(root, ff)
				};

				return await file_converter(file_result);
			}
		});

		return (await Promise.all(promises)).filter((el) => el !== undefined) as Node<K>[];
	}

	async find_sng_files(pth: string = Config.path.song): Promise<Node<"song">[]> {
		logger.log("searching song-files");

		return this.find_files<"song">(
			pth,
			pth,
			".sng",
			(f): Promise<SongFile> => Promise.resolve(this.create_song_file(f, true))
		);
	}

	async find_jcg_files(pth: string = Config.path.playlist): Promise<Node<"playlist">[]> {
		logger.log("searching jcg-files");

		return this.find_files<"playlist">(pth, pth, ".jcg", (f) => Promise.resolve(f));
	}

	async find_pdf_files(pth: string = Config.path.pdf): Promise<Node<"pdf">[]> {
		logger.log("searching PDF-files");

		return this.find_files<"pdf">(pth, pth, ".pdf", (f) => Promise.resolve(f));
	}

	async find_psalm_files(pth: string = Config.path.psalm): Promise<Node<"psalm">[]> {
		logger.log("searching psalm-files");

		return this.find_files<"psalm">(pth, pth, ".psm", (f) => this.create_psalm_file(f));
	}

	async get_casparcg_media(): Promise<Node<"media">[]> {
		if (casparcg.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-media-list: no connection added");
			return [];
		}

		logger.debug("requesting CasparCG-media-list");

		const media =
			(await catch_casparcg_timeout(
				async () => (await (await casparcg.casparcg_connections[0].connection.cls()).request)?.data,
				"CLS - get media"
			)) ?? [];

		return build_files(media.map((m) => m.clip.split("/")));
	}

	async get_casparcg_template(): Promise<Node<"template">[]> {
		if (casparcg.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-template-list: no connection added");
			return [];
		}

		logger.debug("requesting CasparCG-template-list");

		const template =
			(await catch_casparcg_timeout(
				async () => (await (await casparcg.casparcg_connections[0].connection.tls()).request)?.data,
				"TLS - get templates"
			)) ?? [];

		return build_files(template.map((m) => m.split("/")));
	}

	get_song_file(path: string): SongFile | undefined {
		const item_file: FileBase = {
			name: path.split(/[\\/]/g).slice(-1)[0],
			path,
			is_dir: false
		};

		try {
			return this.create_song_file(item_file, false);
		} catch (e) {
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				logger.error(`can't open song: '${path}' does not exist`);

				return undefined;
			} else {
				throw e;
			}
		}
	}

	async get_psalm_file(path: string): Promise<PsalmFile | undefined> {
		const item_file: FileBase = {
			name: path.split(/[\\/]/g).slice(-1)[0],
			path,
			is_dir: false
		};

		try {
			return await this.create_psalm_file(item_file);
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

function build_files<K extends "media" | "template">(
	input_array: string[][],
	root?: string
): Node<K>[] {
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

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	return Object.entries(temp_object)
		.map(([key, files]): Node<K> | undefined => {
			// if the file is hidden, skip it
			if (key[0] === ".") {
				return undefined;
			}

			const file_path = (root ? root + "/" : "") + key;

			const is_dir = files.length !== 0;

			if (is_dir) {
				return {
					is_dir: true,
					name: key,
					path: file_path,
					children: build_files(files, file_path)
				};
			} else {
				return {
					is_dir: false,
					name: key,
					path: file_path
				};
			}
		})
		.filter((ele) => ele !== undefined) as Node<K>[];
}

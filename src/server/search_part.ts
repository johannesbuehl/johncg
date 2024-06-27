import path from "path";
import fs from "fs/promises";

import Config from "./config/config";
import SngFile, { SongData } from "./PlaylistItems/SongFile/SongFile";
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
// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
export type ItemFile = SongFile | PsalmFile | CasparFile | PDFFile | PlaylistFile;

export type Node<K extends ItemFile> = K | Directory<K>;
export type Directory<K extends ItemFile> = NodeBase & { children: Node<K>[]; is_dir: true };
export type ItemNode = Node<ItemFile>;
export interface ItemNodeMap {
	song: SongFile;
	psalm: PsalmFile;
	media: CasparFile;
	template: CasparFile;
	pdf: PDFFile;
	playlist: PlaylistFile;
}
export type ItemNodeMapped<K extends keyof ItemNodeMap> = ItemNodeMap[K];

export default class SearchPart {
	constructor() {}

	create_song_file(f: FileBase, fast: boolean = true): SongFile {
		const song = new SngFile(Config.get_path("song", f.path), fast);

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

	async create_psalm_file(f: FileBase): Promise<PsalmFile> {
		const psalm = JSON.parse(
			await fs.readFile(Config.get_path("psalm", f.path), "utf-8")
		) as PsalmData;

		return {
			...f,
			data: psalm
		};
	}

	private async find_files<K extends ItemFile>(
		pth: string,
		root: string,
		extension: string,
		file_converter: (f: FileBase) => Promise<K>
	): Promise<Node<K>[]> {
		const files = await fs.readdir(pth);

		const promises = files.map(async (f) => {
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

		return (await Promise.all(promises)).filter((el) => el !== undefined);
	}

	async find_sng_files(pth: string = Config.path.song): Promise<Node<SongFile>[]> {
		logger.log("searching song-files");

		return this.find_files<SongFile>(
			pth,
			pth,
			".sng",
			(f): Promise<SongFile> => Promise.resolve(this.create_song_file(f))
		);
	}

	async find_jcg_files(pth: string = Config.path.playlist): Promise<Node<PlaylistFile>[]> {
		logger.log("searching jcg-files");

		return this.find_files<PlaylistFile>(pth, pth, ".jcg", (f) => Promise.resolve(f));
	}

	async find_pdf_files(pth: string = Config.path.pdf): Promise<Node<PDFFile>[]> {
		logger.log("searching PDF-files");

		return this.find_files<PDFFile>(pth, pth, ".pdf", (f) => Promise.resolve(f));
	}

	async find_psalm_files(pth: string = Config.path.psalm): Promise<Node<PsalmFile>[]> {
		logger.log("searching psalm-files");

		return this.find_files<PsalmFile>(pth, pth, ".psm", (f) => this.create_psalm_file(f));
	}

	async get_casparcg_media(): Promise<Node<CasparFile>[]> {
		if (casparcg.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-media-list: no connection added");
			return;
		}

		logger.debug("requesting CasparCG-media-list");

		const media =
			(await catch_casparcg_timeout(
				async () => (await (await casparcg.casparcg_connections[0].connection.cls()).request)?.data,
				"CLS - get media"
			)) ?? [];

		return build_files(media.map((m) => m.clip.split("/")));
	}

	async get_casparcg_template(): Promise<Node<CasparFile>[]> {
		if (casparcg.casparcg_connections.length === 0) {
			logger.log("can't request CasparCG-template-list: no connection added");
			return;
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

	async get_psalm_file(path: string): Promise<PsalmFile> | undefined {
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

async function build_files(input_array: string[][], root?: string): Promise<Node<CasparFile>[]> {
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

	const promises = Object.entries(temp_object).map(
		async ([key, files]): Promise<Node<CasparFile>> => {
			const file_path = (root ? root + "/" : "") + key;

			const is_dir = files.length !== 0;

			if (is_dir) {
				return {
					is_dir: true,
					name: key,
					path: file_path,
					children: await build_files(files, file_path)
				};
			} else {
				return {
					is_dir: false,
					name: key,
					path: file_path
				};
			}
		}
	);

	return await Promise.all(promises);
}

import type { SongData } from "./PlaylistItems/SongFile/SongFile";
import type { PsalmFile as PsalmData } from "./PlaylistItems/Psalm";

export enum NodeType {
	File,
	Directory,
	Search
}
export interface NodeBase {
	name: string;
	path: string;
	type: NodeType;
}

export interface FileBase extends NodeBase {
	type: NodeType.File;
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

export type ChooseNode<T extends keyof ItemFileMap> = Node<T> | Search<T>;
export type Node<K extends keyof ItemFileMap> = ItemFileMapped<K> | Directory<K>;
export interface Directory<K extends keyof ItemFileMap> extends NodeBase {
	type: NodeType.Directory;
	children: Node<K>[];
}
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

export interface Search<T extends keyof ItemFileMap> extends NodeBase {
	type: NodeType.Search;
	search_params: string[];
	children: Node<T>[];
}

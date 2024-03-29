import * as PlaylistClass from "../server/Playlist.ts";
import { SongData } from "./search_part.ts";
import PlaylistObject from "./PlaylistFile.ts";
import { ClientItemSlides } from "./PlaylistItems/PlaylistItem.ts";
import { BibleFile } from "./PlaylistItems/Bible.ts";

/**
 * Base interface for sent JGCP-messages
 */
interface Base {
	client_id?: string;
}

/**
 * Response for received commands
 */
export interface Response {
	command: "response";
	message: string;
	code: number;
}

/**
 * JGCP-messages with the playlist_items
 */
export interface Playlist extends Base, PlaylistClass.ClientPlaylistItems {
	command: "playlist_items";
	new_item_order: number[];
}

/**
 * JGCP-messages with the current state
 */
export interface State extends Base {
	command: "state";
	active_item_slide?: PlaylistClass.ActiveItemSlide;
	visibility?: boolean;
}

interface ItemSlidesBase extends Base {
	client_id: string;
	item: number;
	command: "item_slides";
	resolution: PlaylistClass.CasparCGResolution;
}

export type ItemSlides = ClientItemSlides & ItemSlidesBase;

export interface Clear extends Base {
	command: "clear";
}

interface SearchResultsBase extends Base {
	command: "search_results";
}
export interface SongSearchResults extends SearchResultsBase {
	type: "song";
	result: SongData[];
}

export type SearchResults = SongSearchResults;

export interface PlaylistSave {
	command: "playlist_save";
	playlist: PlaylistObject;
}

export interface File {
	name: string;
	path: string;
	children?: File[];
}

interface ItemTreeBase {
	command: "item_files";
	files: File[];
}

export interface MediaTree extends ItemTreeBase {
	type: "media";
}

export interface TemplateTree extends ItemTreeBase {
	type: "template";
}

export interface PlaylistTree extends ItemTreeBase {
	type: "playlist";
}

export interface PDFTree extends ItemTreeBase {
	type: "pdf";
}

export type ItemTree = MediaTree | TemplateTree | PlaylistTree | PDFTree;

export interface Bible {
	command: "bible";
	bible: BibleFile;
}

/**
 * Uniun of the different JGCP-messages
 */
export type Message =
	| Response
	| Playlist
	| State
	| ItemSlides
	| Clear
	| SearchResults
	| PlaylistSave
	| PDFTree
	| Bible;

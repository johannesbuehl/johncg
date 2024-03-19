import * as PlaylistClass from "../server/Playlist.ts";
import type { ClientTemplateSlides } from "./PlaylistItems/Template.ts";
import type { ClientCommentSlides } from "./PlaylistItems/Comment.ts";
import type { ClientCountdownSlides } from "./PlaylistItems/Countdown.ts";
import type { ClientMediaProps } from "./PlaylistItems/Media.ts";
import type { ClientPDFSlides } from "./PlaylistItems/PDF.ts";
import type { ClientSongSlides } from "./PlaylistItems/Song.ts";
import { SongResult } from "./search_part.ts";
import PlaylistObject from "./PlaylistFile.ts";

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

export type SongSlides = ClientSongSlides & ItemSlidesBase;
export type CountdownSlides = ClientCountdownSlides & ItemSlidesBase;
export type MediaSlides = ClientMediaProps & ItemSlidesBase;
export type TemplateSlides = ClientTemplateSlides & ItemSlidesBase;
export type CommentSlides = ClientCommentSlides & ItemSlidesBase;
export type PDFSlides = ClientPDFSlides & ItemSlidesBase;

export type ItemSlides =
	| SongSlides
	| CountdownSlides
	| MediaSlides
	| TemplateSlides
	| CommentSlides
	| PDFSlides;

export interface Clear extends Base {
	command: "clear";
}

interface SearchResultsBase extends Base {
	command: "search_results";
}
export interface SongSearchResults extends SearchResultsBase {
	type: "song";
	result: SongResult[];
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

export interface MediaTree {
	command: "media_tree";
	media: File[];
}

export interface TemplateTree {
	command: "template_tree";
	templates: File[];
}

export interface PlaylistTree {
	command: "playlist_tree";
	playlists: File[];
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
	| MediaTree
	| TemplateTree
	| PlaylistTree;

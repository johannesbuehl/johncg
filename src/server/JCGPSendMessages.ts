import * as PlaylistClass from "../server/Playlist.ts";
import { ClientItemSlides } from "./PlaylistItems/PlaylistItem.ts";
import { BibleFile } from "./PlaylistItems/Bible.ts";
import { GetItemData, GetItemFiles } from "./JCGPReceiveMessages.ts";
import { ItemFileMapped, ItemFileType } from "./search_part.ts";
import { CasparCGResolution } from "./CasparCGConnection.js";

/**
 * Base interface for sent JCGP-messages
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
 * JCGP-messages with the playlist_items
 */
export interface Playlist extends Base, PlaylistClass.ClientPlaylistItems {
	command: "playlist_items";
	caption: string;
	path: string;
	new_item_order: number[];
	new?: boolean;
}

/**
 * JCGP-messages with the current state
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
	resolution: CasparCGResolution;
}

export type ItemSlides = ClientItemSlides & ItemSlidesBase;

export interface Clear extends Base {
	command: "clear";
}

export interface ItemFiles<K extends keyof ItemFileType> {
	command: "item_files";
	type: GetItemFiles["type"];
	files: ItemFileMapped<K>[];
}

export type ItemData<K extends GetItemData["type"]> = {
	command: "item_data";
	type: K;
	data: ItemFileMapped<K>;
};

export interface Bible {
	command: "bible";
	bible: BibleFile;
}

export interface PlaylistPDF {
	command: "playlist_pdf";
	playlist_pdf: string;
}

export enum LogLevel {
	/* eslint-disable @typescript-eslint/naming-convention */
	error = "error",
	warn = "warn",
	log = "log",
	debug = "debug"
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface ClientMessage {
	command: "client_mesage";
	message: string;
	type: LogLevel;
}

export interface MediaThumbnails {
	command: "media_thumbnails";
	thumbnails: Record<string, string>;
}

/**
 * Uniun of the different JCGP-messages
 */
export type Message =
	| Response
	| Playlist
	| State
	| ItemSlides
	| Clear
	| ItemFiles<keyof ItemFileType>
	| ItemData<GetItemData["type"]>
	| Bible
	| PlaylistPDF
	| ClientMessage
	| MediaThumbnails;

import * as PlaylistClass from "../server/Playlist.ts";
import { ClientItemSlides } from "./PlaylistItems/PlaylistItem.ts";
import { BibleFile } from "./PlaylistItems/Bible.ts";
import { GetItemData, GetItemFiles } from "./JGCPReceiveMessages.ts";
import { File, ItemFileMap } from "./search_part.ts";
import { CasparCGResolution } from "./CasparCG.ts";

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
	caption: string;
	new_item_order: number[];
	new?: boolean;
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
	resolution: CasparCGResolution;
}

export type ItemSlides = ClientItemSlides & ItemSlidesBase;

export interface Clear extends Base {
	command: "clear";
}

export interface ItemFiles {
	command: "item_files";
	type: GetItemFiles["type"];
	files: File[];
}

export type ItemData<K extends GetItemData["type"]> = {
	command: "item_data";
	type: K;
	data: ItemFileMap[K];
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

/**
 * Uniun of the different JGCP-messages
 */
export type Message =
	| Response
	| Playlist
	| State
	| ItemSlides
	| Clear
	| ItemFiles
	| ItemData<GetItemData["type"]>
	| Bible
	| PlaylistPDF
	| ClientMessage;

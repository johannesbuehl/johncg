import * as PlaylistClass from "../server/Playlist.ts";
import { ClientItemSlides } from "./PlaylistItems/PlaylistItem.ts";
import { BibleFile } from "./PlaylistItems/Bible.ts";
import { GetItemData, GetItemFiles } from "./JCGPReceiveMessages.ts";
import { CasparCGResolution } from "./CasparCGConnection.js";
import { RequireAtLeastOne } from "./lib.ts";
import { ItemFileMap, ItemFileMapped, ItemNodeMapped } from "./search_part.ts";

/**
 * Base interface for sent JCGP-messages
 */
interface Base {
	server_id: string;
	client_id?: string;
}

/**
 * Response for received commands
 */
export interface Response extends Base {
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

export type ItemFiles<K extends keyof ItemFileMap> = Base & { command: "item_files" } & {
	type: K;
	files: ItemNodeMapped<K>[];
};

export type ItemData<K extends GetItemData["type"]> = {
	command: "item_data";
	type: K;
	data: ItemFileMapped<K>;
} & Base;

export interface Bible extends Base {
	command: "bible";
	bible: BibleFile;
}

export interface PlaylistPDF extends Base {
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

export interface ClientMessage extends Base {
	command: "client_mesage";
	message: string;
	type: LogLevel;
}

export interface MediaThumbnails extends Base {
	command: "media_thumbnails";
	thumbnails: Record<string, string>;
}

export interface ClientConfirmation extends Base {
	command: "client_confirmation";
	id: string;
	text: {
		header: string;
		text: string;
	};
	options: (RequireAtLeastOne<{
		text: string;
		icon: string;
	}> & { value: string | number | boolean })[];
}

export interface ConfirmID extends Base {
	command: "confirm_id";
	id: string;
	state: boolean;
}

/**
 * Uniun of the different JCGP-messages
 */
export type Message =
	| Response
	| Playlist
	| State
	| ItemSlides
	| ItemFiles<GetItemFiles["type"]>
	| ItemData<GetItemData["type"]>
	| Bible
	| PlaylistPDF
	| ClientMessage
	| MediaThumbnails
	| ClientConfirmation
	| ConfirmID;

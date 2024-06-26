import { ClientPlaylistItem, ItemProps } from "./PlaylistItems/PlaylistItem";
import { SongData } from "./PlaylistItems/SongFile/SongFile";
import { PsalmFile as PsalmData } from "./PlaylistItems/Psalm";
import type { ItemFileType, MediaFile } from "./search_part";

/**
 * Base interface for Received JCGP-messages
 */
interface Base {
	client_id?: string;
}

export interface NewPlaylist extends Base {
	command: "new_playlist";
	force?: boolean;
}

/**
 * playlist-file to be loaded
 */
export interface OpenPlaylist extends Base {
	command: "load_playlist";
	playlist: string;
}

export interface SavePlaylist extends Base {
	command: "save_playlist";
	playlist: string;
}

export interface CreatePlaylistPDF extends Base {
	command: "create_playlist_pdf";
	type: "full" | "small";
}

/**
 * request for the slides of a specific item
 */
export interface RequestItemSlides extends Base {
	command: "request_item_slides";
	item: number;
}

/**
 * The different navigation-types
 */
export const item_navigate_type = ["item", "slide"] as const;
export type NavigateType = (typeof item_navigate_type)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
export const is_item_navigate_type = (x: any): x is NavigateType => item_navigate_type.includes(x);

export interface Navigate extends Base {
	command: "navigate";
	type: NavigateType;
	steps: number;
}

/**
 * set the visibility of the output
 */
export interface SetVisibility extends Base {
	command: "set_visibility";
	visibility: boolean;
}

export interface ToggleVisibility extends Base {
	command: "toggle_visibility";
}

export interface SelectItemSlide extends Base {
	command: "select_item_slide";
	item: number;
	slide: number;
}

export interface MovePlaylistItem extends Base {
	command: "move_playlist_item";
	from: number;
	to: number;
}

export interface GetItemFiles extends Base {
	command: "get_item_files";
	type: keyof ItemFileType;
}

export interface GetBible extends Base {
	command: "get_bible";
}

export interface GetItemData extends Base {
	command: "get_item_data";
	type: "song" | "psalm";
	file: string;
}

export interface AddItem extends Base {
	command: "add_item";
	props: ItemProps;
	index?: number;
	set_active?: boolean;
}

export interface UpdateItem extends Base {
	command: "update_item";
	props: ClientPlaylistItem;
	index: number;
}

export interface UpdatePlaylistCaption extends Base {
	command: "update_playlist_caption";
	caption: string;
}

export interface DeleteItem extends Base {
	command: "delete_item";
	position: number;
}

export type SaveFile = Base & { command: "save_file"; path: string } & (
		| { type: "song"; data: SongData }
		| { type: "psalm"; data: PsalmData }
	);

export interface GetMediaThumbnails extends Base {
	command: "get_media_thumbnails";
	files: MediaFile[];
}

export interface NewDirectory extends Base {
	command: "new_directory";
	path: string;
	type: "playlist" | "song" | "psalm";
}

/**
 * Uniun of the different JCGP-messages
 */
export type Message =
	| RequestItemSlides
	| SetVisibility
	| ToggleVisibility
	| OpenPlaylist
	| Navigate
	| SelectItemSlide
	| MovePlaylistItem
	| AddItem
	| UpdateItem
	| UpdatePlaylistCaption
	| DeleteItem
	| NewPlaylist
	| SavePlaylist
	| GetItemFiles
	| GetBible
	| GetItemData
	| CreatePlaylistPDF
	| SaveFile
	| GetMediaThumbnails
	| NewDirectory;

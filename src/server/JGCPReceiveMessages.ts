import { ItemProps } from "./PlaylistItems/PlaylistItem";

/**
 * Base interface for Received JGCP-messages
 */
interface Base {
	client_id?: string;
}

export interface NewPlaylist extends Base {
	command: "new_playlist";
}

/**
 * playlist-file to be loaded
 */
export interface OpenPlaylist extends Base {
	command: "open_playlist";
	playlist: string;
}

export interface SavePlaylist extends Base {
	command: "save_playlist";
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
const item_navigate_type = ["item", "slide"] as const;
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

export interface RenewSearchIndex extends Base {
	command: "renew_search_index";
	type: "song" | "psalm" | "bible" | "text" | "media" | "template" | "pdf" | "countdown";
}

export interface SearchItem extends Base {
	command: "search_item";
	type: "song";
	search: {
		title?: string;
		id?: string;
		text?: string;
	};
}

export interface GetMediaTree extends Base {
	command: "get_media_tree";
}

export interface GetTemplateTree extends Base {
	command: "get_template_tree";
}

export interface GetPlaylistTree extends Base {
	command: "get_playlist_tree";
}

export interface GetBible extends Base {
	command: "get_bible";
}

export interface GetItemData extends Base {
	command: "get_item_data";
	type: "song";
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
	props: ItemProps;
	index: number;
}

export interface DeleteItem {
	command: "delete_item";
	position: number;
}

/**
 * Uniun of the different JGCP-messages
 */
export type Message =
	| RequestItemSlides
	| SetVisibility
	| OpenPlaylist
	| Navigate
	| SelectItemSlide
	| MovePlaylistItem
	| RenewSearchIndex
	| SearchItem
	| AddItem
	| UpdateItem
	| DeleteItem
	| NewPlaylist
	| GetPlaylistTree
	| SavePlaylist
	| GetMediaTree
	| GetTemplateTree
	| GetBible
	| GetItemData;

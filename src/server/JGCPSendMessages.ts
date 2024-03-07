import * as PlaylistClass from "../server/Playlist";
import type { ClientCommandCommentSlides } from "./PlaylistItems/CommandComment";
import type { ClientCommentSlides } from "./PlaylistItems/Comment";
import type { ClientCountdownSlides } from "./PlaylistItems/Countdown";
import type { ClientImageSlides } from "./PlaylistItems/Image";
import type { ClientPDFSlides } from "./PlaylistItems/PDF";
import type { ClientSongSlides } from "./PlaylistItems/Song";

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
	command: "response",
	message: string;
	code: number;
}

/**
 * JGCP-messages with the playlist_items
 */
export interface Playlist extends Base, PlaylistClass.ClientPlaylistItems {
	command: "playlist_items";
}

/**
 * JGCP-messages with the current state
 */
export interface State extends Base {
	command: "state";
	active_item_slide?: PlaylistClass.ActiveItemSlide,
	visibility?: boolean;
}

interface ItemSlidesBase extends Base{
	client_id?: string;
	command: "item_slides";
	resolution: PlaylistClass.CasparCGResolution;
}

export type SongSlides = ClientSongSlides & ItemSlidesBase;
export type CountdownSlides = ClientCountdownSlides & ItemSlidesBase;
export type ImageSlides = ClientImageSlides & ItemSlidesBase;
export type CommandCommentSlides = ClientCommandCommentSlides & ItemSlidesBase;
export type CommentSlides = ClientCommentSlides & ItemSlidesBase;
export type PDFSlides = ClientPDFSlides & ItemSlidesBase;

export type ItemSlides = SongSlides | CountdownSlides | ImageSlides | CommandCommentSlides | CommentSlides | PDFSlides;

export interface Clear extends Base {
	command: "clear";
}

/**
 * Uniun of the different JGCP-messages
 */
export type Message = Playlist | State | ItemSlides;

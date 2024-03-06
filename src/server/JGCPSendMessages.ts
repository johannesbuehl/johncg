import * as SequenceClass from "../server/Sequence";
import { ClientCommandCommentSlides } from "./SequenceItems/CommandComment";
import { ClientCommentSlides } from "./SequenceItems/Comment";
import { ClientCountdownSlides } from "./SequenceItems/Countdown";
import { ClientImageSlides } from "./SequenceItems/Image";
import { ClientPDFSlides } from "./SequenceItems/PDF";
import { ClientSongSlides } from "./SequenceItems/Song";

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
 * JGCP-messages with the sequence_items
 */
export interface Sequence extends Base, SequenceClass.ClientSequenceItems {
	command: "sequence_items";
}

/**
 * JGCP-messages with the current state
 */
export interface State extends Base {
	command: "state";
	active_item_slide?: SequenceClass.ActiveItemSlide,
	visibility?: boolean;
}

interface ItemSlidesBase extends Base{
	client_id: string;
	command: "item_slides";
	resolution: SequenceClass.CasparCGResolution;
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
export type Message = Sequence | State | ItemSlides;

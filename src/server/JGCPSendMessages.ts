import * as SequenceClass from "../server/Sequence";
import { ClientCountdownSlides } from "../server/SequenceItems/Countdown";
import { ClientSongSlides } from "../server/SequenceItems/Song";

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

// export interface ItemSlides extends Base, ClientItemSlidesBase {
// 	clientID: string;
// 	command: "item-slides";
// 	slides: string[][];
// }

interface ItemSlidesBase extends Base{
	client_id: string;
	command: "item_slides";
}

export type SongSlides = ItemSlidesBase & ClientSongSlides;

export type CountdownSlides = ItemSlidesBase & ClientCountdownSlides;

// temporary until full feature set
export type NotImplementedSlides = ItemSlidesBase & { type: string; item: number; };

export type ItemSlides = SongSlides | CountdownSlides | NotImplementedSlides;

export interface Clear extends Base {
	command: "clear";
}

/**
 * Uniun of the different JGCP-messages
 */
export type Message = Sequence | State;

import * as SequenceClass from "../server/Sequence";
import { ClientItemSlides } from "./SequenceItems/SequenceItem";

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
}

export type ItemSlides = ClientItemSlides & ItemSlidesBase;

export interface Clear extends Base {
	command: "clear";
}

/**
 * Uniun of the different JGCP-messages
 */
export type Message = Sequence | State;

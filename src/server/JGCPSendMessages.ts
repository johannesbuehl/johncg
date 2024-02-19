import * as SequenceClass from "../server/Sequence";
import { ClientItemSlides } from "./SequenceItems/SequenceItem";

/**
 * Base interface for sent JGCP-messages
 */
interface Base {
	clientID?: string;
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
 * JGCP-messages with the sequence-items
 */
export interface Sequence extends Base, SequenceClass.ClientSequenceItems {
	command: "sequence-items";
}

/**
 * JGCP-messages with the current state
 */
export interface State extends Base {
	command: "state";
	activeItemSlide?: SequenceClass.ActiveItemSlide,
	visibility?: boolean;
}

export interface ItemSlides extends Base, ClientItemSlides {
	clientID: string;
	command: "item-slides";
}

export interface Clear extends Base {
	command: "clear";
}

/**
 * Uniun of the different JGCP-messages
 */
export type Message = Sequence | State;

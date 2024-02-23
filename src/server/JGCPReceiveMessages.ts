/**
 * Base interface for Received JGCP-messages
 */
interface Base {
	client_id?: string;
}

/**
 * sequence-file to be loaded
 */
export interface OpenSequence extends Base {
	command: "open_sequence";
	sequence: string;
}

/**
 * request for the slides of a specific item
 */
export interface RequestItemSlides extends Base {
	command: "request-item_slides";
	item: number;
}

export interface ItemSlideSelect extends Base {
	command: "select-item-slide";
	item: number;
	slide: number;
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

/**
 * Uniun of the different JGCP-messages
 */
export type Message = RequestItemSlides | SetVisibility | OpenSequence | Navigate | SelectItemSlide;


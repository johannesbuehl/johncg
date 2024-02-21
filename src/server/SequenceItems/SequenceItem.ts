import fs from "fs";
import path from "path";
import mime from "mime-types";

import Config from "../config";
import Song, { ClientSongSlides, SongProps, SongRenderObject } from "./Song";
import Countdown, { ClientCountdownSlides, CountdownProps, CountdownRenderObject } from "./Countdown";
import Comment from "./Comment";

export type SequenceItem = Song | Countdown | Comment;

export interface ItemPropsBase {
	Type: string;
	Caption: string;
	SlideCount: number;
	Color: string;
	Item: number;
	selectable: boolean;
}

export type ItemProps = ItemPropsBase | SongProps | CountdownProps

// interface for a renderer-object
export interface ItemRenderObjectBase {
	slides: Array<unknown>;
	slide: number;
	backgroundImage?: string;
	backgroundColor?: string;
}

export type ItemRenderObject = ItemRenderObjectBase | SongRenderObject | CountdownRenderObject;

export interface ClientItemSlidesBase {
	Type: string;
	title: string;
	item: number;
	slides: object;
	slides_template: ItemRenderObject;
}

export type ClientItemSlides = ClientItemSlidesBase | ClientSongSlides | ClientCountdownSlides;

export interface FontFormat {
	fontFamily?: string;
	fontSize: number;
	fontWeight?: "bold";
	fontStyle?: "italic";
	fontDecoration?: "underline";
	color: string;
}

export abstract class SequenceItemBase {
	protected abstract item_props: ItemProps;
	protected abstract SlideCount: number;

	abstract create_render_object(slide?: number);
	abstract create_client_object_item_slides(): ClientItemSlides;
	abstract set_active_slide(slide?: number): number;

	/**
	 * navigate the selected slide
	 * @param steps steps to navigate; sign is used for direction
	 * @returns required navigation of item; sign is used for direction
	 */
	abstract navigate_slide(steps: number): number;

	abstract get active_slide(): number;

	protected validate_slide_number(slide: number): number {
		const slide_count = this.SlideCount;

		if (typeof slide !== "number") {
			throw new TypeError(`'${slide} is not of type 'number'`);
		}

		if (slide < -slide_count || slide >= slide_count) {
			throw new RangeError(`slide-number is out of range (${-slide_count}-${slide_count - 1})`);
		}

		if (slide < 0) {
			slide += slide_count;
		}

		return slide;
	}

	get props(): ItemProps {
		return this.item_props;
	}
}

export function get_image_b64(image_path: string): string {
	try {
		return `data:${mime.lookup(image_path)};base64,` + fs.readFileSync(path.join(Config.path.backgroundImage, image_path)).toString("base64");
	} catch (e) {
		return "";
	}
}
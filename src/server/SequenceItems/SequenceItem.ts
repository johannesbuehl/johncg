import fs from "fs";
import path from "path";
import mime from "mime-types";

import Config from "../config";
import { ClientSongSlides, SongProps, SongRenderObject } from "./Song";
import { ClientCountdownSlides, CountdownProps, CountdownRenderObject } from "./Countdown";


export interface ItemPropsBase {
	Type: string;
	Caption: string;
	SlideCount: number;
	Color: string;
	Item: number;
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

export default abstract class SequenceItem {
	protected abstract item_props: ItemProps;

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
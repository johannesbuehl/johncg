import fs from "fs";
import path from "path";
import mime from "mime-types";

import Config from "../config";
import { SongProps } from "./Song";


export interface ItemPropsBase {
	Caption: string;
	SlideCount: number;
	Color: string;
	Item: number;
}

export type ItemProps = SongProps

// interface for a renderer-object
export interface RenderObject {
	slides: object;
	slide: number;
	backgroundImage?: string;
}

export interface ClientItemSlides {
	title: string;
	item: number;
	slides: object;
	slides_template: RenderObject;
}

export default abstract class SequenceItem {
	protected abstract item_props: ItemProps;

	abstract create_renderer_object(slide?: number);
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
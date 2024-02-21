import { promises as fs } from "fs";
import path from "path";
import mime from "mime-types";
import sharp from "sharp";

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
	backgroundImage?: {
		orig: string;
		proxy: string;
	}
}

export type ItemProps = ItemPropsBase | SongProps | CountdownProps

// interface for a renderer-object
export interface ItemRenderObjectBase {
	slides: Array<unknown>;
	slide: number;
	backgroundImage?: string;
	backgroundColor?: string;
	mute_transition?: boolean;
}

export type ItemRenderObject = ItemRenderObjectBase | SongRenderObject | CountdownRenderObject;

export interface ClientItemSlidesBase {
	Type: string;
	title: string;
	item: number;
	slides: object;
	slides_template: ItemRenderObject & { mute_transition: true; };
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

	abstract create_render_object(proxy?: boolean, slide?: number);
	abstract create_client_object_item_slides(): Promise<ClientItemSlides>;
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

	protected async load_backgroundImage(image_path: string) {
		let img_buffer;
		
		try {
			img_buffer = await fs.readFile(path.join(Config.path.backgroundImage, image_path));
		} catch (e) {
			this.item_props.backgroundImage = {
				orig: "",
				proxy: ""
			};

			return;
		}
		
		const img_buffer_proxy = sharp(img_buffer).resize(240).toBuffer();

		this.item_props.backgroundImage = {
			orig: `data:${mime.lookup(image_path)};base64,` + (img_buffer).toString("base64"),
			proxy: `data:${mime.lookup(image_path)};base64,` + (await img_buffer_proxy).toString("base64")
		};
	}

	get props(): ItemProps {
		return this.item_props;
	}

	protected abstract get_background_image(proxy?: boolean): Promise<string>;
}
import { promises as fs } from "fs";
import path from "path";
import mime from "mime-types";
import sharp from "sharp";

import Config from "../config";
import Song, { ClientSongSlides, SongProps, SongRenderObject } from "./Song";
import Countdown, { ClientCountdownSlides, CountdownProps, CountdownRenderObject } from "./Countdown";
import Comment, { ClientCommentSlides, CommentProps, CommentRenderObject } from "./Comment";

export type SequenceItem = Song | Countdown | Comment;

export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type: string;
	Caption: string;
	slide_count: number;
	Color: string;
	item: number;
	selectable: boolean;
	BackgroundImage?: {
		orig: string;
		proxy: string;
	}
	/* eslint-enable @typescript-eslint/naming-convention */
}

export type ItemProps = SongProps | CountdownProps | CommentProps;

// interface for a renderer-object
export interface ItemRenderObjectBase {
	slides: Array<unknown>;
	slide: number;
	background_image?: string;
	background_color?: string;
	mute_transition?: boolean;
}

export type ItemRenderObject = SongRenderObject | CountdownRenderObject | CommentRenderObject;

export interface ClientItemSlidesBase {
	type: string;
	title: string;
	item: number;
	slides: object;
	slides_template: ItemRenderObject & { mute_transition: true; };
}

export type ClientItemSlides = ClientSongSlides | ClientCountdownSlides | ClientCommentSlides;

export interface FontFormat {
	/* eslint-disable @typescript-eslint/naming-convention */
	fontFamily?: string;
	fontSize: number;
	fontWeight?: "bold";
	fontStyle?: "italic";
	fontDecoration?: "underline";
	color: string;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export abstract class SequenceItemBase {
	protected abstract item_props: ItemProps;
	protected abstract slide_count: number;

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

	protected validate_slide_number(slide: unknown): number {
		const slide_count = this.slide_count;

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

	protected async load_background_images(image_path?: string, background_color?: string) {
		let img_buffer, img_buffer_proxy;
		
		if (image_path !== undefined) {
			try {
				img_buffer = await fs.readFile(path.join(Config.path.background_image, image_path));
			} catch (e) {
				this.item_props.BackgroundImage = {
					orig: "",
					proxy: ""
				};
	
				return;
			}
			img_buffer_proxy = sharp(img_buffer).resize(240).toBuffer();
		}

		// if the image_buffer is still undefined, try to use the backgroundColor
		if (background_color !== undefined) {
			img_buffer = sharp({
				create: {
					width: 1,
					height: 1,
					channels: 4,
					background: color_string_to_object(background_color)
				}
			}).png().toBuffer();

			// copy the the image to the proxy buffer, since only 1px anyway
			img_buffer_proxy = img_buffer;
		}

		this.item_props.BackgroundImage = {
			orig: `data:${mime.lookup(image_path)};base64,` + (img_buffer).toString("base64"),
			proxy: `data:${mime.lookup(image_path)};base64,` + (await img_buffer_proxy).toString("base64")
		};
	}

	get props(): ItemProps {
		return this.item_props;
	}

	protected abstract get_background_image(proxy?: boolean): Promise<string>;
}

function color_string_to_object(color: string): { r: number, g: number, b: number, alpha?: number} {
	const regex_result = color.match(/#(?<r>[0-9A-Fa-f]{2})(?<g>[0-9A-Fa-f]{2})(?<b>[0-9A-Fa-f]{2})(?<alpha>[0-9A-Fa-f]{2})?/mg);

	if (!regex_result) {
		throw new SyntaxError(`'${color}' is no valid color`);
	}

	return {
		r: Number(regex_result.groups?.r),
		g: Number(regex_result.groups?.g),
		b: Number(regex_result.groups?.b),
		alpha: Number(regex_result.groups?.alpha)
	};
}
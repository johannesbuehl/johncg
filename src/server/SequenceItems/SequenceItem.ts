import { promises as fs } from "fs";
import mime from "mime-types";
import sharp, { AvifOptions, FormatEnum, GifOptions, HeifOptions, Jp2Options, JpegOptions, JxlOptions, OutputOptions, PngOptions, TiffOptions, WebpOptions } from "sharp";

import Song, { ClientSongSlides, SongProps, SongTemplate } from "./Song";
import Countdown, { ClientCountdownSlides, CountdownProps, CountdownTemplate } from "./Countdown";
import Comment, { ClientCommentSlides, CommentProps } from "./Comment";
import Image, { ClientImageSlides, ImageProps } from "./Image";
import CommandComment, { ClientCommandCommentSlides, CommandCommentProps, CommandCommentTemplate } from "./CommandComment";
import Config from "../config";
import path from "path";
import PDF, { ClientPDFSlides, PDFProps } from "./PDF";

export type SequenceItem = Song | Countdown | Comment | Image | CommandComment | PDF;

export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type Template = CountdownTemplate | SongTemplate | CommandCommentTemplate;

export interface ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type: string;
	Caption: string;
	slide_count: number;
	Color: string;
	selectable: boolean;
	background_color?: string;
	background_image?: string;
	media?: string[];
	template?: Template;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export type ItemProps = SongProps | CountdownProps | CommentProps | ImageProps | CommandCommentProps | PDFProps;

export interface ClientItemSlidesBase {
	type: string;
	title: string;
	// item: number;
	slides: Array<unknown>;
	media_b64?: string;
	template?: {
		template: string;
		data: object;
	};
}

export type ClientItemSlides = ClientSongSlides | ClientCountdownSlides | ClientCommentSlides | ClientImageSlides | ClientCommandCommentSlides | ClientPDFSlides;

export interface FontFormat {
	/* eslint-disable @typescript-eslint/naming-convention */
	fontFamily?: string;
	fontSize: number;
	fontWeight?: "bold";
	fontStyle?: "italic";
	textDecoration?: "underline";
	color: string;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export abstract class SequenceItemBase {
	protected abstract item_props: ItemProps;
	protected abstract slide_count: number;

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
			throw new TypeError(`'${JSON.stringify(slide)} is not of type 'number'`);
		}

		if (slide < -slide_count || slide >= slide_count) {
			throw new RangeError(`slide-number is out of range (${-slide_count}-${slide_count - 1})`);
		}

		if (slide < 0) {
			slide += slide_count;
		}

		return slide;
	}

	async get_media_b64(proxy: boolean = false, media: string = this.media): Promise<string> {
		let img: sharp.Sharp = undefined;

		// if no background-color is specified, set it to transparent
		const background_color = this.props.background_color ?? "#00000000";
		
		if (media !== undefined) {
			try {
				img = sharp(await fs.readFile(media));
			
				// if a proxy is requested, downscale teh image
				if (proxy) {
					img.resize(240);
				}

			} catch (e) {
				/* empty */
			}
		}

		// if the image_buffer is still undefined, use the backgroundColor
		if (img === undefined) {
			img = sharp({
				create: {
					width: 1,
					height: 1,
					channels: 4,
					background: background_color
				}
			}).png();
		}

		const pack_b64_string = async (img: sharp.Sharp, path: string = this.props.background_image) => `data:${mime.lookup(path)};base64,` + (await img.toBuffer()).toString("base64");

		let ret_string: string = await pack_b64_string(img);

		const sharp_formats: [keyof FormatEnum,
		options?:
			| OutputOptions
			| JpegOptions
			| PngOptions
			| WebpOptions
			| AvifOptions
			| HeifOptions
			| JxlOptions
			| GifOptions
			| Jp2Options
			| TiffOptions
		][]
		= [
			["webp", { lossless: true }],
			["jpg", { quality: 100 }]
		];

		while (ret_string.length > 2097152) {
			const [format, options] = sharp_formats.shift();

			ret_string = await pack_b64_string(img.toFormat(format, options), `.${format}`);
		}
		
		return ret_string;
	}

	abstract get props(): ItemProps;

	get media(): string {
		if (this.props.media !== undefined) {
			return this.props.media[this.active_slide];
		} else {
			return undefined;
		}
	}

	protected resolve_image_path(img_path: string): string {
		const return_path = path.isAbsolute(img_path) ? img_path : path.resolve(Config.path.background_image, img_path);

		return return_path.replaceAll("\\", "/");
	}

	protected get_background_image(img_path: string = this.props.background_image): string {
		// if it is not defined, return the backgroundcolor instead
		if (img_path === undefined) {
			// if the background-color too isn't defined, return transparency
			return this.props.background_color ?? "#00000000";
		} else {
			return this.resolve_image_path(img_path);
		}
	}

	abstract get template(): Template;
}

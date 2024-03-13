import { promises as fs } from "fs";
import mime from "mime-types";
import sharp from "sharp";
import type {
	AvifOptions,
	FormatEnum,
	GifOptions,
	HeifOptions,
	Jp2Options,
	JpegOptions,
	JxlOptions,
	OutputOptions,
	PngOptions,
	TiffOptions,
	WebpOptions
} from "sharp";
import path from "path";

import type Song from "./Song.ts";
import type { ClientSongSlides, SongProps, SongTemplate } from "./Song.ts";
import type Countdown from "./Countdown.ts";
import type { ClientCountdownSlides, CountdownProps, CountdownTemplate } from "./Countdown.ts";
import type { ClientCommentSlides, CommentProps } from "./Comment.ts";
import type Image from "./Image.ts";
import type { ClientImageSlides, ImageProps } from "./Image.ts";
import type CommandComment from "./CommandComment.ts";
import type {
	ClientCommandCommentSlides,
	CommandCommentProps,
	CommandCommentTemplate
} from "./CommandComment.ts";
import type PDF from "./PDF.ts";
import type { ClientPDFSlides, PDFProps } from "./PDF.ts";
import Config from "../config.ts";
import type Comment from "./Comment.ts";

export type PlaylistItem = Song | Countdown | Comment | Image | CommandComment | PDF;

export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type Template = CountdownTemplate | SongTemplate | CommandCommentTemplate;

export interface ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type?: string;
	Caption: string;
	Color: string;
	VerseOrder?: string[];
	FileName?: string;
	Language?: number;
	PrimaryLanguage?: number;
	Time?: string;
	StreamClass?: string;

	slide_count?: number;
	Data?: string;
	selectable: boolean;
	background_color?: string;
	background_image?: string;
	media?: string[];
	template?: Template;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export type ItemProps =
	| SongProps
	| CountdownProps
	| CommentProps
	| ImageProps
	| CommandCommentProps
	| PDFProps;

export interface ClientItemSlidesBase {
	type: string;
	title: string;
	slides: Array<unknown>;
	media_b64?: string;
	template?: {
		template: string;
		data?: object;
	};
}

export type ClientItemSlides =
	| ClientSongSlides
	| ClientCountdownSlides
	| ClientCommentSlides
	| ClientImageSlides
	| ClientCommandCommentSlides
	| ClientPDFSlides;

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

export abstract class PlaylistItemBase {
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

	async get_media_b64(
		proxy: boolean = false,
		media: string | undefined = this.media
	): Promise<string> {
		let img: sharp.Sharp | undefined;

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

		const pack_b64_string = async (
			img: sharp.Sharp,
			path: string = this.props.background_image ?? ""
		) => `data:${mime.lookup(path)};base64,` + (await img.toBuffer()).toString("base64");

		let ret_string: string = await pack_b64_string(img);

		type SharpFormats = [
			keyof FormatEnum,
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
		];

		const sharp_formats: SharpFormats[] = [
			["webp", { lossless: true }],
			["jpg", { quality: 100 }]
		];

		while (ret_string.length > 2097152) {
			if (sharp_formats.length !== 0) {
				const packed_format = sharp_formats.shift();

				if (packed_format !== undefined) {
					const [format, options] = packed_format;

					ret_string = await pack_b64_string(img.toFormat(format, options), `.${format}`);
				}
			} else {
				return "";
			}
		}

		return ret_string;
	}

	abstract get props(): ItemProps;

	get media(): string | undefined {
		if (this.props.media !== undefined) {
			return this.props.media[this.active_slide];
		} else {
			return undefined;
		}
	}

	protected resolve_image_path(img_path: string): string {
		const return_path = path.isAbsolute(img_path)
			? img_path
			: path.resolve(Config.path.background_image, img_path);

		return return_path.replaceAll("\\", "/");
	}

	protected get_background_image(
		img_path: string | undefined = this.props.background_image
	): string {
		// if it is not defined, return the backgroundcolor instead
		if (img_path === undefined) {
			// if the background-color too isn't defined, return transparency
			return this.props.background_color ?? "#00000000";
		} else {
			return this.resolve_image_path(img_path);
		}
	}

	abstract get template(): Template | undefined;
}

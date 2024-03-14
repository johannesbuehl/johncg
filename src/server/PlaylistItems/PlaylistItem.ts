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
	media: string[];
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
	media: string[];
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

	abstract get props(): ItemProps;

	get media(): string | undefined {
		if (this.props.media !== undefined) {
			return this.props.media[this.active_slide];
		} else {
			return undefined;
		}
	}

	abstract get template(): Template | undefined;
}

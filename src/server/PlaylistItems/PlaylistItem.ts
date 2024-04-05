import type Song from "./Song.ts";
import type { ClientSongSlides, SongProps, SongTemplate } from "./Song.ts";
import type Countdown from "./Countdown.ts";
import type { ClientCountdownSlides, CountdownProps, CountdownTemplate } from "./Countdown.ts";
import type { ClientCommentSlides, CommentProps } from "./Comment.ts";
import type Media from "./Media.ts";
import type { ClientMediaProps, MediaProps } from "./Media.ts";
import type TemplateItem from "./Template.ts";
import type { ClientTemplateSlides, TemplateProps, TemplateTemplate } from "./Template.ts";
import type PDF from "./PDF.ts";
import type { ClientPDFSlides, PDFProps } from "./PDF.ts";
import type Comment from "./Comment.ts";
import type Bible from "./Bible.ts";
import type { BibleProps, BibleTemplate, ClientBibleSlides } from "./Bible.ts";
import Psalm, { ClientPsalmSlides, PsalmProps } from "./Psalm.ts";

export type PlaylistItem = Song | Countdown | Comment | Media | TemplateItem | PDF | Bible | Psalm;

export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type Template = CountdownTemplate | SongTemplate | TemplateTemplate | BibleTemplate;

export interface ItemPropsBase {
	type: string;
	caption: string;
	color: string;
}

export type ItemProps =
	| SongProps
	| CountdownProps
	| CommentProps
	| MediaProps
	| TemplateProps
	| PDFProps
	| BibleProps
	| PsalmProps;

export interface CasparCGTemplate {
	template: string;
	data?: object;
}

export interface ClientItemSlidesBase {
	type: string;
	caption: string;
	media: string;
	template?: CasparCGTemplate;
}

export type ClientItemSlides =
	| ClientSongSlides
	| ClientCountdownSlides
	| ClientCommentSlides
	| ClientMediaProps
	| ClientTemplateSlides
	| ClientPDFSlides
	| ClientBibleSlides
	| ClientPsalmSlides;

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

	protected is_displayable: boolean = true;

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

	update(new_props: ItemProps): ItemProps | false {
		if (this.validate_props(new_props)) {
			this.item_props = new_props;

			this.is_displayable = true;

			return this.props;
		} else {
			return false;
		}
	}

	protected abstract validate_props(props: ItemProps): boolean;

	abstract get props(): ItemProps;

	abstract get playlist_item(): ItemProps & { displayable: boolean };

	abstract get media(): string;

	get multi_media(): boolean {
		return false;
	}

	abstract get loop(): boolean;

	abstract get template(): Template | undefined;

	get displayable(): boolean {
		return this.is_displayable;
	}
}

export function recurse_check(obj: unknown, template: unknown): boolean {
	if (typeof obj === "object" && typeof template === "object") {
		const results: boolean[] = [];

		if (Array.isArray(obj) && Array.isArray(template)) {
			results.push(
				...obj.map((ele): boolean => {
					return recurse_check(ele, template[0]);
				})
			);
			// check that none of them are arrays
		} else if (Array.isArray(obj) === Array.isArray(template)) {
			const obj_keys = Object.keys(obj);

			results.push(
				...Object.entries(template).map(([key, item]): boolean => {
					if (obj_keys.includes(key)) {
						return recurse_check(item, (template as Record<string, unknown>)[key]);
					} else {
						return false;
					}
				})
			);
		} else {
			return false;
		}

		return results.every((res) => res);
	} else {
		// check, wether the object and the template are of the same type
		if (typeof obj !== typeof template) {
			return false;
		} else {
			return true;
		}
	}
}

import type Song from "./Song.ts";
import type { ClientSongItem, ClientSongSlides, SongProps, SongTemplate } from "./Song.ts";
import type Countdown from "./Countdown.ts";
import type {
	ClientCountdownItem,
	ClientCountdownSlides,
	CountdownProps,
	CountdownTemplate
} from "./Countdown.ts";
import type { ClientCommentItem, ClientCommentSlides, CommentProps } from "./Comment.ts";
import type Media from "./Media.ts";
import type { ClientMediaItem, ClientMediaProps, MediaProps } from "./Media.ts";
import type TemplateItem from "./Template.ts";
import type {
	ClientTemplateItem,
	ClientTemplateSlides,
	TemplateProps,
	TemplateTemplate
} from "./Template.ts";
import type PDF from "./PDF.ts";
import type { ClientPDFItem, ClientPDFSlides, PDFProps } from "./PDF.ts";
import type Comment from "./Comment.ts";
import type Bible from "./Bible.ts";
import type { BibleProps, BibleTemplate, ClientBibleItem, ClientBibleSlides } from "./Bible.ts";
import Psalm, { ClientPsalmItem, ClientPsalmSlides, PsalmProps } from "./Psalm.ts";
import AMCP, { AMCPProps, ClientAMCPItem, ClientAMCPSlides } from "./AMCP.ts";
import { logger } from "../logger.ts";
import { get_casparcg_transition } from "../config/config.ts";
import {
	CasparCGConnection,
	TemplateSlideJump,
	casparcg,
	catch_casparcg_timeout,
	stringify_json_for_tempalte
} from "../CasparCGConnection.js";
import TextItem, { ClientTextItem, ClientTextSlides, TextProps } from "./Text.ts";

export type PlaylistItem =
	| Song
	| Psalm
	| Bible
	| TextItem
	| Media
	| TemplateItem
	| PDF
	| Countdown
	| AMCP
	| Comment;

export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type Template = CountdownTemplate | SongTemplate | TemplateTemplate | BibleTemplate;

export interface ItemPropsBase {
	type: string;
	caption: string;
	color: string;
}

export interface ClientItemBase {
	displayable: boolean;
}

export type ItemProps =
	| SongProps
	| CountdownProps
	| CommentProps
	| TextProps
	| MediaProps
	| TemplateProps
	| PDFProps
	| BibleProps
	| PsalmProps
	| AMCPProps;

export type ClientPlaylistItem =
	| ClientSongItem
	| ClientCountdownItem
	| ClientCommentItem
	| ClientTextItem
	| ClientMediaItem
	| ClientTemplateItem
	| ClientPDFItem
	| ClientBibleItem
	| ClientPsalmItem
	| ClientAMCPItem;

export interface CasparCGTemplate {
	template: string;
	data?: object;
}

export interface ClientItemSlidesBase {
	type: string;
	caption: string;
	title: string;
	media?: string;
	template?: CasparCGTemplate;
}

export type ClientItemSlides =
	| ClientSongSlides
	| ClientCountdownSlides
	| ClientCommentSlides
	| ClientTextSlides
	| ClientMediaProps
	| ClientTemplateSlides
	| ClientPDFSlides
	| ClientBibleSlides
	| ClientPsalmSlides
	| ClientAMCPSlides;

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
			throw new RangeError(
				`slide-number is out of range ('${-slide_count}' - '${slide_count - 1}')`
			);
		}

		if (slide < 0) {
			slide += slide_count;
		}

		return slide;
	}

	// calculates and stores the slide-count
	recalculate_slide_count() {
		this.slide_count = 1;
	}

	update(new_props: ItemProps, callback: (new_props: ItemProps) => void): boolean {
		if (this.validate_props(new_props)) {
			this.item_props = new_props;

			// recalculate slide-count
			this.recalculate_slide_count();

			callback(this.item_props);

			return true;
		} else {
			return false;
		}
	}

	play(casparcg_connection?: CasparCGConnection): Promise<unknown> {
		const connections = casparcg_connection ? [casparcg_connection] : casparcg.casparcg_connections;

		return Promise.allSettled(
			connections.map((connection) => {
				return Promise.all([this.play_media(connection), this.play_template(connection)]);
			})
		);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
	stop(_casparcg_connection?: CasparCGConnection) {}

	protected play_media(casparcg_connection: CasparCGConnection) {
		if (casparcg_connection.settings.layers.media !== undefined) {
			if (casparcg.visibility) {
				const clip = this.media ?? "#00000000";

				logger.log(`loading CasparCG-media: '${clip}'`);

				return catch_casparcg_timeout(
					async () =>
						casparcg_connection.connection.play({
							channel: casparcg_connection.settings.channel,
							layer: casparcg_connection.settings.layers.media,
							clip,
							loop: this.loop,
							transition: get_casparcg_transition()
						}),
					"PLAY MEDIA"
				);
			} else {
				logger.log(`loading CasparCG-media in the background: '${this.media}'`);

				//  if the current stat is invisible, only load it in the background
				return catch_casparcg_timeout(
					async () =>
						casparcg_connection.connection.loadbg({
							channel: casparcg_connection.settings.channel,
							layer: casparcg_connection.settings.layers.media,
							clip: this.media,
							loop: this.loop,
							transition: get_casparcg_transition()
						}),
					"LOADBG MEDIA"
				);
			}
		}
	}

	protected hide_media(casparcg_connection: CasparCGConnection) {
		return catch_casparcg_timeout(
			async () =>
				// fade-out the media
				casparcg_connection.connection.play({
					/* eslint-disable @typescript-eslint/naming-convention */
					channel: casparcg_connection.settings.channel,
					layer: casparcg_connection.settings.layers.media,
					clip: "EMPTY",
					transition: get_casparcg_transition()
					/* eslint-enable @typescript-eslint/naming-convention */
				}),
			"STOP - hide media"
		);
	}

	private play_template(casparcg_connection: CasparCGConnection) {
		const template = this.get_template(!!casparcg_connection.settings.stageview);

		// if a template was specified, load it
		if (template !== undefined) {
			logger.log(`loading CasparCG-template: '${template.template}'`);
			logger.debug(`with data: ${JSON.stringify(template.data)}`);

			return catch_casparcg_timeout(
				async () =>
					casparcg_connection.connection.cgAdd({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: casparcg_connection.settings.channel,
						layer: casparcg_connection.settings.layers.template,
						cgLayer: 0,
						playOnLoad: casparcg.visibility,
						template: template.template,
						// escape quotation-marks by hand, since the old chrome-version of CasparCG appears to have a bug
						data: JSON.stringify(
							JSON.stringify(template.data, (_key, val: unknown) => {
								if (typeof val === "string") {
									return val.replaceAll('"', "\\u0022").replaceAll("\n", "\\n");
								} else {
									return val;
								}
							})
						)
						/* eslint-enable @typescript-eslint/naming-convention */
					}),
				"PLAY TEMPLATE"
			);
		} else {
			logger.log("clearing CasparCG-template");

			// if not, clear the previous template
			return catch_casparcg_timeout(
				async () =>
					casparcg_connection.connection.play({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: casparcg_connection.settings.channel,
						layer: casparcg_connection.settings.layers.template,
						clip: "EMPTY",
						transition: get_casparcg_transition()
						/* eslint-enable @typescript-eslint/naming-convention */
					}),
				"CLEAR TEMPLATE"
			);
		}
	}

	update_template(casparcg_connection: CasparCGConnection) {
		const template = this.get_template(!!casparcg_connection.settings.stageview);

		if (template !== undefined) {
			logger.log(
				`updating CasparCG-template: '${template.template}': ${JSON.stringify(template.data)}`
			);

			void catch_casparcg_timeout(
				async () =>
					casparcg_connection.connection.cgUpdate({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: casparcg_connection.settings.channel,
						layer: casparcg_connection.settings.layers.template,
						cgLayer: 0,
						// escape quotation-marks by hand, since the old chrome-version of CasparCG appears to have a bug
						data: stringify_json_for_tempalte(template.data)
						// /* eslint-enable @typescript-eslint/naming-convention */
					}),
				"UPDATE TEMPLATE"
			);
		}
	}

	set_visibility(visibility: boolean, casparcg_connection?: CasparCGConnection): Promise<unknown> {
		casparcg.visibility = visibility;

		const connections = casparcg_connection ? [casparcg_connection] : casparcg.casparcg_connections;

		return Promise.allSettled(
			connections.map((connection) => {
				if (visibility) {
					return Promise.allSettled([
						this.play_media(connection),

						catch_casparcg_timeout(
							async () =>
								connection.connection.cgPlay({
									/* eslint-disable @typescript-eslint/naming-convention */
									channel: connection.settings.channel,
									layer: connection.settings.layers.template,
									cgLayer: 0
									/* eslint-enable @typescript-eslint/naming-convention */
								}),
							"CG PLAY - show template"
						)
					]);
				} else {
					const promises: Promise<unknown>[] = [
						// stop the template-layer
						catch_casparcg_timeout(
							async () =>
								connection.connection.cgStop({
									/* eslint-disable @typescript-eslint/naming-convention */
									channel: connection.settings.channel,
									layer: connection.settings.layers.template,
									cgLayer: 0
									/* eslint-enable @typescript-eslint/naming-convention */
								}),
							"CG STOP - hide template"
						)
					];

					if (connection.settings.layers.media !== undefined) {
						promises.push(this.hide_media(connection));
					}

					return Promise.allSettled(promises);
				}
			})
		);
	}

	protected casparcg_navigate(): Promise<unknown>[] {
		logger.debug(`jumping CasparCG-template: slide '${this.active_slide}'`);

		return casparcg.casparcg_connections.map((casparcg_connection) => {
			const promises = [];

			// if the item has multiple media-files, load the new one
			if (this.multi_media) {
				promises.push(this.play_media(casparcg_connection));
			}

			// jump to the slide-number in casparcg
			return catch_casparcg_timeout(
				async () =>
					casparcg_connection.connection.cgUpdate({
						/* eslint-disable @typescript-eslint/naming-convention */
						channel: casparcg_connection.settings.channel,
						layer: casparcg_connection.settings.layers.template,
						cgLayer: 0,
						data: stringify_json_for_tempalte<TemplateSlideJump>({
							command: "jump",
							slide: this.active_slide
						})
						/* eslint-enable @typescript-eslint/naming-convention */
					}),
				"CG JUMP - jumping to template-slide"
			);
		});
	}

	protected abstract validate_props(props: ItemProps): boolean;

	abstract get props(): ItemProps;

	abstract get playlist_item(): ClientPlaylistItem;

	abstract get media(): string;

	get multi_media(): boolean {
		return false;
	}

	abstract get loop(): boolean;

	abstract get_template(stageview: boolean): Template | undefined;

	get displayable(): boolean {
		return this.is_displayable;
	}

	abstract get_markdown_export_string(full: boolean): string;
}

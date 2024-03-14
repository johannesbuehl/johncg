import path from "path";

import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";
import SongFile from "./SongFile.ts";
import type { ItemPartClient, LyricPart, LyricPartClient, TitlePart } from "./SongFile.ts";

import Config from "../config.ts";
import { ClipInfo } from "casparcg-connection";

export interface SongTemplate {
	template: "JohnCG/Song";
	data: SongTemplateData;
}

export interface SongProps extends ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type?: "Song";
	FileName: string;
	VerseOrder?: string[];
	Language?: number;
	PrimaryLanguage?: number;
	template?: SongTemplate;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface TitleSlide extends TitlePart {}

export interface LyricSlide {
	type: "lyric";
	data: string[][];
}

export type ItemSlide = LyricSlide | TitleSlide;

export interface SongTemplateData {
	slides: ItemSlide[];
	languages: number[];
	slide: number;
}

export type SongPartClient = ItemPartClient & { start_index: number };

export interface ClientSongSlides extends ClientItemSlidesBase {
	type: "Song";
	slides: SongPartClient[];
	template: SongTemplate;
}

export default class Song extends PlaylistItemBase {
	protected item_props: SongProps;

	// amount of slides this element has
	protected slide_count: number = 0;
	// currently active slide-number
	private active_slide_number: number = 0;

	private languages: number[] = [];

	private song_file: SongFile = new SongFile();

	constructor(props: SongProps, casparcg_media_list: ClipInfo[]) {
		super();

		this.item_props = props;

		try {
			this.song_file = new SongFile(get_song_path(props.FileName));
		} catch (e) {
			// if the error is because the file doesn't exist, skip the rest of the loop iteration
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				console.error(`song '${props.FileName}' does not exist`);

				this.item_props.selectable = false;

				return;
			} else {
				throw e;
			}
		}

		// create the languages-array
		// initialize the array with all languages
		this.languages = Array.from(Array(this.song_file.languages).keys());

		// if there is a 'PrimaryLanguage' specified, move it to the first position
		if (this.item_props.PrimaryLanguage !== undefined) {
			const temp = this.languages.splice(this.item_props.PrimaryLanguage, 1);
			this.languages.unshift(...temp);
		}
		// if a 'Language' is specified, take only this one
		if (this.item_props.Language !== undefined) {
			this.languages = [this.languages[this.item_props.Language]];
		}

		// add the title-slide to the counter
		this.slide_count++;

		// count the slides
		for (const part of this.get_verse_order()) {
			// check wether the part is actually defined in the songfile
			try {
				this.slide_count += this.song_file.get_part(part).slides.length;
			} catch (e) {
				if (!(e instanceof ReferenceError)) {
					throw e;
				}
			}
		}

		// store the media
		this.item_props.media = [
			path_to_casparcg_media(
				this.song_file.metadata.BackgroundImage ?? "#00000000",
				casparcg_media_list
			)
		];

		// create the template data
		this.item_props.template = {
			template: "JohnCG/Song",
			data: this.create_template_data()
		};
	}

	get_verse_order(): string[] {
		if (this.item_props.VerseOrder !== undefined) {
			return this.item_props.VerseOrder;
		} else if (this.song_file?.metadata.VerseOrder !== undefined) {
			return this.song_file.metadata.VerseOrder;
		} else {
			return [];
		}
	}

	create_template_data(slide?: number) {
		slide = this.active_slide ?? this.validate_slide_number(slide);

		const return_object: SongTemplateData = {
			slide,
			slides: [this.song_file.part_title],
			languages: this.languages
		};

		// add the individual parts to the output-object
		for (const part_name of this.get_verse_order()) {
			let part: LyricPart | undefined = undefined;
			try {
				part = this.song_file.get_part(part_name);
			} catch (e) {
				if (!(e instanceof ReferenceError)) {
					throw e;
				}
			}

			// if a part is not available, skip it
			if (part !== undefined) {
				// add the individual slides of the part to the output object
				part.slides.forEach((slide) => {
					const slide_obj: LyricSlide = {
						type: "lyric",
						data: slide
					};

					return_object.slides.push(slide_obj);
				});
			}
		}

		return return_object;
	}

	/**
	 * set the slide-number as active
	 * @param slide
	 */
	set_active_slide(slide: number): number {
		slide = this.validate_slide_number(slide);

		this.active_slide_number = slide;

		return this.active_slide_number;
	}

	navigate_slide(steps: number): number {
		if (typeof steps !== "number") {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new TypeError(`steps ('${steps}') is no number`);
		}

		if (![-1, 1].includes(steps)) {
			throw new RangeError(`steps must be -1 or 1, but is ${steps}`);
		}

		const new_active_slide_number = this.active_slide + steps;
		let slide_steps = 0;

		// new active item has negative index -> roll over to the last slide of the previous element
		if (new_active_slide_number < 0) {
			slide_steps = -1;

			// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_slide_number >= this.slide_count) {
			slide_steps = 1;
		} else {
			this.active_slide_number = new_active_slide_number;
		}

		return slide_steps;
	}

	create_client_object_item_slides(): Promise<ClientSongSlides> {
		const return_item: ClientSongSlides = {
			type: "Song",
			title: this.item_props.Caption,
			slides: [
				{
					start_index: 0,
					...this.song_file.get_title_client(this.languages[0])
				}
			],
			media: this.props.media,
			template: this.props.template
		};

		let slide_counter: number = 1;

		for (const part_name of this.get_verse_order()) {
			let part: LyricPartClient | undefined = undefined;

			try {
				part = this.song_file.get_part_client(part_name);
			} catch (e) {
				if (!(e instanceof ReferenceError)) {
					throw e;
				}
			}

			// if a part is not available, skip it
			if (part !== undefined) {
				return_item.slides.push({
					...part,
					start_index: slide_counter
				});

				slide_counter += part.slides;
			}
		}

		return Promise.resolve(return_item);
	}

	get props(): SongProps {
		return this.item_props;
	}

	get active_slide(): number {
		return this.active_slide_number;
	}

	get template(): SongTemplate {
		const template = structuredClone(this.props.template);
		template.data.slide = this.active_slide;

		return template;
	}

	get media(): string | undefined {
		return this.props.media !== undefined ? this.props.media[0] : undefined;
	}
}

export function get_song_path(song_path: string): string {
	const return_path = path.isAbsolute(song_path)
		? song_path
		: path.resolve(Config.path.song, song_path);

	return return_path.replaceAll("\\", "/");
}

function path_to_casparcg_media(media: string, casparcg_media_list: ClipInfo[]): string {
	// test wether it is a color-string
	const test_rgb_string = media.match(/^#(?:(?:[\dA-Fa-f]{2}){3})$/);

	// if it is an rgb-string, put the alpha-value at the beginning (something something CasparCG)
	if (test_rgb_string) {
		return media;
	}

	// make it all uppercase and remove the extension to match casparcg-clips
	const req_name = media
		.replace(/\.[^(\\.]+$/, "")
		.replaceAll("\\", "/")
		.toUpperCase();

	// check all the casparcg-files, wether they contain a media-file that matches the path
	for (const m of casparcg_media_list) {
		const media_file = m.clip.toUpperCase().replace(/\\/, "/");

		if (req_name.endsWith(media_file)) {
			return m.clip;
		}
	}

	return "#00000000";
}

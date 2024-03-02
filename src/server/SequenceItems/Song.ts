import { ClientItemSlidesBase, ItemPropsBase, SequenceItemBase } from "./SequenceItem";
import SongFile, { ItemPartClient, LyricPart, LyricPartClient, TitlePart } from "./SongFile";
import path from "path";

import Config from "../config";

export interface SongTemplate {
	template: "JohnCG/Song";
	data: SongTemplateData;
}

export interface SongProps extends ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type: "Song";
	FileName: string;
	VerseOrder?: string[];
	Language?: number;
	PrimaryLanguage?: number;
	media?: string[];
	template?: SongTemplate;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface TitleSlide extends TitlePart {
}

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

export interface ClientSongSlides extends ClientItemSlidesBase {
	type: "Song"
	slides: ItemPartClient[];
	media_b64: string;
	template: SongTemplate;
}

export default class Song extends SequenceItemBase {
	protected item_props: SongProps;

	// amount of slides this element has
	protected slide_count: number = 0;
	// currently active slide-number
	private active_slide_number: number = 0;

	private languages: number[];

	private song_file: SongFile;

	constructor(props: SongProps) {
		super();

		this.item_props = props;

		try {
			this.song_file = new SongFile(get_song_path(props.FileName));
		} catch (e: unknown) {
			// if the error is because the file doesn't exist, skip the rest of the loop iteration
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				console.debug(`song '${props.FileName}' does not exist`);

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
		this.item_props.media = [this.get_background_image(this.song_file.metadata.BackgroundImage)];

		// create the template data
		this.item_props.template = {
			template: "JohnCG/Song",
			data: this.create_template_data()
		};
	}

	get_verse_order(): string[] {
		if (this.item_props.VerseOrder !== undefined) {
			return this.item_props.VerseOrder;
		} else if (this.song_file.metadata.VerseOrder !== undefined) {
			return this.song_file.metadata.VerseOrder;
		} else {
			return [];
		}
	}

	create_template_data(slide?: number) {
		slide = this.active_slide ?? this.validate_slide_number(slide);

		const return_object: SongTemplateData = {
			slide,
			slides: [
				this.song_file.part_title
			],
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
			if (part !== undefined){
				// add the individual slides of the part to the output object
				part.slides.forEach((slide) => {

					const slide_obj: LyricSlide = {
						type: part.type,
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

	async create_client_object_item_slides(): Promise<ClientSongSlides> {
		const return_item: ClientSongSlides = {
			type: "Song",
			title: this.item_props.Caption,
			slides: [
				this.song_file.get_title_client()
			],
			media_b64: await this.get_media_b64(true),
			template: this.props.template
		};

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
			if (part !== undefined){
				return_item.slides.push(part);
			}
		}

		return return_item;
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

	get media(): string {
		return this.props.media[0];
	}
}

export function get_song_path(song_path: string): string {
	const return_path = path.isAbsolute(song_path) ? song_path : path.resolve(Config.path.song, song_path);

	return return_path.replaceAll("\\", "/");
}

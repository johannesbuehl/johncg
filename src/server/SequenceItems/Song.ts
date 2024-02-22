import { ClientItemSlidesBase, ItemPropsBase, ItemRenderObjectBase, SequenceItemBase } from "./SequenceItem";
import SongFile, { ItemPartClient, LyricPart, LyricPartClient, TitlePart } from "./SongFile";
import path from "path";

import Config from "../config";

export interface SongProps extends ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type: "Song";
	FileName: string;
	VerseOrder?: string[];
	Language?: number;
	PrimaryLanguage?: number;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface TitleSlide extends TitlePart {
}

export interface LyricSlide {
	type: "lyric";
	data: string[][];
}

export type ItemSlide = LyricSlide | TitleSlide;

export interface SongRenderObject extends ItemRenderObjectBase {
	type: "Song";
	slides: ItemSlide[];
	languages: number[];
}

export interface ClientSongSlides extends ClientItemSlidesBase {
	type: "Song"
	slides: ItemPartClient[];
	slides_template: SongRenderObject & { mute_transition: true; };
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
		} catch (e) {
			// if the error is because the file doesn't exist, skip the rest of the loop iteration
			if (e.code === "ENOENT") {
				console.debug(`song '${props.FileName}' does not exist`);
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

	async create_render_object(proxy?: boolean, slide?: number): Promise<SongRenderObject> {
		if (slide === undefined) {
			slide = this.active_slide;
		}
		
		slide = this.validate_slide_number(slide);

		const return_object: SongRenderObject = {
			type: "Song",
			slides: [
				this.song_file.part_title
			],
			slide,
			languages: this.languages,
			background_image: await this.get_background_image(proxy)
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
				for (const slide of part.slides) {
					return_object.slides.push({
						type: part.type,
						data: slide
					});
				}
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
			item: this.item_props.item,
			slides: [
				this.song_file.get_title_client()
			],
			slides_template: {
				...await this.create_render_object(true, 0),
				mute_transition: true
			}
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

	protected async get_background_image(proxy?: boolean): Promise<string> {
		// check wether the images have yet been laoded
		if (this.props.BackgroundImage === undefined) {
			await this.load_background_images(this.song_file.metadata.BackgroundImage);
		}

		return this.props.BackgroundImage![proxy ? "proxy" : "orig"];
	}

	get active_slide(): number {
		return this.active_slide_number;
	}
}
function get_song_path(song_path: string): string {
	return path.join(Config.path.song, song_path);
}

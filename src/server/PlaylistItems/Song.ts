import { get_song_path } from "../config.ts";
import { PlaylistItemBase, recurse_check } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";
import SongFile from "./SongFile.ts";
import type { ItemPart, LyricPart } from "./SongFile.ts";

import { ClipInfo } from "casparcg-connection";

export interface SongTemplate {
	template: "JohnCG/Song";
	data: SongTemplateData;
}

export interface SongProps extends ItemPropsBase {
	type: "song";
	file: string;
	verse_order?: string[];
	languages?: number[];
}

export interface SongTemplateData {
	parts: ItemPart[];
	languages?: number[];
	slide: number;
}

export interface ClientSongSlides extends ClientItemSlidesBase {
	type: "song";
	template: SongTemplate;
}

export default class Song extends PlaylistItemBase {
	protected item_props: SongProps;

	// amount of slides this element has
	protected slide_count: number = 0;
	// currently active slide-number
	private active_slide_number: number = 0;

	private song_file: SongFile = new SongFile();

	protected media_casparcg: string;

	private casparcg_media_list: ClipInfo[];

	constructor(props: SongProps, casparcg_media_list: ClipInfo[]) {
		super();

		this.casparcg_media_list = casparcg_media_list;

		this.item_props = props;

		this.is_selectable = this.validate_props(props);

		if (this.selectable) {
			try {
				this.song_file = new SongFile(get_song_path(props.file));
			} catch (e) {
				// if the error is because the file doesn't exist, skip the rest of the loop iteration
				if (e instanceof Error && "code" in e && e.code === "ENOENT") {
					console.error(`song '${props.file}' does not exist`);

					this.is_selectable = false;

					return;
				} else {
					throw e;
				}
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
	}

	get_verse_order(): string[] {
		if (this.item_props.verse_order !== undefined) {
			return this.item_props.verse_order;
		} else if (this.song_file?.metadata.VerseOrder !== undefined) {
			return this.song_file.metadata.VerseOrder;
		} else {
			return [];
		}
	}

	create_template_data() {
		const return_object: SongTemplateData = {
			slide: this.active_slide,
			parts: [this.song_file.part_title],
			languages: this.props.languages ?? this.song_file.languages
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
				return_object.parts.push(part);
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
		return Promise.resolve({
			type: "song",
			caption: this.item_props.caption,
			media: this.media,
			template: this.template
		});
	}

	protected validate_props(props: SongProps): boolean {
		const template: SongProps = {
			type: "song",
			caption: "Template",
			color: "Template",
			file: "template"
		};

		let result = props.type === "song";

		if (props.languages) {
			result &&= Array.isArray(props.languages);

			if (result) {
				props.languages.forEach((ele) => {
					result &&= typeof ele === "number";
				});
			}
		}

		if (props.verse_order) {
			result &&= Array.isArray(props.verse_order);

			if (result) {
				props.verse_order.forEach((ele) => {
					result &&= typeof ele === "string";
				});
			}
		}

		return result && recurse_check(props, template);
	}

	get props(): SongProps {
		const props = structuredClone(this.item_props);

		// if the languages are the same as in the song-file, remove them from the returned props
		if (props.languages?.every((lang, index) => lang === this.song_file.languages[index])) {
			delete props.languages;
		}

		return props;
	}

	get active_slide(): number {
		return this.active_slide_number;
	}

	get playlist_item(): SongProps & { selectable: boolean } {
		return { ...this.props, selectable: this.selectable };
	}

	get media(): string {
		return this.path_to_casparcg_media(this.song_file.metadata.BackgroundImage);
	}

	get loop(): boolean {
		return true;
	}

	get template(): SongTemplate {
		const template: SongTemplate = {
			template: "JohnCG/Song",
			data: this.create_template_data()
		};

		template.data.slide = this.active_slide;

		return template;
	}

	private path_to_casparcg_media(media?: string): string {
		if (media !== undefined) {
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
			for (const m of this.casparcg_media_list) {
				const media_file = m.clip.toUpperCase().replace(/\\/, "/");

				if (req_name.endsWith(media_file)) {
					return m.clip;
				}
			}
		}

		return "#00000000";
	}
}

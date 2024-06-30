import { TemplateSlideJump } from "../CasparCGConnection.ts";
import Config from "../config/config.ts";
import { recurse_object_check } from "../lib.ts";
import { logger } from "../logger.ts";
import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemBase, ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";
import SongFile from "./SongFile/SongFile.ts";
import type { Chords, ItemPart, LyricPart } from "./SongFile/SongFile.ts";

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

export type ClientSongItem = SongProps & ClientItemBase;

export type SongTemplateMessage = SongTemplateData | TemplateSlideJump;

export interface SongTemplateData {
	command: "data";
	parts: ItemPart[];
	languages?: number[];
	chords?: Chords;
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

	private song_file: SongFile;

	protected media_casparcg: string;

	constructor(props: SongProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);

		if (this.is_displayable) {
			this.cache_song_file();

			this.recalculate_slide_count();
		}
	}

	recalculate_slide_count() {
		// add the title-slide to the counter
		this.slide_count = 1;

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
			command: "data",
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

		void this.casparcg_navigate();

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

		// new active slide has negative index -> roll over to the last slide of the previous item
		if (new_active_slide_number < 0) {
			slide_steps = -1;

			// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_slide_number >= this.slide_count) {
			slide_steps = 1;

			// new active slide is from this object
		} else {
			this.active_slide_number = new_active_slide_number;

			// display the slide
			void this.casparcg_navigate();
		}

		return slide_steps;
	}

	create_client_object_item_slides(): Promise<ClientSongSlides> {
		let title: string = "";

		if (this.song_file.metadata.ChurchSongID !== undefined) {
			title += `${this.song_file.metadata.ChurchSongID} - `;
		}

		title += this.song_file.metadata.Title[this.props.languages?.[0] ?? 0];

		return Promise.resolve({
			type: "song",
			caption: this.item_props.caption,
			title,
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

		return result && recurse_object_check(props, template);
	}

	get props(): SongProps {
		const props = structuredClone(this.item_props);

		// if the languages are the same as in the song-file, remove them from the returned props
		if (this.song_file?.languages?.every((lang, index) => lang === props.languages?.[index])) {
			delete props.languages;
		}

		return props;
	}

	get active_slide(): number {
		return this.active_slide_number;
	}

	get playlist_item(): SongProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
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

	cache_song_file() {
		try {
			this.song_file = new SongFile(Config.get_path("song", this.props.file));
		} catch (e) {
			// if the error is because the file doesn't exist, skip the rest of the loop iteration
			if (e instanceof Error && "code" in e && e.code === "ENOENT") {
				logger.error(`can't open song: '${this.props.file}' does not exist`);

				this.is_displayable = false;

				return;
			} else {
				throw e;
			}
		}
	}

	private path_to_casparcg_media(media?: string): string {
		if (media !== undefined) {
			// check, wether it is a songbeamer-video-path
			if (media.slice(0, 11).toLowerCase() === "bgvideos://") {
				media = media.slice(11);
			} else {
				// test wether it is a color-string
				const test_rgb_string = media.match(/^#(?:(?:[\dA-Fa-f]{2}){3})$/);

				// if it is an rgb-string, put the alpha-value at the beginning (something something CasparCG)
				if (test_rgb_string) {
					return media;
				}
			}

			// make it all uppercase and remove the extension to match CasparCG-clips
			const req_name = media
				.replace(/\.[^(\\.]+$/, "")
				.replaceAll("\\", "/")
				.toUpperCase();

			return req_name;
		}

		return "#00000000";
	}

	get_markdown_export_string(full: boolean): string {
		let return_string = `# Song: "${this.props.caption}" (`;

		if (this.song_file.metadata.ChurchSongID !== undefined) {
			return_string += `${this.song_file.metadata.ChurchSongID}: `;
		}

		// const language_index = this.props.languages ? this.props.languages[0] : 0;
		const languages = this.props.languages ?? this.song_file.languages;

		return_string += `${this.song_file.metadata.Title[languages[0]]})\n\n`;

		if (full) {
			const parts = this.props.verse_order ?? this.song_file.metadata.VerseOrder;

			parts.forEach((part) => {
				return_string += `**${part}**  `;

				this.song_file.get_part(part).slides.forEach((slide) => {
					slide.forEach((line) => {
						languages.forEach((language_index) => {
							if (line[language_index].length > 0) {
								if (language_index !== languages[0]) {
									return_string += `\n*${line[language_index]}*  `;
								} else {
									return_string += `\n${line[language_index]}  `;
								}
							}
						});
					});
				});

				return_string += "\n\n";
			});
		}

		return return_string;
	}
}

import {
	ClientItemSlidesBase,
	ItemPropsBase,
	PlaylistItemBase,
	recurse_check
} from "./PlaylistItem";

export type BibleFile = Record<string, { name: string; books: Book[] }[]>;

export interface Book {
	name: string;
	id: string;
	chapters: number[];
}

export interface BibleProps extends ItemPropsBase {
	type: "bible";
	book_id: string;
	chapters: Record<number, number[]>;
}

export interface BibleJSON {
	text: string;
	mute_transition?: boolean;
}

export interface BibleTemplate {
	template: string;
	data: BibleJSON;
}

export interface ClientBibleSlides extends ClientItemSlidesBase {
	type: "bible";
	template: BibleTemplate;
}

export default class Bible extends PlaylistItemBase {
	protected item_props: BibleProps;

	protected slide_count: number = 0;

	constructor(props: BibleProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);
	}

	create_client_object_item_slides(): Promise<ClientBibleSlides> {
		return Promise.resolve({
			type: "bible",
			caption: this.props.caption,
			media: undefined,
			template: this.template
		});
	}

	set_active_slide(): number {
		return 0;
	}

	navigate_slide(steps: number): number {
		return steps;
	}

	protected validate_props(props: BibleProps): boolean {
		const template: BibleProps = {
			type: "bible",
			caption: "Template",
			color: "Template",
			book_id: "Template",
			chapters: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				0: [0]
			}
		};

		return props.type === "bible" && recurse_check(props, template);
	}

	get active_slide(): number {
		return 0;
	}

	get props(): BibleProps {
		return this.item_props;
	}

	get playlist_item(): BibleProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
	}

	get media(): string {
		return "#00000000";
	}

	get loop(): boolean {
		return false;
	}

	get template(): BibleTemplate {
		return {
			template: "JohnCG/Bible",
			data: {
				text: create_bible_citation_string(this.props.book_id, this.props.chapters)
			}
		};
	}
}

export function create_bible_citation_string(book_id: string, chapters: BibleProps["chapters"]) {
	// add the individual chapters
	const chapter_strings = Object.entries(chapters).map(([chapter, verses]): string => {
		// stop the loop-iteration, if there are no verses defined
		if (verses.length === 0) {
			return `${chapter}`;
		}

		const verse_range: { start: number; last: number } = {
			start: verses[0],
			last: verses[0]
		};

		// add the individual verses
		const verse_strings: string[] = [];

		// const verses = verses.map((verse, index, arr): string => {
		for (let index = 1; index <= verses.length; index++) {
			const verse = verses[index];

			// if the current verse is not a direct successor of the last one, return the previous verse_range
			if (verse !== verse_range.last + 1) {
				// if in the verse-range start and last are the same, return them as a single one
				if (verse_range.start === verse_range.last) {
					verse_strings.push(verse_range.last.toString());
				} else {
					verse_strings.push(`${verse_range.start}-${verse_range.last}`);
				}

				verse_range.start = verse;
			}

			verse_range.last = verse;
		}

		return `${chapter},${verse_strings.filter(Boolean).join(".")}`;
	});

	return `${book_id} ${chapter_strings.join("; ")}`;
}

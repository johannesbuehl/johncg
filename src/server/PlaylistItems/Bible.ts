import { create_bible_citation_string, recurse_object_check } from "../lib";
import {
	type ClientItemSlidesBase,
	type ItemPropsBase,
	PlaylistItemBase,
	ClientItemBase
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

export type ClientBibleItem = BibleProps & ClientItemBase;

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

		return props.type === "bible" && recurse_object_check(props, template);
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

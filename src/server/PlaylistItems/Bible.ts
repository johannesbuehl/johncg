import { JSONSchemaType } from "ajv";

import { ajv } from "../lib";
import {
	type ClientItemSlidesBase,
	type ItemPropsBase,
	PlaylistItemBase,
	ClientItemBase
} from "./PlaylistItem";
import Config from "../config/config";

export interface BibleFile {
	name: string;
	citation_style: string;
	parts: Record<string, { name: string; books: Book[] }[]>;
}

export interface Book {
	name: string;
	id: string;
	chapters: number[];
}

export interface BibleProps extends ItemPropsBase {
	type: "bible";
	book_id: string;
	chapters: Record<string, number[]>;
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

const bible_props_schema: JSONSchemaType<BibleProps> = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		type: {
			type: "string",
			const: "bible"
		},
		caption: {
			type: "string"
		},
		color: {
			type: "string"
		},
		book_id: {
			type: "string"
		},
		chapters: {
			type: "object",
			required: [],
			// eslint-disable-next-line @typescript-eslint/naming-convention
			additionalProperties: {
				type: "array",
				items: {
					type: "number"
				}
			}
		}
	},
	required: ["book_id", "caption", "chapters", "color", "type"],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	additionalProperties: false
};
const validate_bible_props = ajv.compile(bible_props_schema);
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
			title: Config.create_bible_citation_string(this.props.book_id, this.props.chapters),
			caption: this.props.caption,
			media: undefined,
			template: this.get_template()
		});
	}

	set_active_slide(): number {
		return 0;
	}

	navigate_slide(steps: number): number {
		return steps;
	}

	protected validate_props = validate_bible_props;

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

	get_template(): BibleTemplate {
		return {
			template: "JohnCG/Bible",
			data: {
				text: Config.create_bible_citation_string(this.props.book_id, this.props.chapters)
			}
		};
	}

	get_markdown_export_string(): string {
		return `# Bible: "${this.props.caption}" (${Config.create_bible_citation_string(this.props.book_id, this.props.chapters)})

`;
	}
}

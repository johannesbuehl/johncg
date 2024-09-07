import { JSONSchemaType } from "ajv";
import { PlaylistItemBase } from "./PlaylistItem";
import type { ClientItemBase, ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem";
import { ajv } from "../lib";

export interface CommentProps extends ItemPropsBase {
	type: "comment";
}

export type ClientCommentItem = CommentProps & ClientItemBase;

export interface ClientCommentSlides extends ClientItemSlidesBase {
	type: "comment";
}

const comment_props_schema: JSONSchemaType<CommentProps> = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		type: {
			type: "string",
			const: "comment"
		},
		caption: {
			type: "string"
		},
		color: {
			type: "string"
		}
	},
	required: ["caption", "color", "type"],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	additionalProperties: false
};
const validate_comment_props = ajv.compile(comment_props_schema);

export default class Comment extends PlaylistItemBase {
	protected item_props: CommentProps;

	protected slide_count: number = 0;

	constructor(props: CommentProps) {
		super();

		this.item_props = props;

		this.is_displayable = false;
	}

	create_client_object_item_slides(): Promise<ClientCommentSlides> {
		return Promise.resolve({
			type: "comment",
			caption: this.props.caption,
			title: this.props.caption,
			media: undefined
		});
	}

	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}

	set_active_slide(): number {
		return 0;
	}

	protected validate_props = validate_comment_props;

	get active_slide(): number {
		return -1;
	}

	get props(): CommentProps {
		return this.item_props;
	}

	get playlist_item(): CommentProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
	}

	get media(): undefined {
		return undefined;
	}

	get loop(): undefined {
		return undefined;
	}

	get_template(): undefined {
		return undefined;
	}

	get displayable(): boolean {
		return false;
	}

	get_markdown_export_string(): string {
		return `# Comment: "${this.props.caption}"\n\n`;
	}
}

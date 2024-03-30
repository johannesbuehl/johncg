import { PlaylistItemBase, recurse_check } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";

export interface CommentProps extends ItemPropsBase {
	type: "comment";
}

export interface ClientCommentSlides extends ClientItemSlidesBase {
	type: "comment";
}

export default class Comment extends PlaylistItemBase {
	protected item_props: CommentProps;

	protected slide_count: number = 0;

	constructor(props: CommentProps) {
		super();

		this.item_props = props;

		this.is_selectable = false;
	}

	create_client_object_item_slides(): Promise<ClientCommentSlides> {
		return Promise.resolve({
			type: "comment",
			caption: this.props.caption,
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

	protected validate_props(props: CommentProps): boolean {
		const template: CommentProps = {
			type: "comment",
			caption: "Template",
			color: "Template"
		};

		return props.type === "comment" && recurse_check(props, template);
	}

	get active_slide(): number {
		return -1;
	}

	get props(): CommentProps {
		return this.item_props;
	}

	get playlist_item(): CommentProps & { selectable: boolean } {
		return { ...this.props, selectable: this.selectable };
	}

	get media(): undefined {
		return undefined;
	}

	get loop(): undefined {
		return undefined;
	}

	get template(): undefined {
		return undefined;
	}

	get selectable(): boolean {
		return false;
	}
}

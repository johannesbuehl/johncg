import { ClientItemSlidesBase, ItemProps, ItemPropsBase, SequenceItemBase } from "./SequenceItem";

export interface CommentProps extends ItemPropsBase {
	type: "Comment";
	selectable: false;
}

export interface ClientCommentSlides extends ClientItemSlidesBase {
	type: "Comment";
}

export default class Comment extends SequenceItemBase {
	protected item_props: CommentProps;

	protected slide_count: number = 0;

	constructor(props: CommentProps) {
		super();

		this.item_props = props;

		this.item_props.selectable = false;
	}
	
	create_client_object_item_slides(): Promise<ClientCommentSlides> {
		return Promise.resolve({
			type: "Comment",
			title: this.props.Caption,
			item: this.props.item,
			slides: []
		});
	}
	
	create_render_object(): Promise<undefined> {
		return Promise.resolve<undefined>(undefined);
	}
	
	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}
	
	set_active_slide(): number {
		return 0;
	}
	
	get active_slide(): number {
		return -1;
	}

	get props(): ItemProps {
		return this.item_props;
	}

	get template(): undefined {
		return undefined;
	}
}
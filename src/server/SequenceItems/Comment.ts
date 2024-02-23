import { ClientItemSlidesBase, ItemProps, ItemPropsBase, ItemRenderObjectBase, SequenceItemBase } from "./SequenceItem";

export interface CommentProps extends ItemPropsBase {
	type: "Comment";
	selectable: false;
}

export interface ClientCommentSlides extends ClientItemSlidesBase {
	type: "Comment";
	slides_template: CommentRenderObject & { mute_transition: true; };
}

export interface CommentRenderObject extends ItemRenderObjectBase {
	caspar_type: "media";
}

export default class Comment extends SequenceItemBase {
	protected item_props: CommentProps;

	protected slide_count: number = 0;

	constructor(props: CommentProps) {
		super();

		this.item_props = props;

		this.item_props.selectable = false;
	}
	
	async create_client_object_item_slides(): Promise<ClientCommentSlides> {
		return {
			type: "Comment",
			title: this.props.Caption,
			item: this.props.item,
			slides: [],
			slides_template: {
				caspar_type: "media",
				slides: [],
				slide: 0,
				mute_transition: true
			}
		};
	}
	
	async create_render_object(): Promise<undefined> {
		return undefined;
	}
	
	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}
	
	set_active_slide(): number {
		return 0;
	}

	protected async get_background_image(): Promise<string> {
		return "";
	}
	
	get active_slide(): number {
		return -1;
	}

	get props(): ItemProps {
		return this.item_props;
	}
}
import { ClientItemSlides, ItemProps, ItemPropsBase, ItemRenderObjectBase, SequenceItemBase } from "./SequenceItem";

export interface CommentProps extends ItemPropsBase {
	selectable: false;
}

export default class Comment extends SequenceItemBase {
	protected item_props: CommentProps;

	protected SlideCount: number;

	constructor(props: CommentProps) {
		super();

		this.item_props = props;

		this.item_props.selectable = false;
	}
	
	async create_client_object_item_slides(): Promise<ClientItemSlides> {
		return undefined;
	}
	
	async create_render_object(): Promise<ItemRenderObjectBase> {
		return undefined;
	}
	
	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}
	
	set_active_slide(): number {
		return undefined;
	}

	protected async get_background_image(): Promise<string> {
		return undefined;
	}
	
	get active_slide(): number {
		return undefined;
	}

	get props(): ItemProps {
		return this.item_props;
	}
}
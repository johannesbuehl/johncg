import { ClientItemSlides, ItemProps, ItemPropsBase, SequenceItemBase } from "./SequenceItem";

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
	
	create_client_object_item_slides(): ClientItemSlides {
		return undefined;
	}
	
	create_render_object() {
		return undefined;
	}
	
	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}
	
	set_active_slide(): number {
		return undefined;
	}
	
	get active_slide(): number {
		return undefined;
	}

	get props(): ItemProps {
		return this.item_props;
	}
}
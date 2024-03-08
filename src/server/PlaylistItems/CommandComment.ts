import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";

export interface CommandCommentTemplate {
	template: string;
	data: object | undefined;
}

export interface CommandCommentProps extends ItemPropsBase {
	type: "CommandComment";
	template: CommandCommentTemplate;
}

export interface ClientCommandCommentSlides extends ClientItemSlidesBase {
	type: "CommandComment";
	media_b64?: undefined;
	template: CommandCommentTemplate;
}

export default class CommandComment extends PlaylistItemBase {
	protected item_props: CommandCommentProps;

	protected slide_count: number = 0;

	constructor(props: CommandCommentProps) {
		super();

		this.item_props = props;

		this.item_props.Caption = `Template: "${this.props.template.template.toUpperCase()}"`;

		if (this.props.template.data) {
			this.item_props.Caption += ` (${JSON.stringify(this.props.template.data, undefined, " ").slice(3, -2)})`;
		}
	}

	create_client_object_item_slides(): Promise<ClientCommandCommentSlides> {
		const { Caption: title, template } = this.props;

		return Promise.resolve({
			type: "CommandComment",
			title,
			item: this.props.item,
			slides: [],
			template
		});
	}

	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}

	set_active_slide(): number {
		return 0;
	}

	get active_slide(): number {
		return 0;
	}

	get props(): CommandCommentProps {
		return this.item_props;
	}

	get template(): CommandCommentTemplate {
		return this.props.template;
	}
}

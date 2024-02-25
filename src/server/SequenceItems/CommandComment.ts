import { ClientItemSlides, ClientItemSlidesBase, ItemPropsBase, ItemRenderObjectBase, SequenceItemBase } from "./SequenceItem";

export interface CommandCommentProps extends ItemPropsBase {
	type: "CommandComment";
	template: string;
	data?: object;
}

export interface ClientCommandCommentSlides extends ClientItemSlidesBase {
	type: "CommandComment";
	slides_template: CommandCommentRenderObject & { mute_transition: true };
}

export interface CommandCommentRenderObject extends ItemRenderObjectBase {
	type: "CommandComment";
	caspar_type: "template";
	template: {
		template: string;
		data: object;
	};
}

export default class CommandComment extends SequenceItemBase {
	protected item_props: CommandCommentProps;

	protected slide_count: number = 0;

	constructor(props: CommandCommentProps) {
		super();

		this.item_props = props;

		this.item_props.Caption = `Template: "${this.props.template.toUpperCase()}"`;

		if (this.props.data) {
			this.item_props.Caption += ` (${JSON.stringify(this.props.data, undefined, " ").slice(3, -2)})`;
		}
	}
	
	async create_client_object_item_slides(): Promise<ClientItemSlides> {
		return {
			type: "CommandComment",
			title: this.props.Caption,
			item: this.props.item,
			slides: [],
			slides_template: {
				...await this.create_render_object(),
				mute_transition: true
			}
		};
	}
	
	create_render_object(): Promise<CommandCommentRenderObject> {
		return new Promise((resolve) => {
			resolve({
				type: "CommandComment",
				caspar_type: "template",
				slide: 0,
				slides: [{
					template: this.props.template,
					data: this.props.data
				}],
				template: {
					template: this.props.template,
					data: this.props.data
				}
			});
		});
	}
	
	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}
	
	set_active_slide(): number {
		return 0;
	}

	protected get_background_image(): Promise<string> {
		return new Promise((resolve) => resolve(""));
	}
	
	get active_slide(): number {
		return 0;
	}

	get props(): CommandCommentProps {
		return this.item_props;
	}
}
import { PlaylistItemBase, recurse_check } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";

export interface TemplateTemplate {
	template: string;
	data?: object;
}

export interface TemplateProps extends ItemPropsBase {
	type: "template";
	template: TemplateTemplate;
}

export interface ClientTemplateSlides extends ClientItemSlidesBase {
	type: "template";
	template: TemplateTemplate;
}

export default class TemplateItem extends PlaylistItemBase {
	protected item_props: TemplateProps;

	protected slide_count: number = 0;

	protected slide: undefined;

	constructor(props: TemplateProps) {
		super();

		this.item_props = props;

		this.is_selectable = this.validate_props(props);
	}

	create_client_object_item_slides(): Promise<ClientTemplateSlides> {
		return Promise.resolve({
			type: "template",
			caption: this.props.caption,
			media: undefined,
			template: this.template
		});
	}

	navigate_slide(steps: number): number {
		// return the steps, since there are no slides to navigate
		return steps;
	}

	set_active_slide(): number {
		return 0;
	}

	protected validate_props(props: TemplateProps): boolean {
		const template: TemplateProps = {
			type: "template",
			caption: "Template",
			color: "Template",
			template: {
				template: "Template"
			}
		};

		let result = props.type === "template";

		result &&= props.template.data ? typeof props.template.data === "object" : true;

		return result && recurse_check(props, template);
	}

	get active_slide(): number {
		return 0;
	}

	get props(): TemplateProps {
		return this.item_props;
	}

	get playlist_item(): TemplateProps & { selectable: boolean } {
		return { ...this.props, selectable: this.selectable };
	}

	get media(): string {
		return "#00000000";
	}

	get loop(): boolean {
		return false;
	}

	get template(): TemplateTemplate {
		return this.props.template;
	}
}

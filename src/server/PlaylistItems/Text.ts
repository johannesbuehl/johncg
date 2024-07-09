import { recurse_object_check } from "../lib";
import {
	type ClientItemSlidesBase,
	type ItemPropsBase,
	PlaylistItemBase,
	ClientItemBase
} from "./PlaylistItem";

export interface TextProps extends ItemPropsBase {
	type: "text";
	text: string;
}

export type ClientTextItem = TextProps & ClientItemBase;

export interface TextJSON {
	text: string;
	mute_transition?: boolean;
}

export interface ClientTextSlides extends ClientItemSlidesBase {
	type: "text";
	template: {
		template: string;
		data: TextJSON;
	};
}

export default class Text extends PlaylistItemBase {
	protected item_props: TextProps;

	protected slide_count: number = 0;

	constructor(props: TextProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);
	}

	create_client_object_item_slides(): Promise<ClientTextSlides> {
		return Promise.resolve({
			type: "text",
			caption: this.props.caption,
			title: this.props.text.slice(0, 100),
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

	protected validate_props(props: TextProps): boolean {
		const template: TextProps = {
			type: "text",
			caption: "Template",
			color: "Template",
			text: "Template"
		};

		return props.type === "text" && recurse_object_check(props, template);
	}

	get active_slide(): number {
		return 0;
	}

	get props(): TextProps {
		return this.item_props;
	}

	get playlist_item(): TextProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
	}

	get media(): string {
		return "#00000000";
	}

	get loop(): boolean {
		return false;
	}

	get_template(): ClientTextSlides["template"] {
		return {
			template: "JohnCG/Text",
			data: {
				text: this.props.text
			}
		};
	}

	get_markdown_export_string(): string {
		return `# Text: "${this.props.caption}"\n${this.props.text.replaceAll("\n", "  \n")}\n\n`;
	}
}

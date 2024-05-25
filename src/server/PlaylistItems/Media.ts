/* eslint-disable @typescript-eslint/naming-convention */
import { recurse_object_check } from "../lib.ts";
import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemBase, ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";

export interface MediaProps extends ItemPropsBase {
	type: "media";
	media: string;
	loop: boolean;
}

export type ClientMediaItem = MediaProps & ClientItemBase;

export interface ClientMediaProps extends ClientItemSlidesBase {
	type: "media";
	template?: undefined;
}

export default class Media extends PlaylistItemBase {
	protected item_props: MediaProps;

	protected slide_count: number = 1;

	constructor(props: MediaProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);
	}

	set_active_slide(slide?: number): number {
		slide = this.validate_slide_number(slide);

		return slide;
	}

	create_client_object_item_slides(): Promise<ClientMediaProps> {
		return Promise.resolve({
			caption: this.props.caption,
			title: this.media,
			type: "media",
			media: this.media
		});
	}

	navigate_slide(steps: number): number {
		if (typeof steps !== "number") {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new TypeError(`steps ('${steps}') is no number`);
		}

		if (![-1, 1].includes(steps)) {
			throw new RangeError(`steps must be -1 or 1, but is ${steps}`);
		}

		// directly return the steps as item-navigation-steps, since this can't be navigated
		return steps;
	}

	protected validate_props(props: MediaProps): boolean {
		const template: MediaProps = {
			type: "media",
			caption: "Template",
			color: "Template",
			loop: false,
			media: "Template"
		};

		return props.type === "media" && recurse_object_check(props, template);
	}

	get active_slide(): number {
		return 0;
	}

	get props(): MediaProps {
		return this.item_props;
	}

	get playlist_item(): MediaProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
	}

	get media(): string {
		return this.props.media;
	}

	get loop(): boolean {
		return this.props.loop;
	}

	get template(): undefined {
		return undefined;
	}

	get_markdown_export_string(full: boolean): string {
		let return_string = `# Media: "${this.props.caption}" (${this.props.media})`;

		if (full) {
			return_string += `\nLoop: \`${this.props.loop === true}\``;
		}

		return_string += "\n\n";

		return return_string;
	}
}

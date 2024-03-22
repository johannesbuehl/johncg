/* eslint-disable @typescript-eslint/naming-convention */
import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";

export interface MediaProps extends ItemPropsBase {
	type: "media";
	media: string;
	loop: boolean;
}

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
	}

	set_active_slide(slide?: number): number {
		slide = this.validate_slide_number(slide);

		return slide;
	}

	create_client_object_item_slides(): Promise<ClientMediaProps> {
		return Promise.resolve({
			caption: this.props.caption,
			type: "media",
			slides: [],
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

	get active_slide(): number {
		return 0;
	}

	get props(): MediaProps {
		return this.item_props;
	}

	get playlist_item(): MediaProps & { selectable: boolean } {
		return { ...this.props, selectable: this.selectable };
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
}
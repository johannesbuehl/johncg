/* eslint-disable @typescript-eslint/naming-convention */
import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";
import { get_song_path } from "./Song.ts";

export interface ImageProps extends ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type: "Image";
	FileName: string;
	media: string[];
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface ClientImageSlides extends ClientItemSlidesBase {
	type: "Image";
	template?: undefined;
}

export default class Image extends PlaylistItemBase {
	protected item_props: ImageProps;

	protected slide_count: number = 1;

	constructor(props: ImageProps) {
		super();

		this.item_props = props;

		this.item_props.media = [get_song_path(this.props.FileName)];
	}

	set_active_slide(slide?: number): number {
		slide = this.validate_slide_number(slide);

		return slide;
	}

	create_client_object_item_slides(): Promise<ClientImageSlides> {
		return Promise.resolve({
			title: this.props.FileName,
			type: "Image",
			slides: [],
			media: this.props.media
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

	get props(): ImageProps {
		return this.item_props;
	}

	get template(): undefined {
		return undefined;
	}
}

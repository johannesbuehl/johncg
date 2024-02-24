/* eslint-disable @typescript-eslint/naming-convention */
import path from "path";
import { ClientItemSlidesBase, ItemPropsBase, ItemRenderObjectBase, SequenceItemBase } from "./SequenceItem";
import Config from "../config";

export interface ImageProps extends ItemPropsBase {
	/* eslint-disable @typescript-eslint/naming-convention */
	type: "Image";
	FileName: string;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface ImageRenderObject extends ItemRenderObjectBase {
	caspar_type: "media";
	file_name: string;
	slides: [];
}

export interface ClientImageSlides extends ClientItemSlidesBase {
	type: "Image";
	slides: [],
	slides_template: ImageRenderObject & { mute_transition: true; };
}

export default class Image extends SequenceItemBase {
	protected item_props: ImageProps;

	protected slide_count: number = 1;

	constructor(props: ImageProps) {
		super();

		this.item_props = props;
	}

	set_active_slide(slide?: number): number {
		slide = this.validate_slide_number(slide);

		return slide;
	}

	async create_client_object_item_slides(): Promise<ClientImageSlides> {
		return {
			title: this.props.FileName,
			type: "Image",
			item: this.props.item,
			slides: [],
			slides_template: {
				...await this.create_render_object(true),
				mute_transition: true
			}
		};
	}

	async create_render_object(proxy?: boolean): Promise<ImageRenderObject> {
		return {
			caspar_type: "media",
			slide: 0,
			slides: [],
			file_name: this.props.FileName,
			background_image: await this.get_background_image(proxy)
		};
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

	protected async get_background_image(proxy?: boolean): Promise<string> {
		// check wether the images have yet been laoded
		if (this.props.BackgroundImage === undefined) {
			// if the filename is absolute, use it as an filename, if not resolve it relative to the song-path (because Songbeamer)
			const filename = path.isAbsolute(this.props.FileName) ? 
				this.props.FileName
				: path.resolve(Config.path.song, this.props.FileName);

			await this.load_background_images(filename);
		}

		return this.props.BackgroundImage[proxy ? "proxy" : "orig"];
	}

	get active_slide(): number {
		return 0;
	}

	get props(): ImageProps {
		return this.item_props;
	}
}
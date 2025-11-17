import { JSONSchemaType } from "ajv";

import { image_to_uint8array, PlaylistItemBase } from "./PlaylistItem";
import type {
	ClientItemBase,
	ClientItemSlidesBase,
	ItemPropsBase,
	TypstExportBase
} from "./PlaylistItem";
import { ajv } from "../lib";
import { thumbnail_generate, thumbnail_retrieve } from "../CasparCGConnection";

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

const media_props_schema: JSONSchemaType<MediaProps> = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		type: {
			type: "string",
			const: "media"
		},
		caption: {
			type: "string"
		},
		color: {
			type: "string"
		},
		media: {
			type: "string"
		},
		loop: {
			type: "boolean"
		}
	},
	required: ["caption", "color", "loop", "media", "type"],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	additionalProperties: false
};

const validate_media_props = ajv.compile(media_props_schema);

export interface MediaTypstExport extends TypstExportBase {
	type: "media";
	media?: string;
	thumbnail?: Uint8Array;
	loop?: boolean;
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

	protected validate_props = validate_media_props;

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

	get_template(): undefined {
		return undefined;
	}

	async get_typst_export(full: boolean): Promise<MediaTypstExport> {
		const return_object: MediaTypstExport = {
			...(await super.get_typst_export(full)),
			type: "media"
		};

		if (full) {
			let thumbnail: string[] | undefined = await thumbnail_retrieve(this.props.media);

			if (thumbnail === undefined) {
				await thumbnail_generate(this.props.media);

				thumbnail = await thumbnail_retrieve(this.props.media);
			}

			return_object.media = this.props.media;
			return_object.thumbnail = thumbnail ? await image_to_uint8array(thumbnail[0]) : undefined;
			return_object.loop = this.props.loop;
		}

		return return_object;
	}
}

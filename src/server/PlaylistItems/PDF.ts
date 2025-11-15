import sharp from "sharp";
import { JSONSchemaType } from "ajv";
import { PDFParse } from "pdf-parse";

import { PlaylistItemBase } from "./PlaylistItem";
import type {
	ClientItemBase,
	ClientItemSlidesBase,
	ItemPropsBase,
	TypstExportBase
} from "./PlaylistItem";
import { logger } from "../logger";
import Config from "../config/config";
import { casparcg, CasparCGConnection, catch_casparcg_timeout } from "../CasparCGConnection.js";
import { ajv } from "../lib";

export interface PDFProps extends ItemPropsBase {
	type: "pdf";
	file: string;
}

export type ClientPDFItem = PDFProps & ClientItemBase;

export interface ClientPDFSlides extends ClientItemSlidesBase {
	type: "pdf";
	slides: string[];
}

const pdf_props_schema: JSONSchemaType<PDFProps> = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		type: { type: "string", const: "pdf" },
		caption: { type: "string" },
		color: { type: "string" },
		file: { type: "string" }
	},
	required: ["caption", "color", "file", "type"],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	additionalProperties: false
};

const validate_pdf_props = ajv.compile(pdf_props_schema);

export interface PDFTypstExport extends TypstExportBase {
	type: "pdf";
	file?: string;
	thumbnails?: string[];
}

export default class PDF extends PlaylistItemBase {
	protected item_props: PDFProps;

	private slides: string[] = [];
	private thumbnails: string[] = [];

	protected slide_count: number = 0;

	protected active_slide_number: number = 0;

	constructor(props: PDFProps, callback: (pdf_item: PDF) => void) {
		super();

		this.item_props = props;

		this.is_displayable = false;
		const displayable = this.validate_props(props);

		if (displayable) {
			void (async () => {
				const pth = Config.get_path("pdf", this.props.file);

				logger.debug(`loading PDF-file (${pth})`);

				try {
					const parser = new PDFParse({ url: pth });

					const result = await parser.getInfo({
						// eslint-disable-next-line @typescript-eslint/naming-convention
						parsePageInfo: true
					});

					// iterate through the pages
					const images = await Promise.all(
						result.pages.map(async (page) => {
							const renderer_resolution = Config.casparcg_resolution;

							const scale_x = renderer_resolution.width / page.width;
							const scale_y = renderer_resolution.height / page.height;

							return sharp(
								(
									await parser.getScreenshot({
										partial: [page.pageNumber],
										scale: Math.min(scale_x, scale_y),
										// eslint-disable-next-line @typescript-eslint/naming-convention
										imageDataUrl: false
									})
								).pages[0].data
							);
						})
					);

					this.slides = await Promise.all(images.map(async (im) => await create_base64(im)));
					this.thumbnails = await Promise.all(
						images.map(async (im) => await create_base64(im, (img) => img.resize(240)))
					);

					this.slide_count = this.slides.length;
				} catch (e) {
					this.is_displayable = false;
					throw e;
				}

				this.is_displayable = displayable;

				callback(this);
			})();
		}
	}

	set_active_slide(slide?: number): number {
		this.active_slide_number = this.validate_slide_number(slide);

		// display the slide
		void this.casparcg_navigate();

		return this.active_slide;
	}

	async create_client_object_item_slides(): Promise<ClientPDFSlides> {
		return Promise.resolve({
			caption: this.props.caption,
			title: this.props.file,
			type: "pdf",
			slides: this.thumbnails,
			media: undefined
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

		const new_active_slide_number = this.active_slide + steps;
		let slide_steps = 0;

		// new active item has negative index -> roll over to the last slide of the previous element
		if (new_active_slide_number < 0) {
			slide_steps = -1;

			// index is bigger than the slide-count -> roll over to zero
		} else if (new_active_slide_number >= this.slide_count) {
			slide_steps = 1;
		} else {
			this.active_slide_number = new_active_slide_number;

			// display the slide
			void this.casparcg_navigate();
		}

		return slide_steps;
	}

	protected async play_media(casparcg_connection: CasparCGConnection): Promise<unknown> {
		if (casparcg_connection.settings.layers.media !== undefined) {
			const clip = this.media ?? "#00000000";

			if (casparcg.visibility) {
				logger.log(`loading CasparCG-media: '${clip}'`);

				return catch_casparcg_timeout(
					async () =>
						(
							await casparcg_connection.connection.sendCustom({
								command: `PLAY ${casparcg_connection.settings.channel}-${casparcg_connection.settings.layers.media} [html] "${clip}" ${Config.casparcg_transition?.transitionType} ${Config.casparcg_transition?.duration}`
							})
						).request,
					"PLAY MEDIA"
				);
			} else {
				logger.log(`loading CasparCG-media in the background: '${this.media}'`);

				//  if the current stat is invisible, only load it in the background
				return catch_casparcg_timeout(
					async () =>
						(
							await casparcg_connection.connection.sendCustom({
								command: `LOADBG ${casparcg_connection.settings.channel}-${casparcg_connection.settings.layers.media} [html] "${clip}" ${Config.casparcg_transition?.transitionType} ${Config.casparcg_transition?.duration}`
							})
						).request,
					"LOADBG MEDIA"
				);
			}
		} else {
			return new Promise<void>((resolve) => resolve());
		}
	}

	protected validate_props = validate_pdf_props;

	get active_slide(): number {
		return this.active_slide_number;
	}

	get props(): PDFProps {
		return this.item_props;
	}

	get playlist_item(): PDFProps & { displayable: boolean } {
		return { ...this.props, displayable: this.is_displayable };
	}

	get media(): string {
		return this.slides[this.active_slide];
	}

	get multi_media(): boolean {
		return true;
	}

	get loop(): boolean {
		return false;
	}

	get_template(): undefined {
		return undefined;
	}

	async get_typst_export(full: boolean): Promise<PDFTypstExport> {
		const return_object: PDFTypstExport = { ...(await super.get_typst_export()), type: "pdf" };

		if (full) {
			return_object.file = this.props.file;
			return_object.thumbnails = this.thumbnails;
		}

		return return_object;
	}
}

async function create_base64(
	img: sharp.Sharp,
	modify_callback?: (img: sharp.Sharp) => sharp.Sharp
): Promise<string> {
	const pipeline = modify_callback ? modify_callback(img.clone()) : img.clone();

	// eslint-disable-next-line @typescript-eslint/naming-convention
	pipeline.webp({ nearLossless: true });

	return "data:image/webp;base64," + (await pipeline.toBuffer()).toString("base64");
}

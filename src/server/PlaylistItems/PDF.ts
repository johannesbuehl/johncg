import sharp from "sharp";
import Canvas from "canvas";
import tmp from "tmp";

import { PlaylistItemBase } from "./PlaylistItem.ts";
import type { ClientItemBase, ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";
import { logger } from "../logger.ts";
import { recurse_object_check } from "../lib.ts";
import Config from "../config.ts";
import { CasparCGResolution } from "../CasparCG.ts";

export interface PDFProps extends ItemPropsBase {
	type: "pdf";
	file: string;
}

export type ClientPDFItem = PDFProps & ClientItemBase;

export interface ClientPDFSlides extends ClientItemSlidesBase {
	type: "pdf";
	slides: string[];
}

export default class PDF extends PlaylistItemBase {
	protected item_props: PDFProps;

	private slides: string[] = [];

	protected slide_count: number = 0;

	protected active_slide_number: number = 0;

	constructor(props: PDFProps, callback: () => void) {
		super();

		this.item_props = props;

		this.is_displayable = false;
		const displayable = this.validate_props(props);

		if (displayable) {
			void (async () => {
				const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

				const pth = Config.get_path("pdf", this.props.file).replaceAll("/", "\\");

				logger.debug(`loading PDF-file (${pth})`);

				try {
					const pdf = await pdfjs.getDocument(pth).promise;

					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					await Promise.all(
						[...Array(pdf.numPages).keys()].map(async (index) => {
							// increase the counter by one, because the pages start at 1
							const page = await pdf.getPage(index + 1);

							// eslint-disable-next-line @typescript-eslint/naming-convention
							const viewport = page.getViewport({ scale: 1 });

							const casparcg_resolution = Config.casparcg_resolution;

							const scales: Partial<Record<keyof CasparCGResolution, number>> = {};
							Object.entries(casparcg_resolution).forEach(
								([key, res]: [keyof CasparCGResolution, number]) => {
									scales[key] = res / viewport[key];
								}
							);
							const scale = Math.min(...Object.values(scales));

							const canvas = Canvas.createCanvas(
								casparcg_resolution.width,
								casparcg_resolution.height
							);

							await page.render({
								// eslint-disable-next-line @typescript-eslint/naming-convention
								canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
								/* eslint-disable @typescript-eslint/naming-convention */
								viewport: page.getViewport({
									scale,
									offsetY: (casparcg_resolution.height - scale * viewport.height) / 2,
									offsetX: (casparcg_resolution.width - scale * viewport.width) / 2
								}),
								/* eslint-enable @typescript-eslint/naming-convention */
								background: "#000000"
							}).promise;

							const image_buffer = canvas.toBuffer();

							// save the image into a temporary file
							const tmp_file = tmp.fileSync();

							void sharp(image_buffer).png().toFile(tmp_file.name);

							this.slides[index] = tmp_file.name.replaceAll("\\", "/").replace(/^(\w:\/)/, "$1/");

							this.slide_count++;
						})
					);
				} catch (e) {
					if (e instanceof pdfjs.MissingPDFException) {
						this.is_displayable = false;

						return;
					} else {
						throw e;
					}
				}

				this.is_displayable = displayable;

				callback();
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
			type: "pdf",
			slides: await Promise.all(this.slides.map(async (m) => await this.create_thumbnail(m))),
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

	async create_thumbnail(media: string): Promise<string> {
		const img = sharp(media);
		img.resize(240);

		return "data:image/png;base64," + (await img.toBuffer()).toString("base64");
	}

	protected validate_props(props: PDFProps): boolean {
		const template: PDFProps = {
			type: "pdf",
			caption: "Template",
			color: "Template",
			file: "Template"
		};

		return props.type === "pdf" && recurse_object_check(props, template);
	}

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

	get template(): undefined {
		return undefined;
	}
}

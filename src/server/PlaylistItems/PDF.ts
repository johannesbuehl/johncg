import sharp from "sharp";
import Canvas from "canvas";
import tmp from "tmp";

import { PlaylistItemBase, recurse_check } from "./PlaylistItem.ts";
import type { ClientItemSlidesBase, ItemPropsBase } from "./PlaylistItem.ts";
import { get_song_path } from "./Song.ts";

export interface PDFProps extends ItemPropsBase {
	type: "pdf";
	path: string;
}

export interface ClientPDFSlides extends ClientItemSlidesBase {
	type: "pdf";
	slides: string[];
	template?: undefined;
}

export default class PDF extends PlaylistItemBase {
	protected item_props: PDFProps;

	private slides: string[];

	protected slide_count: number = 0;

	protected active_slide_number: number = 0;

	constructor(props: PDFProps) {
		super();

		this.item_props = props;

		this.is_selectable = this.validate_props(props);

		if (this.selectable) {
			void (async () => {
				const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

				const pth = get_song_path(this.props.path).replaceAll("/", "\\");

				try {
					const pdf = await pdfjs.getDocument(pth).promise;

					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					[...Array(pdf.numPages).keys()].forEach(async (index) => {
						// increase the counter by one, because the pages start at 1
						const page = await pdf.getPage(index + 1);
						// eslint-disable-next-line @typescript-eslint/naming-convention
						const viewport = page.getViewport({ scale: 1 });
						const canvas = Canvas.createCanvas(viewport.width, viewport.height);

						await page.render({
							// eslint-disable-next-line @typescript-eslint/naming-convention
							canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
							viewport
						}).promise;

						const image_buffer = canvas.toBuffer();

						// save the image into a temporary file
						const tmp_file = tmp.fileSync();

						void sharp(image_buffer).png().toFile(tmp_file.name);

						this.slides[index] = tmp_file.name.replaceAll("\\", "/");

						this.slide_count++;
					});
				} catch (e) {
					if (e instanceof pdfjs.MissingPDFException) {
						this.is_selectable = false;

						return;
					} else {
						throw e;
					}
				}
			})();
		}
	}

	set_active_slide(slide?: number): number {
		this.active_slide_number = this.validate_slide_number(slide);

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
		}

		return slide_steps;
	}

	async create_thumbnail(media: string): Promise<string> {
		const img = sharp(media);
		img.resize(240);

		return (await img.toBuffer()).toString("base64");
	}

	protected validate_props(props: PDFProps): boolean {
		const template: PDFProps = {
			type: "pdf",
			caption: "Template",
			color: "Template",
			path: "Template"
		};

		return props.type === "pdf" && recurse_check(props, template);
	}

	get active_slide(): number {
		return this.active_slide_number;
	}

	get props(): PDFProps {
		return this.item_props;
	}

	get playlist_item(): PDFProps & { selectable: boolean } {
		return { ...this.props, selectable: this.selectable };
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

import net from "net";

import { recurse_object_check } from "../lib";
import { ClientItemSlidesBase, ItemProps, ItemPropsBase, PlaylistItemBase } from "./PlaylistItem";

export interface AMCPProps extends ItemPropsBase {
	type: "amcp";
	command: string;
}

export interface ClientAMCPSlides extends ClientItemSlidesBase {
	type: "amcp";
	media: undefined;
	data: {
		command: string;
	};
}

export default class AMCP extends PlaylistItemBase {
	protected is_displayable: boolean = true;

	protected item_props: AMCPProps;

	protected slide_count: number = 1;

	private test_connection: net.Socket = new net.Socket();

	constructor(props: AMCPProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);

		this.test_connection.connect(5250, "127.0.0.1");

		this.test_connection.on("data", (data) => {
			console.debug(data.toString("utf8"));
		});
	}

	create_client_object_item_slides(): Promise<ClientAMCPSlides> {
		return Promise.resolve({
			caption: this.props.caption,
			type: "amcp",
			media: undefined,
			data: {
				command: this.props.command
			}
		});
	}

	set_active_slide(slide?: number): number {
		slide = this.validate_slide_number(slide);

		return slide;
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

	play() {
		this.test_connection.write("PLAY 1-20 #ff0000\r\n");
	}

	stop() {
		this.test_connection.write("STOP 1-20\r\n");
	}

	protected validate_props(props: AMCPProps): boolean {
		const template: AMCPProps = {
			type: "amcp",
			caption: "Template",
			color: "Template",
			command: "Template"
		};

		return props.type === "amcp" && recurse_object_check(props, template);
	}

	get media(): undefined {
		return undefined;
	}

	get loop(): undefined {
		return undefined;
	}

	get template(): undefined {
		return undefined;
	}

	get active_slide(): number {
		return 0;
	}

	get props(): AMCPProps {
		return this.item_props;
	}

	get playlist_item(): ItemProps & { displayable: boolean } {
		return {
			...this.props,
			displayable: this.displayable
		};
	}
}

import { CasparCGConnection, casparcg } from "../CasparCG";
import { recurse_object_check } from "../lib";
import { ClientItemSlidesBase, ItemProps, ItemPropsBase, PlaylistItemBase } from "./PlaylistItem";
import { APIRequest, Commands } from "casparcg-connection";

export interface AMCPProps extends ItemPropsBase {
	type: "amcp";
	commands: {
		play?: string;
		stop?: string;
	};
}

export interface ClientAMCPSlides extends ClientItemSlidesBase {
	type: "amcp";
	media: undefined;
	data: {
		commands: AMCPProps["commands"];
	};
}

export default class AMCP extends PlaylistItemBase {
	protected is_displayable: boolean = true;

	protected item_props: AMCPProps;

	protected slide_count: number = 1;

	constructor(props: AMCPProps) {
		super();

		this.item_props = props;

		this.is_displayable = this.validate_props(props);
	}

	create_client_object_item_slides(): Promise<ClientAMCPSlides> {
		return Promise.resolve({
			caption: this.props.caption,
			type: "amcp",
			media: undefined,
			data: {
				commands: this.props.commands
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

	play(casparcg_connection?: CasparCGConnection): Promise<APIRequest<Commands.Custom>[]> {
		if (this.props.commands.play !== undefined) {
			const connections = casparcg_connection
				? [casparcg_connection]
				: casparcg.casparcg_connections;

			return Promise.all(
				connections.map((connection) => {
					if (casparcg.visibility) {
						return connection.connection.sendCustom({
							command: this.props.commands.stop
						});
					}
				})
			);
		}
	}

	stop(casparcg_connection?: CasparCGConnection): Promise<APIRequest<Commands.Custom>[]> {
		if (this.props.commands.stop !== undefined) {
			const connections = casparcg_connection
				? [casparcg_connection]
				: casparcg.casparcg_connections;

			return Promise.all(
				connections.map((connection) => {
					if (casparcg.visibility) {
						return connection.connection.sendCustom({
							command: this.props.commands.stop
						});
					}
				})
			);
		}
	}

	set_visibility(visibility: boolean, casparcg_connection?: CasparCGConnection) {
		casparcg.visibility = visibility;

		if (visibility) {
			return this.play(casparcg_connection);
		} else {
			return this.stop(casparcg_connection);
		}
	}

	protected validate_props(props: AMCPProps): boolean {
		const template: AMCPProps = {
			type: "amcp",
			caption: "Template",
			color: "Template",
			commands: {}
		};

		return (
			props.type === "amcp" &&
			recurse_object_check(props, template) &&
			Object.entries(props.commands).every(([key, command]) => {
				return ["play", "stop"].includes(key) && ["string", "undefined"].includes(typeof command);
			})
		);
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

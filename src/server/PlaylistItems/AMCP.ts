import { JSONSchemaType } from "ajv";

import { CasparCGConnection, casparcg, catch_casparcg_timeout } from "../CasparCGConnection";
import {
	ClientItemBase,
	ClientItemSlidesBase,
	ItemProps,
	ItemPropsBase,
	PlaylistItemBase
} from "./PlaylistItem";
import { ajv } from "../lib";

export interface AMCPProps extends ItemPropsBase {
	type: "amcp";
	commands: {
		set_active?: string;
		set_inactive?: string;
	};
}

export type ClientAMCPItem = AMCPProps & ClientItemBase;

export interface ClientAMCPSlides extends ClientItemSlidesBase {
	type: "amcp";
	media: undefined;
	data: {
		commands: AMCPProps["commands"];
	};
}
const amcpprops_schema: JSONSchemaType<AMCPProps> = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		type: {
			type: "string",
			const: "amcp"
		},
		caption: {
			type: "string"
		},
		color: {
			type: "string"
		},
		commands: {
			type: "object",
			properties: {
				set_active: {
					type: "string",
					nullable: true
				},
				set_inactive: {
					type: "string",
					nullable: true
				}
			},
			// eslint-disable-next-line @typescript-eslint/naming-convention
			additionalProperties: false
		}
	},
	required: ["caption", "color", "commands", "type"],
	definitions: {}
};

const validate_amcp_props = ajv.compile(amcpprops_schema);
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
			title: "AMCP command",
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

	private send_custom_command(
		command: string,
		casparcg_connection?: CasparCGConnection
	): Promise<PromiseSettledResult<void>[]> {
		const connections = casparcg_connection ? [casparcg_connection] : casparcg.casparcg_connections;

		return Promise.allSettled(
			connections.map(async (connection) => {
				await catch_casparcg_timeout(
					async () =>
						(
							await connection.connection.sendCustom({
								command
							})
						).request,
					command
				);
			})
		);
	}

	async play(casparcg_connection?: CasparCGConnection): Promise<PromiseSettledResult<void>[]> {
		if (this.props.commands.set_active !== undefined) {
			return this.send_custom_command(this.props.commands.set_active, casparcg_connection);
		} else {
			return Promise.allSettled([await Promise.resolve()]);
		}
	}

	stop(casparcg_connection?: CasparCGConnection) {
		if (this.props.commands.set_inactive !== undefined) {
			return this.send_custom_command(this.props.commands.set_inactive, casparcg_connection);
		}
	}

	protected validate_props = validate_amcp_props;

	get media(): undefined {
		return undefined;
	}

	get loop(): undefined {
		return undefined;
	}

	get_template(): undefined {
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

	get_markdown_export_string(full: boolean): string {
		let return_string = '# AMCP: "${this.props.caption}"';

		if (full) {
			if (this.props.commands.set_active !== undefined) {
				return_string += `\n\n## Set-Active\n\`${this.props.commands.set_active}\`\n`;
			}

			if (this.props.commands.set_inactive !== undefined) {
				return_string += `\n\n## Set-Inactive\n\`${this.props.commands.set_inactive}\`\n`;
			}
		}

		return_string += "\n\n";

		return return_string;
	}
}

import { Client as ClientOSC, Server as ServerOSC } from "node-osc";
import type { ArgumentType as ArgumentTypeOSC } from "node-osc";
import { logger } from "../logger";

export interface OSCServerArguments {
	port_receive: number;
	address_send: string;
	port_send: number;
}

export type OSCFunctionMap = {
	[key: string]:
		| OSCFunctionMap
		| ((value: boolean) => void | Promise<void>)
		| ((value: number) => void | Promise<void>)
		| ((value: string) => void | Promise<void>);
};

export default class OSCServer {
	// private osc_server: osc.UDPPort;
	private osc_server: ServerOSC;
	private osc_client: ClientOSC;

	private function_map: OSCFunctionMap;

	constructor(args: OSCServerArguments, function_map: OSCFunctionMap) {
		this.function_map = function_map;

		this.osc_server = new ServerOSC(args.port_receive, "0.0.0.0");

		this.osc_client = new ClientOSC(args.address_send, args.port_send);

		this.osc_server.on("message", (osc_msg) => {
			logger.debug(`received OSC-command (${JSON.stringify(osc_msg)})`);

			const parts = osc_msg[0].split("/");

			// remove the first empty elementn from the leading slash
			parts.shift();

			// execute the command map
			this.execute_command(parts, this.function_map, osc_msg[1]);
		});
	}

	private execute_command(path: string[], command_tree: OSCFunctionMap, value: ArgumentTypeOSC) {
		if (path.length > 1) {
			const path_part = path.shift();

			if (path_part !== undefined) {
				const traversed_command_tree = command_tree[path_part];

				if (typeof traversed_command_tree === "object") {
					this.execute_command(path, traversed_command_tree, value);
				}
			}
		} else {
			const command = command_tree[path[0]];

			if (typeof command === "function") {
				void command(value as never);
			}
		}
	}

	send_value(path: string, value: ArgumentTypeOSC) {
		let type: string | undefined;

		switch (typeof value) {
			case "number":
				type = value.toString().includes(".") ? "f" : "i";
				break;
			case "boolean":
				type = "i";
				value = Number(value);
				break;
			case "string":
				type = "s";
				break;
		}

		// if the type is undefined, the type is not supported -> exit
		if (type === undefined) {
			logger.warn("can't send OSC-command: invalid type");
			return;
		}

		logger.debug(`sending OSC-command: '${path} ${JSON.stringify(value)}'`);
		this.osc_client.send([path, value]);
	}
}

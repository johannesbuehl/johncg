import { Server as ServerOSC, Client as ClientOSC, ArgumentType as ArgumentTypeOSC } from "node-osc";

interface OSCServerArguments {
	port_receive: number;
	address_send: string;
	port_send: number;
}

type OSCFunctionMap = { [key: string]: OSCFunctionMap | ((value: boolean) => void | Promise<void> ) | ((value: number) => void | Promise<void> ) | ((value: string) => void | Promise<void> ) };

type FunctionMap = { [key: string]: FunctionMap | ((value: ArgumentTypeOSC) => void)};

class OSCServer {
	// private osc_server: osc.UDPPort;
	private osc_server: ServerOSC;
	private osc_client: ClientOSC;

	private function_map: FunctionMap;

	constructor(args: OSCServerArguments, function_map: OSCFunctionMap) {
		this.function_map = function_map;

		this.osc_server = new ServerOSC(args.port_receive, "0.0.0.0");

		this.osc_client = new ClientOSC(args.address_send, args.port_send);

		this.osc_server.on("message", (osc_msg) => {
			const parts = osc_msg[0].split("/");

			// remove the first empty elementn from the leading slash
			parts.shift();
			
			// execute the command map
			this.execute_command(parts, this.function_map, osc_msg[1]);
		});
	}

	private execute_command(path: string[], command_tree: FunctionMap, value: ArgumentTypeOSC) {
		if (path.length > 1) {
			const traversed_command_tree = command_tree[path.shift()];

			if (typeof traversed_command_tree === "object") {
				this.execute_command(path, traversed_command_tree, value);
			}
		} else {
			const command = command_tree[path[0]];
			
			if (typeof command === "function") {
				command(value);
			}
		}
	}

	send_value(path: string, value: ArgumentTypeOSC) {
		let type: string;

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
			return;
		}

		this.osc_client.send([path, value]);
	}
}

export default OSCServer;
export { OSCServerArguments, OSCFunctionMap };

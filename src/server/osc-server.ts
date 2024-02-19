import osc from "osc";

interface OSCServerArguments {
	portReceive: number;
	addressSend: string;
	portSend: number;
}

type OSCValueType = boolean | number | string;

type OSCFunctionMap = { [key: string]: OSCFunctionMap | ((value: OSCValueType) => void ) };

class OSCServer {
	private osc_server: osc.UDPPort;

	private function_map;

	constructor(args: OSCServerArguments, function_map) {
		this.function_map = function_map;

		this.osc_server = new osc.UDPPort({
			localAddress: "0.0.0.0",
			localPort: args.portReceive,
			remoteAddresse: args.addressSend,
			remotePort: args.portSend
		});

		this.osc_server.on("message", (oscMsg) => {
			const parts = oscMsg.address.split("/");

			// remove the first empty elementn from the leading slash
			parts.shift();
			
			// execute the command map
			this.execute_command(parts, this.function_map, oscMsg.args[0]);
		});

		this.osc_server.open();
	}

	private execute_command(path: string[], command_tree, value) {
		if (path.length > 1) {
			const traversed_command_tree = command_tree[path.shift()];

			if (traversed_command_tree !== undefined) {
				this.execute_command(path, traversed_command_tree, value);
			}
		} else {
			command_tree[path[0]]?.(value);
		}
	}

	send_value(path: string, value: OSCValueType) {
		let type: OSCValueType;

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

		this.osc_server.send({
			address: path,
			args: [
				{
					type,
					value
				}
			]
		});
	}
}

export default OSCServer;
export { OSCServerArguments, OSCFunctionMap };

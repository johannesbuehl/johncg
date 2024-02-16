import osc from "osc";

class OSCServer {
	private osc_server: osc.UDPPort;

	private function_map;

	constructor(port: number) {
		this.osc_server = new osc.UDPPort({
			localAddress: "0.0.0.0",
			localPort: port
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

	set_function_map(function_map) {
		this.function_map = function_map;
	}

	private execute_command(path: string[], command_tree, command) {
		if (path.length > 1) {
			const traversed_command_tree = command_tree[path.shift()];

			if (traversed_command_tree !== undefined) {
				this.execute_command(path, traversed_command_tree, command);
			}
		} else {
			command_tree[path[0]]?.(command);
		}
	}
}

export default OSCServer;
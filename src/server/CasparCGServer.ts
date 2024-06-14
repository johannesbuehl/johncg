import ChildProcess from "child_process";
import { logger } from "./logger";

export default class CasparCGServer {
	private server_process: ChildProcess.ChildProcess;
	private scanner_process: ChildProcess.ChildProcess;

	private casparcg_path: string;
	private server_path: string;
	private scanner_path: string;

	constructor(casparcg_path: string) {
		this.casparcg_path = casparcg_path;

		switch (process.platform) {
			case "win32":
				this.server_path = "casparcg.exe";
				this.scanner_path = "scanner.exe";
				break;
			case "linux":
				this.server_path = "run.sh";
				this.scanner_path = "scanner";
				break;
		}

		this.launch();
	}

	launch() {
		this.launch_server();
		this.launch_scanner();
	}

	launch_server() {
		logger.log(`Launching CasparCG-Server: '${this.server_path}'`);
		this.server_process = ChildProcess.execFile(this.server_path, { cwd: this.casparcg_path });

		this.server_process.addListener("close", () => this.launch_server());

		this.server_process.addListener("error", () => console.error("error"));
	}

	launch_scanner() {
		logger.log(`Launching CasparCG-Scanner: '${this.scanner_path}'`);
		this.scanner_process = ChildProcess.execFile(this.scanner_path, { cwd: this.casparcg_path });

		this.scanner_process.addListener("close", () => this.launch_scanner());
	}
}

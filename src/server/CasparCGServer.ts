import ChildProcess from "child_process";
import { logger } from "./logger";
import fs from "fs";
import path from "path";

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

		// only proceed if both files exists
		if (!fs.existsSync(path.join(this.casparcg_path, this.server_path))) {
			const error = new Error(
				`CasparCG: casparcg-executable not found: ${path.join(this.casparcg_path, this.server_path)}`
			);

			throw error;
		} else if (!fs.existsSync(path.join(this.casparcg_path, this.scanner_path))) {
			const error = new Error(
				`CasparCG: scanner-executable not found: ${path.join(this.casparcg_path, this.scanner_path)}`
			);

			throw error;
		} else {
			this.launch();
		}
	}

	launch() {
		this.launch_server();
		this.launch_scanner();
	}

	launch_server() {
		logger.log(`Launching CasparCG-Server: '${this.server_path}'`);
		this.server_process = ChildProcess.execFile(this.server_path, { cwd: this.casparcg_path });

		// redirect the output to the console
		this.server_process.stdout.on("data", (data: Buffer) => {
			const lines = data.toString().replaceAll("\r", "").split("\n");

			lines.forEach((line) => {
				console.log(`[CasparCG] ${line}`);
			});
		});

		this.server_process.stderr.on("data", (data: Buffer) => {
			const lines = data.toString().replaceAll("\r", "").split("\n");

			lines.forEach((line) => {
				console.error(`[CasparCG] ${line}`);
			});
		});

		this.server_process.addListener("close", () => this.launch_server());
	}

	launch_scanner() {
		logger.log(`Launching CasparCG-Scanner: '${this.scanner_path}'`);
		this.scanner_process = ChildProcess.execFile(this.scanner_path, { cwd: this.casparcg_path });

		this.scanner_process.stderr.on("data", (data: Buffer) => {
			const lines = data.toString().replaceAll("\r", "").split("\n");

			lines.forEach((line) => {
				console.error(`[CasparCG Scanner] ${line}`);
			});
		});

		this.scanner_process.addListener("close", () => this.launch_scanner());
	}
}

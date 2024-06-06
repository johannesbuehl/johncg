import { reactive, ref } from "vue";

import { ControlWindowState } from "./Enums";

import { LogLevel } from "@server/JGCPSendMessages";

export interface LogMessage {
	message: string;
	type: LogLevel;
	timestamp: Date;
}

class Log {
	private _messages = ref<LogMessage[]>([]);
	get messages(): LogMessage[] {
		return this._messages.value;
	}

	private _log_level = ref<Record<LogLevel, boolean>>({
		debug: false,
		log: true,
		warn: true,
		error: true
	});
	get log_level(): Record<LogLevel, boolean> {
		return this._log_level.value;
	}

	add(message: string, level: LogLevel = LogLevel.log) {
		this._messages.value.push({
			message,
			type: level,
			timestamp: new Date()
		});
	}

	debug(message: string) {
		this.add(message, LogLevel.debug);
	}

	log(message: string) {
		this.add(message, LogLevel.log);
	}

	warn(message: string) {
		this.add(message, LogLevel.warn);
	}

	error(message: string) {
		this.add(message, LogLevel.error);
	}
}

class Global {
	// WebSocket
	_ws: WebSocket | undefined;
	get ws(): WebSocket | undefined {
		return this._ws;
	}

	// ControlWindowState
	private control_window_state = ref<ControlWindowState>(ControlWindowState.Slides);
	get ControlWindowState(): ControlWindowState {
		return this.control_window_state.value;
	}
	set ControlWindowState(state: ControlWindowState) {
		if (this.control_window_state_change_confirm === undefined) {
			this.control_window_state.value = state;
		} else {
			this.control_window_state_change_confirm((change_state: boolean) => {
				if (change_state) {
					this.control_window_state.value = state;
					this.control_window_state_change_confirm = undefined;
				}
			});
		}
	}

	// ControlWindowStateConfirm
	private control_window_state_change_confirm:
		| ((callback: (change_state: boolean) => void) => void)
		| undefined = undefined;
	set ControlWindowStateConfirm(
		callback: ((callback: (change_state: boolean) => void) => void) | undefined
	) {
		this.control_window_state_change_confirm = callback;
	}

	// Log
	private message_log = new Log();
	get message(): Log {
		return this.message_log;
	}
}

const Globals = new Global();

export default Globals;

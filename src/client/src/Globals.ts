import { ref } from "vue";
import { ControlWindowState } from "./Enums";

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
	set ControlWindowStateConfirm(callback: (callback: (change_state: boolean) => void) => void) {
		this.control_window_state_change_confirm = callback;
	}
}

const Globals = new Global();

export default Globals;

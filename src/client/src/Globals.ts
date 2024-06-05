import { ref } from "vue";
import { ControlWindowState } from "./Enums";

class Global {
	private control_window_state = ref<ControlWindowState>(ControlWindowState.Slides);
	private control_window_state_change_confirm: (() => boolean) | undefined = undefined;

	get ControlWindowState(): ControlWindowState {
		return this.control_window_state.value;
	}

	set ControlWindowState(state: ControlWindowState) {
		if (
			this.control_window_state_change_confirm === undefined ||
			this.control_window_state_change_confirm()
		) {
			this.control_window_state.value = state;

			this.control_window_state_change_confirm = undefined;
		}
	}

	set ControlWindowStateConfirm(callback: () => boolean) {
		this.control_window_state_change_confirm = callback;
	}
}

const Globals = new Global();

export default Globals;

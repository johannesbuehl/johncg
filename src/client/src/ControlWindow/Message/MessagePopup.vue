<script lang="ts">
	export interface LogMessage {
		message: string;
		type: LogLevel;
		timestamp: Date;
	}

	export enum LogLevel {
		error = "error",
		warn = "warn",
		log = "log",
		debug = "debug"
	}

	export const icons: Record<LogLevel, string> = {
		error: "exclamation",
		warn: "xmark",
		log: "info",
		debug: "bug"
	};

	export const colors: Record<LogLevel, string> = {
		error: "#ff0000",
		log: "#8888ff",
		warn: "#ffff00",
		debug: "#888888"
	};

	export function get_time_string(date: Date): string {
		return [date.getHours(), date.getMinutes(), date.getSeconds()]
			.map((ele) => {
				return String(ele).padStart(2, "0");
			})
			.join(":");
	}
</script>

<script setup lang="ts">
	import { ref, watch } from "vue";

	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	library.add(fas.faExclamation, fas.faXmark, fas.faBug, fas.faInfo);

	const props = defineProps<{
		messages: LogMessage[];
		log_level: Record<LogLevel, boolean>;
	}>();

	const emit = defineEmits<{}>();

	const messages = ref<LogMessage[]>([]);

	function show_message(message: LogMessage) {
		messages.value.unshift(message);

		// remove an element
		setTimeout(() => {
			const message_index = messages.value.indexOf(message);

			if (message_index >= 0) {
				messages.value.splice(message_index, 1);
			}
		}, 5000);
	}

	const console_command_map: Record<LogLevel, Function> = {
		error: console.error,
		warn: console.warn,
		log: console.log,
		debug: console.debug
	};

	watch(props.messages, (messages) => {
		const message = messages[messages.length - 1];

		console_command_map[message.type](message.message);

		if (props.log_level[message.type]) {
			show_message(message);
		}
	});
</script>

<template>
	<TransitionGroup class="popup_parent" name="popup" tag="div">
		<div
			v-for="(message, message_index) of messages"
			class="popup"
			:key="message.message"
			@click="messages.splice(message_index, 1)"
		>
			<FontAwesomeIcon
				:icon="['fas', icons[message.type]]"
				:style="{ color: colors[message.type] }"
			/>
			<div class="popup_text">
				<span class="message">{{ message.message }}</span>
				<span class="date">{{ get_time_string(message.timestamp) }}</span>
			</div>
		</div>
	</TransitionGroup>
</template>

<style scoped>
	.popup_parent {
		position: fixed;

		right: 0;

		width: 30rem;

		z-index: 8888;

		/* backdrop-filter: blur(0.5rem); */
	}

	.popup-move,
	.popup-enter-active,
	.popup-leave-active {
		transition: all 0.5s ease;
	}

	.popup-enter-from,
	.popup-leave-to {
		opacity: 0;
	}

	.popup {
		overflow: hidden;
		transition: all 0.5s;

		background-color: var(--color-item);

		margin: 0.25rem;

		padding: 0.5rem;
		border-radius: 0.25rem;

		box-shadow: 0.25rem 0.25rem 0.25rem #00000022;

		display: flex;

		gap: 0.5rem;

		cursor: pointer;
	}

	.popup > :first-child {
		width: 2ch;
	}

	.popup > .popup_text {
		flex: 1;

		display: flex;
		justify-content: space-between;
	}
</style>

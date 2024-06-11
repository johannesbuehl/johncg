<script lang="ts">
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
</script>

<script setup lang="ts">
	import { ref, watch } from "vue";

	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import type { LogMessage } from "@/Globals";

	import type { LogLevel } from "@server/JCGPSendMessages";
	import { get_time_string } from "@server/lib";
	import Globals from "@/Globals";

	library.add(fas.faExclamation, fas.faXmark, fas.faBug, fas.faInfo);

	const messages = ref<LogMessage[]>([]);

	function show_message(message: LogMessage) {
		messages.value.splice(0, 0, message);

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

	watch(Globals.message.messages, (messages) => {
		const message = messages[messages.length - 1];

		console_command_map[message.type](message.message);

		if (Globals.message.log_level[message.type]) {
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

<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import { icons, colors } from "./MessagePopup.vue";
	import Globals from "@/Globals";

	import { get_time_string } from "@server/lib";
	import type { LogLevel } from "@server/JCGPSendMessages";

	library.add(fas.faExclamation, fas.faXmark, fas.faBug, fas.faInfo);
</script>

<template>
	<div id="message_wrapper">
		<div id="type_selector">
			<template v-for="[key, val] of Object.entries(Globals.message.log_level)">
				<div :class="{ active: val }" @click="Globals.message.log_level[key as LogLevel] = !val">
					<FontAwesomeIcon
						:icon="['fas', icons[key as LogLevel]]"
						:style="{ color: colors[key as LogLevel] }"
					/>
					{{ key }}
				</div>
			</template>
		</div>
		<div id="message_container">
			<template v-for="message of Globals.message.messages">
				<div class="message" v-if="Globals.message.log_level[message.type]">
					<FontAwesomeIcon
						:icon="['fas', icons[message.type]]"
						:style="{ color: colors[message.type] }"
					/>
					<div class="message_text">
						<span class="message">{{ message.message }}</span>
						<span class="date">{{ get_time_string(message.timestamp) }}</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
	#message_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: 0.25rem;
	}

	#type_selector {
		background-color: var(--color-container);
		border-radius: 0.25rem;

		padding: 0.25rem;

		display: flex;

		gap: 0.25rem;
	}

	#type_selector > div {
		border-radius: 0.25rem;

		background-color: var(--color-item);

		padding: 0.25rem;
		padding-inline: 0.5rem;

		cursor: pointer;

		display: flex;
		align-items: center;
		gap: 0.5rem;

		transition: background-color 0.25s ease;
	}

	#type_selector > div:hover {
		background-color: var(--color-item-hover);
	}

	#type_selector > div.active {
		background-color: var(--color-active);
	}

	#type_selector > div.active:hover {
		background-color: var(--color-active-hover);
	}

	#message_container {
		flex: 1;
		border-radius: 0.25rem;
		background-color: var(--color-container);

		display: flex;
		flex-direction: column-reverse;
		gap: 0.25rem;

		overflow: auto;
	}

	#message_container > :first-child {
		margin-bottom: auto;
	}

	.message {
		background-color: var(--color-item);

		display: flex;

		padding: 0.25rem;
		padding-left: 0.5rem;

		gap: 0.5rem;

		align-items: center;

		overflow: visible;
	}

	.message > :first-child {
		width: 2ch;
	}

	.message_text {
		flex: 1;

		display: flex;
		justify-content: space-between;

		align-items: baseline;

		overflow: visible;
	}
</style>

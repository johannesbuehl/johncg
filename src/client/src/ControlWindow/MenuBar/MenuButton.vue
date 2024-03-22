<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	defineProps<{
		icon: string;
		text?: string;
		active?: boolean;
	}>();
</script>

<template>
	<div
		class="button"
		:class="{ active, square: text === undefined }"
		tabindex="0"
		@keydown.enter="($event.target as HTMLDivElement)?.click()"
	>
		<FontAwesomeIcon :icon="['fas', icon]" />
		<span v-if="text !== undefined" class="button_text">{{ text ?? "" }}</span>
	</div>
</template>

<style scoped>
	div.button {
		background-color: rgb(60, 64, 75);

		border-radius: 0.25rem;

		display: flex;
		align-items: center;
		justify-content: center;

		padding: 0.5rem;

		height: 2em;

		margin: 0.25rem;
	}

	div.button.square {
		aspect-ratio: 1;
	}

	div.button:hover {
		background-color: rgb(79, 83, 94);
	}

	div.button.active {
		background-color: rgb(40, 76, 184);
	}

	div.button.active:hover {
		background-color: rgb(54, 92, 192);
	}

	div.button,
	div.button > * {
		cursor: pointer;
	}

	span.button_text::before {
		display: inline-block;

		content: "";
		width: 0.5rem;
	}
</style>

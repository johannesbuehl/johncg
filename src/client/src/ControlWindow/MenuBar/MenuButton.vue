<script setup lang="ts">
	defineProps<{
		square?: boolean;
		active?: boolean;
	}>();

	const state = defineModel<boolean | undefined>({ default: undefined });
</script>

<template>
	<div
		class="button"
		:class="{ active: state !== undefined ? state : active, square }"
		tabindex="0"
		@keydown.enter="
			($event.target as HTMLDivElement)?.click();
			$event.preventDefault();
			$event.stopPropagation();
		"
		@click="state !== undefined ? (state = !state) : undefined"
	>
		<slot></slot>
	</div>
</template>

<style scoped>
	div.button {
		background-color: rgb(60, 64, 75);

		border-radius: 0.25rem;

		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;

		padding: 0.5rem;

		height: 2em;

		margin: 0.25rem;

		transition: background-color 0.25s ease;
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
</style>

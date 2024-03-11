<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	defineProps<{
		icon: string;
		active?: boolean;
	}>();
</script>

<template>
	<div class="button" :class="{ active }">
		<FontAwesomeIcon :icon="['fas', icon]" />
	</div>
</template>

<style scoped>
	div.button {
		background-color: rgb(60, 64, 75);

		border-radius: 0.25rem;

		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;

		padding: 0.5rem;

		aspect-ratio: 1;
		height: 2em;

		margin: 0.25rem;
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

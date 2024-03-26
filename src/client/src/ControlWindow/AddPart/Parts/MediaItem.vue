<script setup lang="ts">
	import type { SongData } from "@server/search_part";

	defineProps<{
		song_result: SongData;
		active: boolean;
		id: string;
	}>();

	const emit = defineEmits<{
		set_selection: [song: SongData];
		add_song: [];
	}>();
</script>

<template>
	<div
		class="result_title"
		:class="{ active }"
		:for="id"
		@click="emit('set_selection', song_result)"
		@dblclick="emit('add_song')"
	>
		<span v-for="title of song_result?.title">
			{{ title }}
		</span>
	</div>
</template>

<style scoped>
	.result_title {
		display: block;
		overflow: visible;

		background-color: var(--color-item);

		padding-inline: 0.5rem;
		padding-block: 0.25rem;

		border-radius: 0.25rem;

		cursor: pointer;
	}

	.result_title:hover {
		background-color: var(--color-item-hover);
	}

	.result_title.active {
		background-color: var(--color-active);
	}

	.result_title.active:hover {
		background-color: var(--color-active-hover);
	}

	.result_title > span {
		font-weight: lighter;
	}

	.result_title > span:not(:first-child) {
		color: var(--color-text-disabled);
		font-style: italic;
	}

	.result_title > span:not(:first-child)::before {
		content: " ";
	}
</style>

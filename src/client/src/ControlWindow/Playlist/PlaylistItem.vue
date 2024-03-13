<script setup lang="ts">
	import { ref, watch, onMounted } from "vue";

	const props = defineProps<{
		caption: string;
		color: string;
		selectable?: boolean;
		selected?: boolean;
		active?: boolean;
		scroll?: boolean;
	}>();

	defineEmits<{
		set_active: [];
	}>();

	const item = ref<HTMLDivElement>();

	watch(
		() => [props.selected, props.scroll],
		() => {
			scroll_into_view();
		}
	);

	onMounted(() => {
		scroll_into_view();
	});

	function scroll_into_view() {
		if (props.selected && props.scroll) {
			item.value?.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}
</script>

<template>
	<div
		ref="item"
		class="playlist_item_wrapper"
		:class="{
			selectable,
			selected,
			active
		}"
		tabindex="0"
		@keydown.enter="$emit('set_active')"
	>
		<div class="item_color_indicator" :style="{ 'background-color': color }"></div>
		<div class="playlist_item">{{ caption }}</div>
	</div>
</template>

<style scoped>
	.playlist_item_wrapper {
		margin: 0.0625rem;
		margin-inline: 0.125rem;

		border: 0.125rem solid transparent;

		border-radius: 0.125rem;

		display: flex;
		align-items: stretch;
	}

	.playlist_item_wrapper.selectable {
		cursor: pointer;
	}

	.playlist_item_wrapper:not(.selectable) {
		color: var(--color-text-disabled);
		font-style: italic;
	}

	.playlist_item_wrapper:first-of-type {
		margin-top: 0.125rem;
	}

	.item_color_indicator {
		height: auto;
		width: 1.5rem;
	}

	.playlist_item {
		background-color: var(--color-item);

		cursor: inherit;

		padding: 0.375rem;
		padding-left: 0.5rem;

		flex: 1;

		text-wrap: nowrap;
	}

	.playlist_item_wrapper.selectable:hover > .playlist_item {
		background-color: var(--color-item-hover);
	}

	.playlist_item_wrapper.active > .playlist_item {
		background-color: var(--color-active);
	}

	.playlist_item_wrapper.selectable.active:hover > .playlist_item {
		background-color: var(--color-active-hover);
	}

	.playlist_item_wrapper.selected {
		border-color: var(--color-text);
	}

	.item_color_indicator {
		height: auto;
		width: 1.5rem;
	}
</style>

<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";

	const props = defineProps<{
		color: string;

		disabled?: boolean;
		selected?: boolean;
		active?: boolean;
		scroll?: boolean;
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
			displayable: !disabled,
			selected,
			active
		}"
		tabindex="0"
	>
		<div class="item_color_indicator" :style="{ 'background-color': color }"></div>
		<div class="playlist_item" ref="caption_element">
			<slot></slot>
		</div>
	</div>
</template>

<style scoped>
	.playlist_item_wrapper {
		background-color: var(--color-item);

		border-radius: 0.25rem;

		display: flex;
		align-items: stretch;

		overflow: visible;
	}

	.playlist_item_wrapper.displayable {
		cursor: pointer;
	}

	.playlist_item_wrapper:not(.displayable) {
		color: var(--color-text-disabled);
		font-style: italic;
	}

	.playlist_item_wrapper > *:first-child {
		border-top-left-radius: 0.25rem;
		border-bottom-left-radius: 0.25rem;
	}

	.playlist_item_wrapper > *:last-child {
		border-top-right-radius: 0.25rem;
		border-bottom-right-radius: 0.25rem;
	}

	.item_color_indicator {
		height: auto;
		width: 1.5rem;

		display: flex;

		justify-content: center;
		align-items: center;
	}

	.playlist_item {
		font-weight: lighter;

		cursor: inherit;

		padding: 0.375rem;
		padding-left: 0.5rem;

		flex: 1;

		text-wrap: nowrap;
	}

	.playlist_item_wrapper.displayable:hover {
		background-color: var(--color-item-hover);
	}

	.playlist_item_wrapper.active {
		background-color: var(--color-active);
	}

	.playlist_item_wrapper.displayable.active:hover {
		background-color: var(--color-active-hover);
	}

	.playlist_item_wrapper.selected {
		outline: 0.125rem solid var(--color-text);
	}
</style>

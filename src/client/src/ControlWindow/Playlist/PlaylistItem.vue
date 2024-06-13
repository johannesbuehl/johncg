<script setup lang="ts">
	import { ref, watch, onMounted, nextTick } from "vue";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";
	import Globals from "@/Globals";

	const props = defineProps<{
		index: number;
		selected?: boolean;
		active?: boolean;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		set_active: [];
		delete: [];
	}>();

	const item = ref<HTMLDivElement>();
	const caption_element = ref<HTMLDivElement>();
	const item_props = defineModel<ClientPlaylistItem>("item_props", { required: true });

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

	function delete_item() {
		Globals.ws?.send<JCGPRecv.DeleteItem>({
			command: "delete_item",
			position: props.index
		});
	}

	defineExpose({
		delete_item,
		props: item_props.value
	});
</script>

<template>
	<div
		ref="item"
		class="playlist_item_wrapper"
		:class="{
			displayable: item_props.displayable,
			selected,
			active
		}"
		tabindex="0"
		@keydown.enter="emit('set_active')"
		@keydown.delete="delete_item"
	>
		<div class="item_color_indicator" :style="{ 'background-color': item_props.color }"></div>
		<div class="playlist_item" ref="caption_element">
			{{ item_props.caption }}
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

	.playlist_item_wrapper.displayable:hover > .playlist_item {
		background-color: var(--color-item-hover);
	}

	.playlist_item_wrapper.active > .playlist_item {
		background-color: var(--color-active);
	}

	.playlist_item_wrapper.displayable.active:hover > .playlist_item {
		background-color: var(--color-active-hover);
	}

	.playlist_item_wrapper.selected {
		outline: 0.125rem solid var(--color-text);
	}
</style>

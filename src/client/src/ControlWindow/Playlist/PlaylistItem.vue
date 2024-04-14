<script setup lang="ts">
	import { ref, watch, onMounted, nextTick } from "vue";

	import type { ClientPlaylistItem } from "@server/Playlist";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";

	const props = defineProps<{
		ws: WebSocket;
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
	const color_picker = ref<HTMLInputElement>();
	const edit_caption_active = ref<boolean>(false);
	const caption_element = ref<HTMLDivElement>();
	const item_props = defineModel<ClientPlaylistItem>("item_props", { required: true });

	watch(
		() => [props.selected, props.scroll],
		() => {
			scroll_into_view();
		}
	);

	let input_debounce_timeout_id: NodeJS.Timeout | undefined = undefined;
	watch(
		() => item_props.value.color,
		(cc) => {
			clearTimeout(input_debounce_timeout_id);

			input_debounce_timeout_id = setTimeout(() => {
				const message: JGCPRecv.UpdateItem = {
					command: "update_item",
					props: { ...item_props.value, color: cc },
					index: props.index
				};

				props.ws.send(JSON.stringify(message));
			}, 500);
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

	function edit_caption() {
		edit_caption_active.value = true;

		nextTick().then(() => caption_element.value?.focus());
	}

	function rename(save: boolean = true) {
		edit_caption_active.value = false;

		if (save) {
			if (caption_element.value?.innerHTML) {
				item_props.value.caption = caption_element.value?.innerHTML;

				const message: JGCPRecv.UpdateItem = {
					command: "update_item",
					index: props.index,
					props: item_props.value
				};

				props.ws.send(JSON.stringify(message));
			}
		} else {
			if (caption_element.value) {
				caption_element.value.innerHTML = item_props.value.caption;
			}
		}
	}

	function delete_item() {
		if (!edit_caption_active.value) {
			const message: JGCPRecv.DeleteItem = {
				command: "delete_item",
				position: props.index
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	defineExpose({
		edit_caption,
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
		@keydown.f2="edit_caption"
		@keydown.delete="delete_item"
	>
		<div
			class="item_color_indicator"
			:style="{ 'background-color': item_props.color }"
			@contextmenu="
				color_picker?.click();
				$event.preventDefault();
			"
		></div>
		<div
			class="playlist_item"
			ref="caption_element"
			:tabindex="edit_caption_active ? 0 : undefined"
			:class="{ editing: edit_caption_active }"
			:contenteditable="edit_caption_active ? true : false"
			@blur.enter="rename()"
			@keydown.enter="rename()"
			@keydown.escape="rename(false)"
			@keydown="edit_caption_active ? $event.stopPropagation() : undefined"
			@contextmenu="edit_caption_active ? $event.stopPropagation() : undefined"
		>
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

	.playlist_item.editing {
		font-weight: unset;
	}

	.playlist_item.editing:focus::after {
		border: unset;
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

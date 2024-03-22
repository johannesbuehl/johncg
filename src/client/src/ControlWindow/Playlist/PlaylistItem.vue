<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { ref, watch, onMounted, nextTick } from "vue";

	import type { ClientPlaylistItem } from "@server/Playlist";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";

	library.add(fas.faEdit);

	const props = defineProps<{
		ws: WebSocket;
		index: number;
		selected?: boolean;
		active?: boolean;
		scroll?: boolean;
	}>();

	defineEmits<{
		set_active: [];
	}>();

	const item = ref<HTMLDivElement>();
	const color_picker = ref<HTMLInputElement>();
	const show_context_menu = ref<boolean>(false);
	const edit_caption = ref<boolean>(false);
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

	function context_menu(event: MouseEvent) {
		event.preventDefault();

		console.debug("context");

		show_context_menu.value = true;
	}

	function rename() {
		edit_caption.value = false;

		if (caption_element.value?.innerHTML) {
			item_props.value.caption = caption_element.value?.innerHTML;

			const message: JGCPRecv.UpdateItem = {
				command: "update_item",
				index: props.index,
				props: item_props.value
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	function delete_item() {
		if (!edit_caption.value) {
			const message: JGCPRecv.DeleteItem = {
				command: "delete_item",
				position: props.index
			};

			props.ws.send(JSON.stringify(message));
		}
	}
</script>

<template>
	<div
		ref="item"
		class="playlist_item_wrapper"
		:class="{
			selectable: item_props.selectable,
			selected,
			active
		}"
		tabindex="0"
		@keydown.enter="$emit('set_active')"
		@keydown.f2="
			edit_caption = true;
			nextTick().then(() => caption_element?.focus());
		"
		@keydown.delete="delete_item"
	>
		<input type="color" style="display: none" ref="color_picker" v-model="item_props.color" />
		<div
			class="item_color_indicator"
			:style="{ 'background-color': item_props.color }"
			@contextmenu="
				color_picker?.click();
				$event.preventDefault();
			"
		>
			<FontAwesomeIcon class="edit_icon" :icon="['fas', 'edit']" />
		</div>
		<div
			class="playlist_item"
			ref="caption_element"
			:tabindex="edit_caption ? 0 : undefined"
			:class="{ editing: edit_caption }"
			:contenteditable="edit_caption ? true : false"
			@contextmenu="context_menu"
			@keydown.enter.capture="rename()"
			@blur.enter="rename"
			@keydown.capture="edit_caption ? $event.stopPropagation() : undefined"
		>
			{{ item_props.caption }}
		</div>
	</div>
</template>

<style scoped>
	.playlist_item_wrapper {
		background-color: var(--color-item);

		border-style: none;
		border-radius: 0.25rem !important;

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

	.item_color_indicator {
		height: auto;
		width: 1.5rem;

		display: flex;

		justify-content: center;
		align-items: center;
	}

	.edit_icon {
		opacity: 0;
	}

	.edit_icon:hover {
		opacity: 1;
	}

	.playlist_item {
		cursor: inherit;

		padding: 0.375rem;
		padding-left: 0.5rem;

		flex: 1;

		text-wrap: nowrap;
	}

	.playlist_item.editing {
		background-color: var(--color-active);
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
		outline: 0.125rem solid var(--color-text);
	}

	.item_color_indicator {
		height: auto;
		width: 1.5rem;
	}
</style>

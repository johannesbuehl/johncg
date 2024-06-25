<script setup lang="ts">
	import { ref } from "vue";
	import { VueDraggableNext as Draggable } from "vue-draggable-next";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import ContextMenu from "./ContextMenu.vue";
	import PlaylistItem from "./PlaylistItem.vue";
	import Globals from "@/Globals";
	import { stop_event } from "@/App.vue";

	import type * as JCGPSend from "@server/JCGPSendMessages";
	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ActiveItemSlide } from "@server/Playlist";
	import type { ClientPlaylistItem, ItemProps } from "@server/PlaylistItems/PlaylistItem";

	library.add(fas.faBrush, fas.faTrash, fas.faClone, fas.faFont, fas.faPen);

	export interface DragEndEvent {
		oldIndex: number;
		newIndex: number;
	}

	const props = defineProps<{
		selected: number | null;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		selection: [item: number];
		dragged: [from: number, to: number];
		set_active: [item: number];
		edit: [index: number];
	}>();

	const playlist = defineModel<JCGPSend.Playlist>("playlist", { required: true });

	const context_menu_position = ref<{ x: number; y: number }>();

	function on_end(evt: DragEndEvent) {
		// send only, if the index has changed
		if (evt.oldIndex !== evt.newIndex) {
			emit("dragged", evt.oldIndex, evt.newIndex);
		}
	}

	function on_change(evt: { added: { element: ClientPlaylistItem; newIndex: number } }) {
		Object.entries(evt).forEach(([type, data]) => {
			if (type === "added") {
				Globals.ws?.send<JCGPRecv.AddItem>({
					command: "add_item",
					props: data.element,
					index: data.newIndex,
					set_active: true
				});
			}
		});

		return false;
	}

	function navigate_selection(target: EventTarget, origin: number, steps: number) {
		let new_selection = origin + steps;

		while (new_selection < 0) {
			new_selection += playlist.value?.playlist_items.length ?? 1;
		}

		while (new_selection >= (playlist.value?.playlist_items.length ?? 1)) {
			new_selection -= playlist.value?.playlist_items.length ?? 1;
		}

		emit("selection", new_selection);

		if (steps === 1) {
			((target as HTMLDivElement)?.nextSibling as HTMLDivElement)?.focus();
		} else {
			((target as HTMLDivElement)?.previousSibling as HTMLDivElement)?.focus();
		}
	}

	const context_menu_picker_item = ref<{ element: ClientPlaylistItem; index: number }>();
	function show_context_menu(event: MouseEvent, element: ClientPlaylistItem, index: number) {
		context_menu_picker_item.value = {
			element,
			index
		};

		stop_event(event);

		context_menu_position.value = event;
	}

	const items_list = ref<(typeof PlaylistItem)[]>([]);

	function duplicate_item(index: number, props?: ItemProps) {
		if (props === undefined) {
			props = playlist.value?.playlist_items[index];
		}

		if (props !== undefined) {
			Globals.ws?.send<JCGPRecv.AddItem>({
				command: "add_item",
				props,
				index
			});
		}
	}

	function delete_item(position: number) {
		Globals.ws?.send<JCGPRecv.DeleteItem>({
			command: "delete_item",
			position
		});
	}
</script>

<template>
	<div class="wrapper">
		<div class="header">Playlist</div>
		<Draggable
			id="playlist"
			:list="playlist?.playlist_items"
			:group="{ name: 'playlist', pull: false }"
			animation="150"
			easing="cubic-bezier(1, 0, 0, 1)"
			ghostClass="dragged_ghost"
			delay-on-touch-only="true"
			delay="250"
			@end="on_end"
			@change="on_change"
		>
			<PlaylistItem
				v-for="(element, index) in playlist?.playlist_items"
				ref="items_list"
				:index="index"
				:item_props="element"
				:selected="selected === index"
				:active="active_item_slide?.item === index"
				:scroll="scroll"
				@click="emit('selection', index)"
				@dblclick="emit('set_active', index)"
				@keydown.enter="emit('set_active', index)"
				@keydown.delete.prevent="delete_item(index)"
				@keydown.ctrl.d.prevent="duplicate_item(index)"
				@keydown.ctrl.e.prevent="emit('edit', index)"
				@keydown.up="navigate_selection($event.target, index, -1)"
				@keydown.down="navigate_selection($event.target, index, 1)"
				@contextmenu="show_context_menu($event, element, index)"
			/>
		</Draggable>
	</div>
	<ContextMenu
		class="context_menu"
		v-if="context_menu_position"
		:position="context_menu_position ?? { x: 0, y: 0 }"
		@close="context_menu_position = undefined"
	>
		<div
			@click="context_menu_picker_item ? emit('edit', context_menu_picker_item.index) : undefined"
		>
			<FontAwesomeIcon :icon="['fas', 'pen']" />
			Edit item
		</div>
		<div
			@click="
				context_menu_picker_item
					? duplicate_item(context_menu_picker_item.index, context_menu_picker_item.element)
					: undefined
			"
		>
			<FontAwesomeIcon :icon="['fas', 'clone']" />
			Duplicate
		</div>
		<div
			@click="
				context_menu_picker_item
					? items_list[context_menu_picker_item.index].value.delete_item()
					: undefined
			"
		>
			<FontAwesomeIcon :icon="['fas', 'trash']" />
			Delete
		</div>
	</ContextMenu>
</template>

<style scoped>
	.wrapper {
		width: 24rem;

		border-radius: 0.25rem;

		overflow: auto;

		background-color: var(--color-container);

		display: flex;
		flex-direction: column;
	}

	.header {
		text-align: center;

		background-color: var(--color-item);

		border-radius: inherit;

		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
		padding-left: 0.75rem;
	}

	#playlist {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: 0.25rem;

		padding: 0.25rem;

		overflow: auto;
	}

	.dragged_ghost {
		opacity: 0;
	}

	.dragged {
		opacity: 1 !important;
	}

	.context_menu > * {
		display: flex;
		align-items: center;

		gap: 0.25rem;
	}

	.context_menu > * > svg {
		aspect-ratio: 1;
	}
</style>

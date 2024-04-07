<script setup lang="ts">
	import { ref, type Ref, type VNodeRef } from "vue";
	import Draggable from "vuedraggable";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import ContextMenu from "./ContextMenu.vue";
	import PlaylistItem from "./PlaylistItem.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ActiveItemSlide } from "@server/Playlist";
	import { type ItemProps } from "@server/PlaylistItems/PlaylistItem";

	library.add(fas.faBrush, fas.faTrash, fas.faClone, fas.faFont, fas.faPen);

	export interface DragEndEvent {
		oldIndex: number;
		newIndex: number;
	}

	const props = defineProps<{
		ws: WebSocket;
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

	const playlist = defineModel<JGCPSend.Playlist>("playlist");

	const context_menu_position = ref<{ x: number; y: number }>();
	const color_picker = ref<HTMLInputElement>();

	function on_end(evt: DragEndEvent) {
		// send only, if the index has changed
		if (evt.oldIndex !== evt.newIndex) {
			emit("dragged", evt.oldIndex, evt.newIndex);
		}
	}

	function on_change(evt: { added: { element: ItemProps; newIndex: number } }) {
		Object.entries(evt).forEach(([type, data]) => {
			if (type === "added") {
				const message: JGCPRecv.AddItem = {
					command: "add_item",
					props: data.element,
					index: data.newIndex,
					set_active: true
				};

				props.ws.send(JSON.stringify(message));
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

	const current_picked_item_index = ref<number>(0);
	function show_context_menu(event: MouseEvent, index: number) {
		current_picked_item_index.value = index;

		event.preventDefault();
		event.stopPropagation();

		context_menu_position.value = event;
	}

	let items_list: Ref<typeof PlaylistItem>[] = [];
	function list_ref(el: typeof PlaylistItem): VNodeRef | undefined {
		if (el) {
			const re = ref(el);

			items_list.push(re);

			return re;
		}
	}

	function duplicate_item(item_props: ItemProps) {
		const message: JGCPRecv.AddItem = {
			command: "add_item",
			props: item_props,
			index: current_picked_item_index.value + 1
		};

		props.ws.send(JSON.stringify(message));
	}
</script>

<template>
	<div class="wrapper">
		<div class="header">Playlist</div>
		<Draggable
			id="playlist"
			:list="playlist?.playlist_items"
			:group="{ name: 'playlist', pull: false }"
			item-key="item"
			animation="150"
			easing="cubic-bezier(1, 0, 0, 1)"
			ghostClass="dragged_ghost"
			@end="on_end"
			@change="on_change"
		>
			<template #item="{ element, index }">
				<PlaylistItem
					:ref="list_ref"
					:index="index"
					:ws="ws"
					:item_props="element"
					:selected="selected === index"
					:active="active_item_slide?.item === index"
					:scroll="scroll"
					@click="emit('selection', index)"
					@dblclick="emit('set_active', index)"
					@set_active="emit('set_active', index)"
					@keydown.up="navigate_selection($event.target, index, -1)"
					@keydown.down="navigate_selection($event.target, index, 1)"
					@contextmenu="show_context_menu($event, index)"
				/>
			</template>
		</Draggable>
	</div>
	<ContextMenu
		class="context_menu"
		v-if="context_menu_position"
		:position="context_menu_position ?? { x: 0, y: 0 }"
		@close="context_menu_position = undefined"
	>
		<div @click="emit('edit', current_picked_item_index)">
			<FontAwesomeIcon :icon="['fas', 'pen']" />
			Edit item
		</div>
		<input
			ref="color_picker"
			id="item_color_picker_context_menu"
			type="color"
			style="visibility: hidden; position: absolute"
			v-model="items_list[current_picked_item_index].value.props.color"
			@click="$event.stopPropagation()"
		/>
		<label
			for="item_color_picker_context_menu"
			@click.capture="
				color_picker?.click();
				$event.stopPropagation();
				$event.preventDefault();
			"
		>
			<FontAwesomeIcon :icon="['fas', 'brush']" />
			Change Color
		</label>
		<div @click="items_list[current_picked_item_index].value.edit_caption()">
			<FontAwesomeIcon :icon="['fas', 'font']" />
			Rename
		</div>
		<div @click="duplicate_item(items_list[current_picked_item_index].value.props)">
			<FontAwesomeIcon :icon="['fas', 'clone']" />
			Duplicate
		</div>
		<div @click="items_list[current_picked_item_index].value.delete_item()">
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

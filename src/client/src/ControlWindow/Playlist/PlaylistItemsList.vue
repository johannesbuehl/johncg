<script setup lang="ts">
	import Draggable from "vuedraggable";

	import PlaylistItem from "./PlaylistItem.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ActiveItemSlide } from "@server/Playlist";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import { ControlWindowState } from "../ControlWindowState";

	export interface DragEndEvent {
		oldIndex: number;
		newIndex: number;
	}

	const props = defineProps<{
		ws: WebSocket;
		playlist?: JGCPSend.Playlist;
		selected?: number;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		selection: [item: number];
		dragged: [from: number, to: number];
		set_active: [item: number];
	}>();

	const control_window_state = defineModel<ControlWindowState>({ required: true });

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
					index: data.newIndex
				};

				props.ws.send(JSON.stringify(message));
			}
		});

		return false;
	}

	function navigate_selection(target: EventTarget, origin: number, steps: number) {
		let new_selection = origin + steps;

		while (new_selection < 0) {
			new_selection += props.playlist?.playlist_items.length ?? 1;
		}

		while (new_selection >= (props.playlist?.playlist_items.length ?? 1)) {
			new_selection -= props.playlist?.playlist_items.length ?? 1;
		}

		emit("selection", new_selection);

		if (steps === 1) {
			((target as HTMLDivElement)?.nextSibling as HTMLDivElement)?.focus();
		} else {
			((target as HTMLDivElement)?.previousSibling as HTMLDivElement)?.focus();
		}
	}
</script>

<template>
	<div class="wrapper">
		<div class="header">Playlist</div>
		<Draggable
			id="playlist"
			:list="playlist?.playlist_items"
			:group="{ name: 'playlist', pull: false, put: true }"
			item-key="item"
			animation="150"
			easing="cubic-bezier(1, 0, 0, 1)"
			ghostClass="dragged_ghost"
			fallbackClass="dragged"
			@end="on_end"
			@change="on_change"
		>
			<template #item="{ element, index }">
				<PlaylistItem
					:index="index"
					:ws="ws"
					:item_props="element"
					:selected="selected === index"
					:active="active_item_slide?.item === index"
					:scroll="scroll"
					@click="$emit('selection', index)"
					@dblclick="$emit('set_active', index)"
					@set_active="$emit('set_active', index)"
					@keydown.up="navigate_selection($event.target, index, -1)"
					@keydown.down="navigate_selection($event.target, index, 1)"
				/>
			</template>
		</Draggable>
	</div>
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
	}

	.dragged_ghost {
		opacity: 0;
	}

	.dragged {
		opacity: 1 !important;
	}
</style>

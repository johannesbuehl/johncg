<script setup lang="ts">
	import draggable from "vuedraggable";

	import PlaylistItem from "./PlaylistItem.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { ActiveItemSlide } from "@server/Playlist";

	export interface DragEndEvent {
		oldIndex: number;
		newIndex: number;
	}

	const props = defineProps<{
		playlist?: JGCPSend.Playlist;
		selected?: number;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		selection: [item: number];
		dragged: [from: number, to: number];
		set_active: [item: number];
		delete: [item: number];
	}>();

	function onDragEnd(evt: DragEndEvent) {
		// send only, if the index has changed
		if (evt.oldIndex !== evt.newIndex) {
			emit("dragged", evt.oldIndex, evt.newIndex);
		}
	}

	function navigate_selection(target: EventTarget, origin: number, steps: number) {
		console.debug(origin);

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
		<draggable
			:list="playlist?.playlist_items"
			item-key="item"
			animation="150"
			easing="cubic-bezier(1, 0, 0, 1)"
			ghostClass="dragged_ghost"
			fallbackClass="dragged"
			@end="onDragEnd"
		>
			<template #item="{ element, index }">
				<PlaylistItem
					:caption="element.caption"
					:color="element.color"
					:selectable="element.selectable"
					:selected="selected === index"
					:active="active_item_slide?.item === index"
					:scroll="scroll"
					@click="$emit('selection', index)"
					@dblclick="$emit('set_active', index)"
					@set_active="$emit('set_active', index)"
					@keydown.up="navigate_selection($event.target, index, -1)"
					@keydown.down="navigate_selection($event.target, index, 1)"
					@keydown.delete="$emit('delete', index)"
				/>
			</template>
		</draggable>
	</div>
</template>

<style scoped>
	.wrapper {
		width: 24rem;

		border-radius: 0.25rem;

		overflow: auto;

		background-color: var(--color-container);
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

	.dragged_ghost {
		opacity: 0;
	}

	.dragged {
		opacity: 1 !important;
	}
</style>

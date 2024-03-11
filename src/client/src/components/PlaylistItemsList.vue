<script setup lang="ts">
import draggable from "vuedraggable";

import PlaylistItem from "./PlaylistItem.vue";

import * as JGCPSend from "../../../server/JGCPSendMessages";
import type { ActiveItemSlide } from "../../../server/Playlist";

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
}>();

emit("selection", props.playlist?.metadata.item ?? 0);

function onDragEnd(evt: DragEndEvent) {
	// send only, if the index has changed
	if (evt.oldIndex !== evt.newIndex) {
		emit("dragged", evt.oldIndex, evt.newIndex);
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
					:caption="element.Caption"
					:color="element.Color"
					:selectable="element.selectable"
					:selected="selected === index"
					:active="active_item_slide?.item === index"
					:scroll="scroll"
					@click="$emit('selection', index)"
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

	font-weight: bold;

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

<script setup lang="ts">
import PlaylistItem from './PlaylistItem.vue';

import * as JGCPSend from "../../../server/JGCPSendMessages";
import type { ActiveItemSlide } from "../../../server/Playlist";

const props = defineProps<{
	playlist?: JGCPSend.Playlist;
	selected?: number;
	active_item_slide?: ActiveItemSlide;
	scroll?: boolean;
}>();

const emit = defineEmits<{
	selection: [item: number];
}>()

emit("selection", props.playlist?.metadata.item ?? 0);
</script>

<template>
	<div class="wrapper">
		<div class="header">Playlist</div>
		<div>
			<PlaylistItem
				v-for="(playlist_item, index) in playlist?.playlist_items"
				:key="index"
				:caption="playlist_item.Caption"
				:color="playlist_item.Color"
				:selectable="playlist_item.selectable"
				:selected="selected === index"
				:active="active_item_slide?.item === index"
				:scroll="scroll"
				@click="$emit('selection', index)"
			/>
		</div>
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
</style>
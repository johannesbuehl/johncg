<script setup lang="ts">
	import EditSong from "./EditSong.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";

	const props = defineProps<{
		ws: WebSocket;
		search_results?: JGCPSend.SearchResults;
		item_index: number;
	}>();

	const item_props = defineModel<ItemProps | undefined>("item_props", { required: true });

	function update_item() {
		if (item_props.value !== undefined) {
			const message: JGCPRecv.UpdateItem = {
				command: "update_item",
				props: item_props.value,
				index: props.item_index
			};

			props.ws.send(JSON.stringify(message));
		}
	}
</script>

<template>
	<div id="edit_item_wrapper">
		<div v-if="item_props?.type !== undefined" id="item_editor_general">Caption - Color</div>
		<EditSong
			v-if="item_props?.type === 'song'"
			v-model:song_props="item_props"
			:ws="ws"
			:song_data="search_results"
			@update="update_item"
		/>
		<div v-if="item_props?.type === undefined" id="edit_part_placeholder">
			Select an item in the playlist for editing
		</div>
	</div>
</template>

<style scoped>
	#edit_item_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: 0.25rem;
	}

	#item_editor_general {
		background-color: var(--color-container);
	}

	#edit_part_placeholder {
		background-color: var(--color-container);

		padding: 0.25rem;

		border-radius: 0.25rem;

		flex: 1;
	}
</style>

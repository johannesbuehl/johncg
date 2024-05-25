<script setup lang="ts">
	import { onUnmounted } from "vue";

	import { type ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";

	const props = defineProps<{
		ws: WebSocket;
		item_index: number;
	}>();

	const item_props = defineModel<ClientPlaylistItem>("item_props", { required: true });

	onUnmounted(() => {
		if (item_props.value !== null) {
			const message: JGCPRecv.UpdateItem = {
				command: "update_item",
				index: props.item_index,
				props: item_props.value
			};

			props.ws.send(JSON.stringify(message));
		}
	});
</script>

<template></template>

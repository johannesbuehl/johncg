<script setup lang="ts">
	import { onUnmounted } from "vue";

	import type { ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import Globals from "@/Globals";

	const props = defineProps<{
		item_index: number;
	}>();

	const item_props = defineModel<ClientPlaylistItem>("item_props", { required: true });

	onUnmounted(() => {
		if (item_props.value !== null) {
			Globals.ws?.send<JGCPRecv.UpdateItem>({
				command: "update_item",
				index: props.item_index,
				props: item_props.value
			});
		}
	});
</script>

<template></template>

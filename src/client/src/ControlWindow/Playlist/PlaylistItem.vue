<script setup lang="ts">
	import { ref, watch, onMounted } from "vue";

	import Globals from "@/Globals";
	import PlaylistItemDummy from "./PlaylistItemDummy.vue";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";

	const props = defineProps<{
		index: number;
		selected?: boolean;
		active?: boolean;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		set_active: [];
		delete: [];
	}>();
	const item_props = defineModel<ClientPlaylistItem>("item_props", { required: true });

	function delete_item() {
		Globals.ws?.send<JCGPRecv.DeleteItem>({
			command: "delete_item",
			position: props.index
		});
	}

	defineExpose({
		delete_item,
		props: item_props.value
	});
</script>

<template>
	<PlaylistItemDummy
		:color="item_props.color"
		:disabled="!item_props.displayable"
		:selected="selected"
		:active="active"
		@keydown.enter="emit('set_active')"
		@keydown.delete="delete_item"
	>
		{{ item_props.caption }}
	</PlaylistItemDummy>
</template>

<style scoped></style>

<script setup lang="ts">
	import PlaylistItemDummy from "./PlaylistItemDummy.vue";

	import type { ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";

	const props = defineProps<{
		index: number;
		item_props: ClientPlaylistItem;
		selected?: boolean;
		active?: boolean;
		scroll?: boolean;
	}>();
</script>

<template>
	<PlaylistItemDummy
		:color="item_props.color"
		:disabled="!item_props.displayable"
		:selected="selected"
		:active="active"
		:scroll="scroll"
	>
		{{ item_props.caption }}
	</PlaylistItemDummy>
</template>

<style scoped></style>

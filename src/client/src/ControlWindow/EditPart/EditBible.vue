<script setup lang="ts">
	import { ref, watch } from "vue";

	import type { BibleFile, BibleProps } from "@server/PlaylistItems/Bible";
	import BibleSelector from "../AddPart/Parts/Bible/BibleSelector.vue";

	const props = defineProps<{
		ws: WebSocket;
		bible?: BibleFile;
	}>();

	const emit = defineEmits<{
		update: [bible_props?: BibleProps];
	}>();

	const bible_selector = ref<typeof BibleSelector>();

	const bible_props = defineModel<BibleProps>("item_props");
</script>

<template>
	<BibleSelector
		v-model:bible_props="bible_props"
		ref="bible_selector"
		:ws="ws"
		:bible="bible"
		@update="emit('update')"
	/>
</template>

<style scoped></style>

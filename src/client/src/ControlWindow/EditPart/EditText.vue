<script setup lang="ts">
	import { onUnmounted, ref, watch } from "vue";

	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ClientTextItem } from "@server/PlaylistItems/Text";
	import TextEditor from "../ItemDialogue/TextEditor.vue";
	import Globals from "@/Globals";

	const props = defineProps<{
		item_index: number;
	}>();

	const text = ref<string>("");

	const item_props = defineModel<ClientTextItem>("item_props", { required: true });

	watch(
		() => item_props.value.text,
		(data) => {
			text.value = data ?? "";
		},
		{ deep: true, immediate: true }
	);

	onUnmounted(() => {
		item_props.value.text = text.value.length > 0 ? text.value : "";

		Globals.ws?.send<JGCPRecv.UpdateItem>({
			command: "update_item",
			index: props.item_index,
			props: item_props.value
		});
	});
</script>

<template>
	<TextEditor v-model:text="text" />
</template>

<style scoped></style>

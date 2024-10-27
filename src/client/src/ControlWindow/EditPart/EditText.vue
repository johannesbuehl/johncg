<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";

	import type { ClientTextItem } from "@server/PlaylistItems/Text";
	import TextEditor from "../ItemDialogue/TextEditor.vue";

	defineProps<{
		item_index: number;
	}>();

	const text = ref<string>("");

	const item_props = defineModel<ClientTextItem>("item_props", { required: true });

	onMounted(() => {
		text.value = item_props.value.text ?? "";
	});

	watch(text, (text) => {
		item_props.value.text = text;
	});
</script>

<template>
	<TextEditor v-model:text="text" />
</template>

<style scoped></style>

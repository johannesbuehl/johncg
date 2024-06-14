<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { onMounted, ref } from "vue";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import TextEditor from "@/ControlWindow/ItemDialogue/TextEditor.vue";
	import Globals from "@/Globals";

	import type { TextProps } from "@server/PlaylistItems/Text";

	library.add(fas.faPlus);

	const input = ref<HTMLInputElement>();
	const text_input = ref<string>("");

	onMounted(() => {
		input.value?.focus();
	});

	const emit = defineEmits<{
		add: [item_props: TextProps];
		refresh: [];
	}>();

	function add_text() {
		if (text_input.value !== undefined && text_input.value.length > 0) {
			emit("add", {
				type: "text",
				caption: text_input.value.split("\n", 1)[0].slice(0, 50),
				color: Globals.color.text,
				text: text_input.value
			});
		}
	}
</script>

<template>
	<TextEditor v-model:text="text_input">
		<MenuButton @click="add_text"> <FontAwesomeIcon :icon="['fas', 'plus']" />Add Text </MenuButton>
	</TextEditor>
</template>

<style scoped></style>

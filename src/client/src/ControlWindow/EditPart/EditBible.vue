<script setup lang="ts">
	import { ref, watch } from "vue";

	import type { BibleFile, BibleProps, Book } from "@server/PlaylistItems/Bible";
	import BibleSelector from "../AddPart/Parts/Bible/BibleSelector.vue";

	const props = defineProps<{
		ws: WebSocket;
		bible?: BibleFile;
	}>();

	const emit = defineEmits<{
		update: [];
	}>();

	const book_selection = ref<Book>();

	const bible_props = defineModel<BibleProps>("item_props");

	watch(
		() => bible_props.value?.book_id,
		(book_id) => {
			if (props.bible !== undefined) {
				Object.values(props.bible).forEach((div) => {
					div.forEach((sec) => {
						sec.books.forEach((book) => {
							if (book.id === book_id) {
								book_selection.value = book;
							}
						});
					});
				});
			}
		}
	);
</script>

<template>
	<BibleSelector
		v-model:item_props="bible_props"
		:ws="ws"
		:bible="bible"
		:edit="true"
		v-model:book="book_selection"
	/>
</template>

<style scoped></style>

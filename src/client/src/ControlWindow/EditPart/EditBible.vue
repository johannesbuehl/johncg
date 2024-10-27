<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";

	import BibleSelector, {
		chapter_verse_selection_to_props,
		get_book_from_id
	} from "../ItemDialogue/BibleSelector.vue";

	import type { Book, ClientBibleItem } from "@server/PlaylistItems/Bible";
	import Globals from "@/Globals";

	defineProps<{
		item_index: number;
	}>();

	const book_selection = ref<Book>();
	const chapter_verse_selection = ref<Record<string, boolean[]>>({});

	const bible_props = defineModel<ClientBibleItem>("item_props");

	watch(book_selection, (book_selection) => {
		if (bible_props.value !== undefined && book_selection !== undefined) {
			bible_props.value.book_id = book_selection.id;
			bible_props.value.chapters = {};
		}
	});

	watch(
		chapter_verse_selection,
		(chapter_verse_selection) => {
			if (bible_props.value !== undefined) {
				bible_props.value.chapters = chapter_verse_selection_to_props(chapter_verse_selection);
			}
		},
		{ deep: true }
	);

	onMounted(() => {
		load_props();
	});

	watch(
		() => Globals.get_bible_file(),
		() => {
			if (book_selection.value === undefined) {
				load_props();
			}
		},
		{ immediate: true }
	);

	function load_props() {
		const bible_file = Globals.get_bible_file();

		if (bible_file !== undefined && bible_props.value !== undefined) {
			book_selection.value = get_book_from_id(bible_file, bible_props.value.book_id);

			chapter_verse_selection.value = Object.fromEntries(
				Object.entries(bible_props.value.chapters).map(([chapter, verses]) => [
					Number(chapter) - 1,
					Array(book_selection.value!.chapters[Number(chapter) - 1])
						.fill(false)
						.map((state, index) => verses.includes(index + 1))
				])
			);
		}
	}
</script>

<template>
	<BibleSelector
		ref="bible_selector"
		v-model:book_selection="book_selection"
		v-model:chapter_verse_selection="chapter_verse_selection"
	/>
</template>

<style scoped></style>

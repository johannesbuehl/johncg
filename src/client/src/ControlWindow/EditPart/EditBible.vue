<script setup lang="ts">
	import { onMounted, onUnmounted, ref, watch } from "vue";

	import BibleSelector, {
		chapter_verse_selection_to_props,
		get_book_from_id
	} from "../ItemDialogue/BibleSelector.vue";

	import type { Book, ClientBibleItem } from "@server/PlaylistItems/Bible";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import Globals from "@/Globals";

	const props = defineProps<{
		item_index: number;
	}>();

	const book_selection = ref<Book>();
	const chapter_verse_selection = ref<Record<string, boolean[]>>({});

	const bible_props = defineModel<ClientBibleItem>("item_props");

	watch(
		bible_props,
		() => {
			load_props();
		},
		{ immediate: true }
	);

	watch(
		() => Globals.get_bible_file(),
		() => {
			if (book_selection.value === undefined) {
				load_props();
			}
		},
		{ immediate: true }
	);

	onUnmounted(() => {
		update();
	});

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

	function update() {
		if (book_selection.value !== undefined && bible_props.value !== undefined) {
			Globals.ws?.send<JGCPRecv.UpdateItem>({
				command: "update_item",
				index: props.item_index,
				props: {
					...bible_props.value,
					book_id: book_selection.value.id,
					chapters: chapter_verse_selection_to_props(chapter_verse_selection.value)
				}
			});
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

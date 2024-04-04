<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import BibleSelector, {
		chapter_verse_selection_to_props,
		get_book_from_id
	} from "./BibleSelector.vue";

	library.add(fas.faPlus);

	import {
		create_bible_citation_string,
		type BibleFile,
		type BibleProps,
		type Book
	} from "@server/PlaylistItems/Bible";
	import { ref } from "vue";

	const props = defineProps<{
		bible?: BibleFile;
		ws: WebSocket;
	}>();

	const emit = defineEmits<{
		add: [bible_props: BibleProps];
	}>();

	const book_selection = defineModel<Book>("book_selection");
	const chapter_verse_selection = ref<Record<string, boolean[]>>();

	function add_item() {
		if (
			book_selection.value !== undefined &&
			props.bible !== undefined &&
			chapter_verse_selection.value !== undefined
		) {
			const chapters = chapter_verse_selection_to_props(chapter_verse_selection.value);

			const bible_props: BibleProps = {
				type: "bible",
				caption: create_bible_citation_string(
					get_book_from_id(props.bible, book_selection.value.id).name,
					chapters
				),
				color: "#ff0000",
				book_id: book_selection.value.id,
				chapters
			};

			emit("add", bible_props);
		}
	}
</script>

<template>
	<BibleSelector
		v-model:book_selection="book_selection"
		v-model:chapter_verse_selection="chapter_verse_selection"
		:ws="ws"
		:bible="bible"
	>
		<MenuButton icon="plus" text="Add Bible" @click="add_item()" />
	</BibleSelector>
</template>

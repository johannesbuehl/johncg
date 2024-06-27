<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { ref } from "vue";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import BibleSelector, {
		chapter_verse_selection_to_props,
		get_book_from_id
	} from "@/ControlWindow/ItemDialogue/BibleSelector.vue";
	import Globals from "@/Globals";

	import type { BibleProps, Book } from "@server/PlaylistItems/Bible";
	import { create_bible_citation_string } from "@server/lib";

	library.add(fas.faPlus);

	const emit = defineEmits<{
		add: [bible_props: BibleProps];
	}>();

	const book_selection = defineModel<Book>("book_selection");
	const chapter_verse_selection = ref<Record<string, boolean[]>>();

	function add_item() {
		const bible_file = Globals.get_bible_file();

		if (
			book_selection.value !== undefined &&
			bible_file !== undefined &&
			chapter_verse_selection.value !== undefined
		) {
			const chapters = chapter_verse_selection_to_props(chapter_verse_selection.value);

			const bible_props: BibleProps = {
				type: "bible",
				caption: create_bible_citation_string(
					get_book_from_id(bible_file, book_selection.value.id).name,
					chapters
				),
				color: Globals.color.bible,
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
		:bible="Globals.get_bible_file()"
	>
		<MenuButton @click="add_item()">
			<FontAwesomeIcon :icon="['fas', 'plus']" />Add Bible
		</MenuButton>
	</BibleSelector>
</template>

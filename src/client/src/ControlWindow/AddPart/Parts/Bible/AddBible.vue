<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import BibleSelector, {
		chapter_verse_selection_to_props,
		get_book_from_id
	} from "./BibleSelector.vue";

	library.add(fas.faPlus);

	import { type BibleFile, type BibleProps, type Book } from "@server/PlaylistItems/Bible";
	import { ref } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { create_bible_citation_string } from "@server/lib";

	const props = defineProps<{
		bible?: BibleFile;
	}>();

	const emit = defineEmits<{
		add: [bible_props: BibleProps];
		refresh: [];
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
				color: "#00EEFF",
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
		:bible="bible"
		@refresh="emit('refresh')"
	>
		<MenuButton @click="add_item()">
			<FontAwesomeIcon :icon="['fas', 'plus']" />Add Bible
		</MenuButton>
	</BibleSelector>
</template>

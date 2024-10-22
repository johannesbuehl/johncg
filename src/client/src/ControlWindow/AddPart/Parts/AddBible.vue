<script lang="ts">
	function create_bible_citation_string(book_id: string, chapters: BibleProps["chapters"]) {
		const seperators: BibleCitationSeperatorsMap = {
			sep_book_chapter: " ",
			sep_chapter: "; ",
			sep_chapter_verse: ",",
			sep_verse: ".",
			range_verse: "-"
		};

		// add the individual chapters
		const chapter_strings = Object.entries(chapters).map(([chapter, verses]): string => {
			// stop the loop-iteration, if there are no verses defined
			if (verses.length === 0) {
				return `${chapter}`;
			}

			const verse_range: { start: number; last: number } = {
				start: verses[0],
				last: verses[0]
			};

			// add the individual verses
			const verse_strings: string[] = [];

			for (let index = 1; index <= verses.length; index++) {
				const verse = verses[index];

				// if the current verse is not a direct successor of the last one, return the previous verse_range
				if (verse !== verse_range.last + 1) {
					// if in the verse-range start and last are the same, return them as a single one
					if (verse_range.start === verse_range.last) {
						verse_strings.push(verse_range.last.toString());
					} else {
						verse_strings.push(`${verse_range.start}${seperators.range_verse}${verse_range.last}`);
					}

					verse_range.start = verse;
				}

				verse_range.last = verse;
			}

			return `${chapter}${seperators.sep_chapter_verse}${verse_strings.filter(Boolean).join(seperators.sep_verse)}`;
		});

		return `${book_id}${seperators.sep_book_chapter}${chapter_strings.join(seperators.sep_chapter)}`;
	}
</script>

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
	import type { BibleCitationSeperatorsMap } from "@server/config/config";

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

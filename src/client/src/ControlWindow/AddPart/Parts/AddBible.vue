<script setup lang="ts">
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import {
		create_bible_citation_string,
		type BibleFile,
		type BibleProps,
		type Book
	} from "@server/PlaylistItems/Bible";
	import { onMounted, ref, watch } from "vue";

	library.add(fas.faPlus);

	const props = defineProps<{
		bible?: BibleFile;
		ws: WebSocket;
	}>();

	// store the currently selected book
	const book_selection = ref<Book>();
	// store the currently selected chapter
	const chapter_selection = ref<number>(0);
	// maps the chapters of the book and their verses, wether they are selected or not
	const verse_selection = ref<boolean[][]>([]);
	// the verse, which was clicked last, used for easy range selection
	let last_verse: number | undefined;

	watch(book_selection, () => {
		chapter_selection.value = 0;
		verse_selection.value = [];
		last_verse = undefined;

		get_chapter_verse_array(chapter_selection.value);
	});

	watch(chapter_selection, (new_chapter) => {
		if (verse_selection.value[new_chapter] === undefined) {
			get_chapter_verse_array(new_chapter);
		}

		last_verse = undefined;
	});

	onMounted(() => {
		const message: JGCPRecv.GetBible = {
			command: "get_bible"
		};

		props.ws.send(JSON.stringify(message));
	});

	function get_chapter_verse_array(chapter: number) {
		verse_selection.value[chapter] = Array(
			book_selection.value?.chapters[chapter_selection.value]
		).fill(false);
	}

	function add_bible() {
		const chapters: BibleProps["chapters"] = [];

		verse_selection.value.forEach((verse_array, chapter_index) => {
			const verses: number[] = [];

			// go through each verse of the verse-array and check, wether it is active
			verse_array.forEach((state, verse_index) => {
				if (state) {
					// compensate for arrays starting counting at zero
					verses.push(verse_index + 1);
				}
			});

			if (verses.length > 0) {
				chapters.push({
					// compensate for arrays starting counting at zero
					chapter: chapter_index + 1,
					verses
				});
			}
		});

		const caption: string =
			book_selection.value?.name !== undefined
				? create_bible_citation_string(book_selection.value?.name, chapters)
				: "Bible";

		const message: JGCPRecv.AddItem = {
			command: "add_item",
			props: {
				type: "bible",
				caption,
				color: "#008800",
				book_id: book_selection.value?.id ?? "",
				chapters
			}
		};

		props.ws.send(JSON.stringify(message));
	}

	function shift_click(this_verse: number) {
		if (last_verse !== undefined) {
			const [from, to] = [last_verse, this_verse].sort();

			for (let ii = from + 1; ii < to; ii++) {
				if (chapter_selection.value !== undefined) {
					verse_selection.value[chapter_selection.value][ii] =
						!verse_selection.value[chapter_selection.value][ii];
				}
			}
		}
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div class="divisions">
			<template v-for="[division, books] in Object.entries(bible ?? {})">
				<div class="header">
					{{ division }}
				</div>
				<template v-for="book in books">
					<input
						type="radio"
						style="display: none"
						v-model="book_selection"
						:value="book"
						:id="`bible_book_${book.id}`"
					/>
					<label
						class="book"
						:class="{ active: book_selection === book }"
						:for="`bible_book_${book.id}`"
					>
						{{ book.name }}
					</label>
				</template>
			</template>
		</div>
		<div id="chapter_verse_wrapper">
			<div>
				<div class="header">Chapter</div>
				<div class="chapters">
					<template v-for="chapter of book_selection?.chapters.keys()">
						<input
							type="radio"
							style="display: none"
							v-model="chapter_selection"
							:value="chapter"
							:id="`${book_selection?.id}_${chapter}`"
						/>
						<label
							class="chapter"
							:class="{ active: chapter_selection === chapter }"
							:for="`${book_selection?.id}_${chapter}`"
						>
							{{ chapter + 1 }}
						</label>
					</template>
				</div>
			</div>
			<div>
				<div class="header">Verse</div>
				<div class="chapters">
					<template v-for="(active, verse) of verse_selection[chapter_selection]">
						<input
							type="checkbox"
							style="display: none"
							v-model="verse_selection[chapter_selection][verse]"
							:id="`${book_selection?.id}_${chapter_selection}_${verse}`"
							@change="last_verse = verse"
						/>
						<label
							class="chapter"
							:class="{ active }"
							:for="`${book_selection?.id}_${chapter_selection}_${verse}`"
							@click.shift="shift_click(verse)"
						>
							{{ verse + 1 }}
						</label>
					</template>
				</div>
			</div>
			<MenuButton icon="plus" text="" @click="add_bible" />
		</div>
	</div>
</template>

<style scoped>
	.add_media_wrapper {
		flex: 1;
		display: flex;

		gap: inherit;
	}

	.divisions {
		flex: 1;
		display: flex;
		flex-direction: column;

		background-color: var(--color-container);
		border-radius: 0.25rem;

		gap: 0.25rem;

		overflow: auto;
	}

	.book {
		margin-inline: 0.25rem;

		overflow: visible;

		border-radius: 0.25rem;

		background-color: var(--color-item);

		cursor: pointer;

		padding: 0.25rem;
		padding-left: 1rem;

		font-weight: lighter;
	}

	.book:hover {
		background-color: var(--color-item-hover);
	}

	.active {
		background-color: var(--color-active) !important;
	}

	.active:hover {
		background-color: var(--color-active-hover) !important;
	}

	#chapter_verse_wrapper {
		flex: 1;

		display: grid;

		grid-template-rows: 1fr 1fr;

		gap: 0.25rem;

		background-color: var(--color-container);
		border-radius: 0.25rem;
	}

	#chapter_verse_wrapper > div {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.header {
		overflow: visible;

		text-align: center;

		background-color: var(--color-item);

		border-radius: inherit;

		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
		padding-left: 0.75rem;
	}

	.chapters {
		overflow: auto;

		padding: 0.25rem;

		gap: 0.25rem;

		display: grid;

		grid-template-columns: repeat(10, 1fr);
	}

	.chapter {
		aspect-ratio: 1;
		align-items: center;
		justify-content: center;

		overflow: visible;

		display: inline-flex;

		background-color: var(--color-item);

		padding: 0.25rem;

		border-radius: 0.25rem;

		cursor: pointer;

		font-weight: lighter;
	}

	.chapter:hover {
		background-color: var(--color-item-hover);
	}
</style>

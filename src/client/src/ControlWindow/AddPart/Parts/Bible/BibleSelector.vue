<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
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

	library.add(fas.faPlus);

	const props = defineProps<{
		ws: WebSocket;
		bible?: BibleFile;
		edit?: boolean;
	}>();

	const emit = defineEmits<{
		add: [book_name: string];
	}>();

	const book_selection = ref<Book>();
	const chapter_selection = ref<number>(0);
	const verse_selection = ref<boolean[]>([]);

	const bible_props = defineModel<BibleProps>("bible_props");

	onMounted(() => {
		const message: JGCPRecv.GetBible = {
			command: "get_bible"
		};

		props.ws.send(JSON.stringify(message));
	});

	watch(
		() => props.bible,
		(bible) => {
			if (bible !== undefined) {
				book_selection.value = Object.values(bible)[0][0].books[0];
			}
		}
	);

	watch(book_selection, (book_selection) => {
		if (bible_props.value !== undefined && book_selection !== undefined) {
			bible_props.value.book_id = book_selection.id;

			// clear the chapter and verse selection
			bible_props.value.chapters = {};
		}

		verse_selection.value = Array(book_selection?.chapters[chapter_selection.value]).fill(false);
	});

	watch(chapter_selection, (chapter_selection) => {
		verse_selection.value = Array(book_selection.value?.chapters[chapter_selection]).fill(false);

		if (bible_props.value !== undefined) {
			// if there are already data for this chapter, load it
			if (
				Object.keys(bible_props.value?.chapters ?? {}).includes((chapter_selection + 1).toString())
			) {
				verse_selection.value = verse_selection.value.map((state, index) => {
					return bible_props.value!.chapters[chapter_selection + 1].includes(index + 1);
				});
			}
		}
	});

	watch(
		verse_selection,
		(verse_selection) => {
			const verses: number[] = [];

			verse_selection.forEach((state, verse) => {
				if (state) {
					verses.push(verse + 1);
				}
			});

			if (bible_props.value !== undefined) {
				// if there are now verses selected, try to remove it from the props
				if (verses.length === 0) {
					delete bible_props.value.chapters[chapter_selection.value + 1];
				} else {
					bible_props.value.chapters[chapter_selection.value + 1] = verses;
				}
			}
		},
		{ deep: true }
	);

	function get_book_from_id(id?: string): Book {
		let book_result: Book = { name: "", id: "", chapters: [] };

		Object.values(props.bible ?? {}).forEach((div) => {
			div.forEach(({ books }) => {
				books.forEach((book) => {
					if (book.id === id) {
						book_result = book;
					}
				});
			});
		});

		return book_result;
	}

	let last_verse: number | undefined;
	function shift_click(this_verse: number) {
		if (last_verse !== undefined && bible_props.value !== undefined) {
			const [from, to] = [last_verse, this_verse].sort();
			const verses = bible_props.value?.chapters[chapter_selection.value];

			for (let ii = from + 1; ii < to; ii++) {
				if (verses.includes(ii)) {
					verses.splice(verses.indexOf(ii), 1);
				} else {
					verses.push(ii);
				}
			}
		} else {
			last_verse = this_verse;
		}
	}

	function enter_element(event: KeyboardEvent) {
		event.stopPropagation();
		event.preventDefault();

		(event.target as HTMLElement)?.click();
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div id="book_parts_viewer">
			<div class="divisions">
				<template v-for="[division, book_groups] in Object.entries(bible ?? {})">
					<div class="header">
						{{ division }}
					</div>
					<template v-for="{ name, books } in book_groups">
						<div class="book_group">{{ name }}</div>
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
								:class="{ active: bible_props?.book_id === book.id }"
								:for="`bible_book_${book.id}`"
							>
								{{ book.name }}
							</label>
						</template>
					</template>
				</template>
			</div>
			<MenuButton
				v-if="edit !== true"
				icon="plus"
				text=""
				@click="emit('add', book_selection?.name ?? 'Bible')"
			/>
		</div>
		<div id="chapter_verse_wrapper">
			<div>
				<div class="header">Chapter</div>
				<div class="chapters">
					<!-- <template v-for="chapter of book_selection?.chapters.keys()"> -->
					<template
						v-for="(verse_count, chapter) of get_book_from_id(bible_props?.book_id ?? '').chapters"
					>
						<input
							type="radio"
							style="display: none"
							v-model="chapter_selection"
							:value="chapter"
							:id="`${bible_props?.book_id}_${chapter}`"
						/>
						<label
							tabindex="0"
							class="chapter"
							:class="{
								active: Object.keys(bible_props?.chapters ?? {}).includes((chapter + 1).toString()),
								selected: chapter_selection === chapter
							}"
							:for="`${bible_props?.book_id}_${chapter}`"
							@keydown.enter="enter_element"
						>
							{{ chapter + 1 }}
						</label>
					</template>
				</div>
			</div>
			<div>
				<div class="header">Verse</div>
				<div class="chapters">
					<template v-for="(state, verse) of verse_selection">
						<input
							type="checkbox"
							style="display: none"
							v-model="verse_selection[verse]"
							:id="`${book_selection?.id}_${chapter_selection}_${verse}`"
							@change="last_verse = verse"
						/>
						<label
							tabindex="0"
							class="chapter"
							:class="{ active: state }"
							:for="`${bible_props?.book_id}_${chapter_selection}_${verse}`"
							@click.shift="shift_click(verse)"
							@keydown.enter="enter_element"
						>
							{{ verse + 1 }}
						</label>
					</template>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
	.add_media_wrapper {
		flex: 1;
		display: flex;

		gap: inherit;
	}

	#book_parts_viewer {
		flex: 1;
		display: flex;
		flex-direction: column;

		background-color: var(--color-container);

		border-radius: 0.25rem;
	}

	.divisions {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: 0.25rem;

		overflow: auto;
	}

	.book_group,
	.book {
		margin-inline: 0.25rem;

		overflow: visible;

		border-radius: 0.25rem;

		background-color: var(--color-item);

		padding: 0.25rem;
		padding-left: 0.5rem;
	}
	.book {
		cursor: pointer;

		margin-left: 2rem;

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

	.selected {
		border: 0.125rem solid white;
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

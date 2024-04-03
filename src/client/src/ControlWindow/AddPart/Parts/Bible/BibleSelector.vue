<script lang="ts">
	export function get_book_from_id(bible: BibleFile, id: string): Book {
		let book_result: Book = { name: "", id: "", chapters: [] };

		Object.values(bible).forEach((div) => {
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
</script>

<script setup lang="ts">
	import { onMounted, ref, watch, type VNodeRef, type Ref, nextTick } from "vue";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import { type BibleFile, type BibleProps, type Book } from "@server/PlaylistItems/Bible";

	const props = defineProps<{
		ws: WebSocket;
		bible?: BibleFile;
	}>();

	const emit = defineEmits<{
		update: [];
	}>();

	const book_refs: Record<string, Ref<HTMLLabelElement[]>> = {};
	function book_obj_ref(element: HTMLLabelElement, id: string): VNodeRef | undefined {
		if (element !== null) {
			book_refs[id] = ref([element]);

			return book_refs[id];
		}
	}

	const chapter_refs: Record<string, Ref<HTMLLabelElement[]>> = {};
	function chapter_obj_ref(element: HTMLLabelElement, index: number): VNodeRef | undefined {
		if (element !== null) {
			chapter_refs[index] = ref([element]);

			return chapter_refs[index];
		}
	}

	const verse_refs: Record<string, Ref<HTMLLabelElement[]>> = {};
	function verse_obj_ref(element: HTMLLabelElement, index: number): VNodeRef | undefined {
		if (element !== null) {
			verse_refs[index] = ref([element]);

			return verse_refs[index];
		}
	}

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
		() => bible_props.value,
		(bible_props) => {
			if (bible_props !== undefined && props.bible !== undefined) {
				book_selection.value = get_book_from_id(props.bible, bible_props.book_id);
			}
		}
	);

	watch(
		() => props.bible,
		(bible) => {
			if (bible !== undefined) {
				if (bible_props.value?.book_id !== undefined) {
					book_selection.value = get_book_from_id(bible, bible_props.value?.book_id);
				} else {
					book_selection.value = Object.values(bible)[0][0].books[0];
				}
			}
		}
	);

	watch(book_selection, (book_selection) => {
		if (book_selection !== undefined) {
			write_book_to_props(book_selection);

			if (bible_props.value !== undefined) {
				if (Object.keys(bible_props.value?.chapters ?? {}).length > 0) {
					chapter_selection.value = Number(Object.keys(bible_props.value.chapters)[0]) - 1;
				} else {
					chapter_selection.value = 0;
				}

				create_verse_selection(bible_props.value.chapters[chapter_selection.value + 1]);
			}

			nextTick(() => {
				book_refs[book_selection.id].value[
					book_refs[book_selection.id].value.length - 1
				].scrollIntoView({ behavior: "smooth", block: "center" });
			});
		}
	});

	watch(chapter_selection, (chapter_selection) => {
		// reset the last-selected verse
		last_verse = undefined;

		if (bible_props.value !== undefined && book_selection.value !== undefined) {
			// if there are already data for this chapter, load it
			if (
				Object.keys(bible_props.value?.chapters ?? {}).includes((chapter_selection + 1).toString())
			) {
				create_verse_selection(bible_props.value.chapters[chapter_selection + 1]);
			} else {
				create_verse_selection();
			}

			nextTick(() => {
				chapter_refs[chapter_selection].value[
					chapter_refs[chapter_selection].value.length - 1
				].scrollIntoView({ behavior: "smooth", block: "nearest" });
			});
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
				// if there are no verses selected, try to remove it from the props
				if (verses.length === 0) {
					delete bible_props.value.chapters[chapter_selection.value + 1];
				} else {
					bible_props.value.chapters[chapter_selection.value + 1] = verses;
				}
			}

			emit("update");
		},
		{ deep: true }
	);

	let last_verse: number | undefined;
	function shift_click(this_verse: number) {
		if (last_verse !== undefined && bible_props.value !== undefined) {
			const [from, to] = [last_verse, this_verse].sort();

			verse_selection.value = verse_selection.value.map((state, index) => {
				if (index > from && index < to) {
					return !state;
				} else {
					return state;
				}
			});
		} else {
			last_verse = this_verse;
		}
	}

	function enter_element(event: KeyboardEvent) {
		event.stopPropagation();
		event.preventDefault();

		(event.target as HTMLElement)?.click();
	}

	function write_book_to_props(book_selection: Book) {
		if (bible_props.value !== undefined) {
			if (bible_props.value.book_id !== book_selection.id) {
				bible_props.value.book_id = book_selection.id;

				// clear the chapter and verse selection
				bible_props.value.chapters = {};
			}
		}
	}

	function clear_verses() {
		verse_selection.value.fill(false);
	}

	function create_verse_selection(verses?: number[]) {
		verse_selection.value = Array(book_selection.value?.chapters[chapter_selection.value]).fill(
			false
		);

		verses?.forEach((verse) => {
			verse_selection.value[verse - 1] = true;
		});
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
								:ref="book_obj_ref($el, book.id)"
								:class="{ active: bible_props?.book_id === book.id }"
								:for="`bible_book_${book.id}`"
							>
								{{ book.name }}
							</label>
						</template>
					</template>
				</template>
			</div>
			<slot></slot>
		</div>
		<div id="chapter_verse_wrapper">
			<div>
				<div class="header">Chapter</div>
				<div class="chapters">
					<template
						v-for="(verse_count, chapter) of get_book_from_id(
							bible ?? {},
							bible_props?.book_id ?? ''
						).chapters"
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
							:ref="chapter_obj_ref($el, chapter)"
							:class="{
								active: Object.keys(bible_props?.chapters ?? {}).includes((chapter + 1).toString()),
								selected: chapter_selection === chapter
							}"
							:for="`${bible_props?.book_id}_${chapter}`"
							@keydown.enter="enter_element"
							@dblclick="clear_verses"
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
							:ref="verse_obj_ref($el, verse)"
							:class="{ active: state }"
							:for="`${book_selection?.id}_${chapter_selection}_${verse}`"
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
		outline: 0.125rem solid white;
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
		overflow-y: scroll;

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

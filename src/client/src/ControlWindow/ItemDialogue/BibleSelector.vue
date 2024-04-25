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

	export function chapter_verse_selection_to_props(
		chapter_verse_selection: Record<string, boolean[]>
	): BibleProps["chapters"] {
		const return_object: BibleProps["chapters"] = {};

		Object.entries(chapter_verse_selection).map(([chapter, selection_aray]) => {
			if (selection_aray.some((ele) => ele)) {
				return_object[Number(chapter) + 1] = selection_aray
					.map((state, index): [boolean, number] => [state, index])
					.filter(([state, index]) => state)
					.map(([state, index]) => index + 1);
			}
		});

		return return_object;
	}
</script>

<script setup lang="ts">
	import { onMounted, ref, watch, type VNodeRef, type Ref, nextTick, toRaw } from "vue";

	import type { BibleFile, BibleProps, Book } from "@server/PlaylistItems/Bible";

	const props = defineProps<{
		bible?: BibleFile;
	}>();

	const emit = defineEmits<{
		refresh: [];
	}>();

	const chapter_selection = ref<number>(0);
	const book_selection = defineModel<Book | undefined>("book_selection", { required: true });
	const chapter_verse_selection = defineModel<Record<string, boolean[]> | undefined>(
		"chapter_verse_selection",
		{ required: true }
	);

	onMounted(() => {
		emit("refresh");
	});

	watch(
		() => props.bible,
		(bible) => {
			if (bible !== undefined) {
				// if there is no book-selection, select the first one
				if (book_selection.value !== undefined) {
					// there is a book selection

					// if there already is verse-selection-data, select the first chapter with data
					if (
						chapter_verse_selection.value !== undefined &&
						Object.keys(chapter_verse_selection.value).length > 0
					) {
						chapter_selection.value = Number(Object.keys(chapter_verse_selection.value)[0]);
					} else {
						// else select the first chapter
						chapter_selection.value = 0;
						create_verse_selection();
					}
				}

				nextTick(() => {
					// if there is a book selected, scroll it into view
					if (book_selection.value !== undefined) {
						const ref_array = book_refs[book_selection.value.id].value;

						ref_array[ref_array.length - 1].scrollIntoView({
							block: "nearest",
							behavior: "smooth"
						});
					}
				});
			}
		}
	);

	watch(
		() => book_selection.value,
		(book_selection) => {
			if (book_selection !== undefined) {
				chapter_verse_selection.value = {};

				nextTick(() => {
					create_verse_selection();
				});
			}
		}
	);

	watch(
		() => chapter_selection.value,
		(chapter_selection) => {
			if (chapter_selection !== undefined) {
				create_verse_selection();
			}
		}
	);

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

	let last_verse: number | undefined;
	function shift_click(this_verse: number) {
		if (
			last_verse !== undefined &&
			chapter_verse_selection.value !== undefined &&
			chapter_selection.value !== undefined
		) {
			const [from, to] = [last_verse, this_verse].sort();

			chapter_verse_selection.value[chapter_selection.value] = chapter_verse_selection.value[
				chapter_selection.value
			].map((state, index) => {
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

	function clear_verses(chapter: number) {
		if (
			chapter_verse_selection.value !== undefined &&
			chapter_verse_selection.value[chapter] !== undefined
		) {
			chapter_verse_selection.value[chapter].fill(false);
		}
	}

	function create_verse_selection(chapter: number = chapter_selection.value, book?: Book) {
		if (
			(book_selection.value?.chapters.length ?? 0 > 0) &&
			typeof chapter_verse_selection.value === "object"
		) {
			const new_array = Array((book ?? book_selection.value)?.chapters[chapter]).fill(false);

			chapter_verse_selection.value[chapter] ??= new_array;
		}
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
								:class="{ active: book_selection?.id === book.id }"
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
		<div id="chapter_verse_wrapper" v-if="chapter_verse_selection !== undefined">
			<div>
				<div class="header">Chapter</div>
				<div class="chapters">
					<template v-for="(verse_count, chapter) of book_selection?.chapters">
						<input
							type="radio"
							style="display: none"
							v-model="chapter_selection"
							:value="chapter"
							:id="`${book_selection?.id}_${chapter}`"
						/>
						<label
							tabindex="0"
							class="chapter"
							:ref="chapter_obj_ref($el, chapter)"
							:class="{
								active: chapter_verse_selection[chapter]?.some((ele) => ele),
								selected: chapter_selection === chapter
							}"
							:for="`${book_selection?.id}_${chapter}`"
							@keydown.enter="enter_element"
							@dblclick="clear_verses(chapter)"
						>
							{{ chapter + 1 }}
						</label>
					</template>
				</div>
			</div>
			<div>
				<div class="header">Verse</div>
				<div class="chapters">
					<template v-for="(state, verse) of chapter_verse_selection[chapter_selection]">
						<input
							type="checkbox"
							style="display: none"
							v-model="chapter_verse_selection[chapter_selection][verse]"
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

		border-radius: 0.25rem;

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

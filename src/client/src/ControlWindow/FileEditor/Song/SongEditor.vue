<script lang="ts">
	export interface SongTextPart {
		part: string;
		text: [string, string, string, string][];
	}

	export function is_slide_empty(part: SongTextPart["text"][number], lang_count: number): boolean {
		return part?.every((language, index) => {
			return language.length === 0 || index >= lang_count;
		});
	}
</script>

<script setup lang="ts">
	import { reactive, ref, watch, type Ref } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import Draggable from "vuedraggable";

	import type { SearchInputDefinitions } from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";
	import { get_song_part_color } from "../../ItemDialogue/SongPartSelector.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";
	import PopUp from "@/ControlWindow/PopUp.vue";

	import type { File, MediaFile, SongFile } from "@server/search_part";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { SongFileMetadata, SongData } from "@server/PlaylistItems/SongFile/SongFile";

	library.add(fas.faPlus, fas.faTrash, fas.faFloppyDisk);

	const props = defineProps<{
		ws: WebSocket;
		song_files: SongFile[];
		media_files: MediaFile[];
	}>();

	const emit = defineEmits<{}>();

	const text_parts = defineModel<SongTextPart[]>("text_parts", {
		default: reactive([{ part: "", text: [["", "", "", ""]] }])
	});
	const selected_verse_order_part = ref<number>();

	const metadata = defineModel<SongFileMetadata>("metadata", {
		default: {
			Title: ["", "", "", ""],
			LangCount: 1,
			ChurchSongID: "",
			VerseOrder: []
		}
	});

	const show_media_selector = ref<boolean>(false);
	const media_file_tree = ref<MediaFile[]>();
	const media_selection = ref<File>();
	const background_media = ref<File>();
	const media_search_strings = ref<SearchInputDefinitions<"name">>([
		{ id: "name", placeholder: "Name", value: "" }
	]);

	const show_save_file_dialogue = ref<boolean>(false);
	const song_file_tree = ref<SongFile[]>();
	const song_selection = ref<File>();
	const song_search_strings = ref<SearchInputDefinitions<"name">>([
		{ id: "name", placeholder: "Name", value: "" }
	]);
	const song_file_name = defineModel<string>("song_file_name", { default: "" });

	// watch for new media-files
	watch(
		() => props.media_files,
		() => {
			media_search_map = create_search_map(props.media_files);

			search_media();
		}
	);

	// watch for new song-files
	watch(
		() => props.song_files,
		() => {
			song_search_map = create_search_map(props.song_files);

			search_song();
		}
	);

	type SearchMapFile<K extends File> = K & {
		children?: SearchMapFile<K>[];
		search_data?: { name: string };
	};
	let media_search_map: SearchMapFile<MediaFile>[] = [];
	let song_search_map: SearchMapFile<SongFile>[] = [];
	function create_search_map(files: MediaFile[]): SearchMapFile<File>[] {
		const return_map: SearchMapFile<File>[] = [];

		files.forEach((f) => {
			return_map.push({
				...f,
				search_data: {
					name: f.name.toLowerCase()
				},
				children: f.children !== undefined ? create_search_map(f.children) : undefined
			});
		});

		return return_map;
	}

	// process media-file-search-queries
	function search_media() {
		media_file_tree.value = search_string(media_search_map, media_search_strings.value);
	}

	// process song-file-search-queries
	function search_song() {
		song_file_tree.value = search_string(song_search_map, song_search_strings.value);
	}

	// create search-trees
	function search_string(
		files: SearchMapFile<File>[],
		search_inputs: SearchInputDefinitions<"name">
	): MediaFile[] {
		const return_files: MediaFile[] = [];

		files.forEach((f) => {
			if (
				search_inputs.every((search_string) => {
					if (f.search_data !== undefined) {
						if (f.search_data[search_string.id] !== undefined) {
							return f.search_data[search_string.id]?.includes(search_string.value.toLowerCase());
						} else {
							return search_string.value === "";
						}
					} else {
						return true;
					}
				})
			) {
				return_files.push(f);
			} else if (f.children !== undefined) {
				const children = search_string(f.children, search_inputs);

				if (children.length > 0) {
					return_files.push({
						...f,
						children: search_string(f.children, search_inputs)
					});
				}
			}
		});

		return return_files;
	}

	function clamp_lang_count() {
		return Math.max(Math.min(Math.round(metadata.value.LangCount), 4), 1);
	}

	function on_text_change() {
		text_parts.value.forEach((part) => {
			const part_text = part.text;

			// if the last slide isn't empty, add another one
			if (!is_slide_empty(part_text[part_text.length - 1], metadata.value.LangCount)) {
				part_text.push(["", "", "", ""]);

				// else if the second-last is also empty, remove the last one
			} else if (
				is_slide_empty(part_text[part_text.length - 2], metadata.value.LangCount) &&
				part_text.length > 1
			) {
				part_text.pop();
			}
		});
	}

	watch(
		() => text_parts.value,
		() => {
			on_text_change();
		},
		{ deep: true }
	);

	function remove_verse_order_part(index: number | undefined = selected_verse_order_part.value) {
		if (metadata.value.VerseOrder !== undefined) {
			if (index !== undefined) {
				metadata.value.VerseOrder.splice(index, 1);
			}

			// if the selection is higher than there are items, set it to the last item
			if (selected_verse_order_part.value !== undefined) {
				if (metadata.value.VerseOrder.length >= selected_verse_order_part.value + 1) {
					selected_verse_order_part.value = metadata.value.VerseOrder.length - 1;
				}

				// if the selection is negative, set it to undefined
				if (selected_verse_order_part.value < 0) {
					selected_verse_order_part.value = undefined;
				}
			}
		}
	}

	function get_files(type: "media" | "song") {
		const message: JGCPRecv.GetItemFiles = {
			command: "get_item_files",
			type: type
		};

		props.ws.send(JSON.stringify(message));
	}

	function select_media(selection: File) {
		background_media.value = selection;
		media_selection.value = selection;
		show_media_selector.value = false;
	}

	const overwrite_dialog = ref<boolean>(false);
	let overwrite_path: string = "";
	function save_song(overwrite: boolean = false) {
		// if no file is selected, save at the root dir
		let save_path: string;
		if (song_selection.value === undefined) {
			save_path = song_file_name.value + ".sng";
		} else {
			// if the selection is a file, replace the file-name with the file-name
			if (song_selection.value.children === undefined) {
				save_path =
					song_selection.value.path.slice(0, song_selection.value.path.lastIndexOf("/") + 1) +
					song_file_name.value +
					".sng";
			} else {
				save_path = song_selection.value.path + "/" + song_file_name.value + ".sng";
			}

			// if the save file exists already, ask wether it should be overwritten
			const compare_file = (files: File[], path: string): boolean => {
				return files.some((fil) => {
					if (fil.path === path) {
						return true;
					}

					if (fil.children !== undefined) {
						return compare_file(fil.children, path);
					}

					return false;
				});
			};

			if (overwrite === false && compare_file(props.song_files, save_path)) {
				overwrite_path = save_path;

				overwrite_dialog.value = true;

				return;
			}
		}

		const message: JGCPRecv.SaveFile = {
			command: "save_file",
			type: "song",
			path: save_path,
			data: create_song_data()
		};

		props.ws.send(JSON.stringify(message));
	}

	function create_song_data(): SongData {
		const song_data_object: SongData = {
			metadata: metadata.value,
			text: {}
		};

		text_parts.value.forEach((part) => {
			// filter out the empty, last elements meant for the next slide to be inputted (but keep it if it is the first)
			const text_parts = part.text.filter((slide, slide_index, text_part) => {
				// if it is the first element use it always
				if (slide_index === 0) {
					return true;
				}

				// check wether all used languages are empty
				let is_empty = slide.every((lang, lang_index) => {
					return lang_index < metadata.value.LangCount || lang === "";
				});

				// if it is the last element and empty, don't use it
				return !(slide_index === text_part.length - 1 && is_empty);
			});

			song_data_object.text[part.part] = text_parts.map((slide) => {
				const slide_line_count_max = Math.max(
					...slide.map((lang) => (lang.match(/\n/g) || []).length + 1)
				);

				return Array.from(Array(slide_line_count_max).keys()).map((line_index) => {
					return Array.from(Array(metadata.value.LangCount).keys()).map((lang_index) => {
						return slide[lang_index].split("\n")[line_index] ?? "";
					});
				});
			});
		});

		return song_data_object;
	}

	function show_save_dialogue() {
		// if there currently is no file-name for the song, try to generate it from the song-data
		if (song_file_name.value === "") {
			// if the church-song-id is specified, use it
			if (metadata.value.ChurchSongID !== undefined) {
				song_file_name.value = metadata.value.ChurchSongID;

				// if there is also a title defined, add an seperator
				if (metadata.value.Title[0] !== "") {
					song_file_name.value += " - ";
				}
			}

			// if a title is defined, use it
			if (metadata.value.Title[0] !== "") {
				song_file_name.value += metadata.value.Title[0];
			}
		}

		show_save_file_dialogue.value = true;
	}
</script>

<template>
	<div id="new_song_container">
		<div>
			<div class="container">
				<div class="header">Song-Title</div>
				<div class="content" id="title_input_container">
					<template v-for="(_, index) of metadata.Title" :key="`title_input_${index}`">
						<input
							v-show="clamp_lang_count() > index"
							v-model="metadata.Title[index]"
							:placeholder="`Title Language ${index + 1}`"
						/>
					</template>
				</div>
			</div>
			<div class="container" id="text_container">
				<div class="header">Text</div>
				<div class="content" id="text_editor_container">
					<div v-for="(part, index) of text_parts" class="text_part">
						<div class="text_part_title">
							<input
								placeholder="Part Name"
								v-model="text_parts[index].part"
								:style="{ color: get_song_part_color(part.part) }"
							/>
							<MenuButton @click="text_parts.splice(index, 1)">
								<FontAwesomeIcon :icon="['fas', 'trash']" />Delete Part
							</MenuButton>
							<MenuButton @click="metadata.VerseOrder?.push(part.part)">
								<FontAwesomeIcon :icon="['fas', 'plus']" />Add to Verse Order
							</MenuButton>
						</div>
						<div v-for="(slide, slide_index) of part.text" class="song_text_language">
							<template v-for="(language, language_index) of slide">
								<textarea
									v-show="clamp_lang_count() > language_index"
									:rows="(language.match(/\n/g) || []).length + 1"
									class="song_text_language"
									v-model="part.text[slide_index][language_index]"
									:placeholder="
										`Slide ${slide_index + 1}` +
										(metadata.LangCount > 1 ? `- Language ${language_index + 1}` : '')
									"
								/>
							</template>
						</div>
					</div>
				</div>
				<MenuButton @click="text_parts.push({ part: '', text: [['', '', '', '']] })">
					<FontAwesomeIcon :icon="['fas', 'plus']" />Add Part
				</MenuButton>
			</div>
		</div>
		<div>
			<div class="container">
				<div class="header">Song-File</div>
				<div class="content">
					<div class="row_container">
						<MenuButton @click="save_song()">
							<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save
						</MenuButton>
						<MenuButton @click="show_save_dialogue()">
							<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save As
						</MenuButton>
					</div>
				</div>
			</div>
			<div class="container">
				<div class="header">Languages</div>
				<div class="content">
					<input
						id="lang_count_input"
						type="number"
						v-model="metadata.LangCount"
						min="1"
						max="4"
						@change="metadata.LangCount = clamp_lang_count()"
					/>
				</div>
			</div>
			<div class="container">
				<div class="header">Song ID</div>
				<div class="content">
					<input v-model="metadata.ChurchSongID" placeholder="Song ID" />
				</div>
			</div>

			<MenuButton @click="show_media_selector = true"> Background Image </MenuButton>
			<div class="container" id="verse_order_container">
				<div class="header">Verse Order</div>
				<Draggable
					class="content"
					id="verse_order"
					v-model="metadata.VerseOrder"
					group="song_parts"
					item-key="item"
				>
					<template #item="{ element: part, index }">
						<div
							class="verse_part"
							:class="{ selected: selected_verse_order_part === index }"
							:style="{ color: get_song_part_color(part) }"
							tabindex="-1"
							@click="selected_verse_order_part = index"
							@keydown.enter="
								selected_verse_order_part = index;
								$event.preventDefault();
								$event.stopPropagation();
							"
							@keydown.delete="remove_verse_order_part(index)"
						>
							{{ part }}
						</div>
					</template>
				</Draggable>
				<MenuButton @click="remove_verse_order_part()">
					<FontAwesomeIcon :icon="['fas', 'trash']" />Delete Part
				</MenuButton>
			</div>
		</div>
	</div>
	<PopUp title="Select Background Image" v-model:active="show_media_selector" :maximize="true">
		<FileDialogue
			class="file_dialogue"
			name="Background Media"
			:files="media_file_tree"
			v-model:selection="media_selection"
			v-model:search_strings="media_search_strings"
			@choose="select_media"
			@search="search_media"
			@refresh_files="get_files('media')"
		>
			<template v-slot:buttons>
				<MenuButton class="file_dialogue_button" @click="select_media">
					<FontAwesomeIcon :icon="['fas', 'plus']" />Select Media
				</MenuButton>
			</template>
		</FileDialogue>
	</PopUp>
	<PopUp title="Save Song" v-model:active="show_save_file_dialogue" :maximize="true">
		<FileDialogue
			class="file_dialogue"
			name="Save Path"
			:files="song_file_tree"
			:select_dirs="true"
			v-model:selection="song_selection"
			v-model:search_strings="song_search_strings"
			@search="search_song"
			@refresh_files="get_files('song')"
		>
			<template v-slot:buttons>
				<input class="file_name_box" v-model="song_file_name" placeholder="Filename" @input="" />
				<MenuButton id="select_song_button" @click="save_song()">
					<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Song
				</MenuButton>
			</template>
		</FileDialogue>
	</PopUp>
</template>

<style scoped>
	#new_song_container {
		flex: 1;
		display: flex;
		/* flex-direction: column; */
		gap: 0.25rem;

		display: grid;

		grid-template-columns: 7fr 3fr;
	}

	#new_song_container > * {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: inherit;
	}

	.container {
		background-color: var(--color-container);

		border-radius: 0.25rem;

		display: flex;
		flex-direction: column;
	}

	.container > .header {
		text-align: center;

		background-color: var(--color-item);

		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
	}

	.container > .content {
		padding: 0.25rem;

		display: flex;
		gap: 0.25rem;
	}

	.row_container {
		flex: 1;
		display: flex;

		gap: inherit;
	}

	.row_container > * {
		flex: 1;
	}

	input,
	textarea {
		font-weight: lighter;
		font-size: 1.25rem;

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		flex: 1;
	}

	input {
		background-color: var(--color-item);
	}

	textarea {
		background-color: transparent;
		border: var(--color-item) 0.0625rem solid;
	}

	input:focus,
	textarea:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	#lang_count_input {
		text-align: center;
	}

	input#lang_count_input::-webkit-outer-spin-button,
	input#lang_count_input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	#text_container {
		flex: 1;
	}

	#text_container > .content {
		flex: 1;
	}

	#text_editor_container {
		flex-direction: column;

		overflow: auto;
	}

	.text_part {
		display: flex;
		flex-direction: column;

		gap: inherit;

		overflow: visible;
	}

	.text_part > * {
		overflow: visible;
	}

	.text_part_title {
		flex: 1;
		display: flex;
		gap: 0.25rem;
	}

	.text_part_title > input {
		width: 100%;
	}

	.song_text_language {
		flex: 1;
		display: flex;
		gap: inherit;
	}

	.song_text_language > textarea {
		flex: 1;
	}

	.song_text_language {
		resize: none;

		width: auto;
	}

	#verse_order_container {
		flex: 1;
	}

	#verse_order {
		display: block;
		flex: 1;

		text-align: center;
	}

	.verse_part {
		padding: 0.25rem;
	}

	.verse_part.selected {
		border-radius: 0.25rem;
		outline: 0.125rem solid var(--color-text);
	}

	.file_dialogue {
		flex: 1;
		display: flex;
	}

	.file_dialogue_button {
		flex: 1;
	}
</style>

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
	import { reactive, ref, watch } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { VueDraggableNext as Draggable } from "vue-draggable-next";

	import { get_song_part_color } from "../../ItemDialogue/SongPartSelector.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import PopUp from "@/ControlWindow/PopUp.vue";
	import MediaDialogue from "@/ControlWindow/FileDialogue/MediaDialogue.vue";
	import Globals from "@/Globals";
	import SongDialogue from "@/ControlWindow/FileDialogue/SongDialogue.vue";
	import { create_directory_stack } from "@/ControlWindow/FileDialogue/FileDialogue.vue";

	import type { MediaFile, SongFile } from "@server/search_part";
	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { SongFileMetadata, SongData } from "@server/PlaylistItems/SongFile/SongFile";

	library.add(fas.faPlus, fas.faTrash, fas.faFloppyDisk, fas.faXmark);

	const text_parts = defineModel<SongTextPart[]>("text_parts", {
		default: () => reactive([{ part: "", text: [["", "", "", ""]] }])
	});
	const selected_verse_order_part = ref<number>();

	const metadata = defineModel<SongFileMetadata>("metadata", {
		default: () =>
			reactive({
				Title: ["", "", "", ""],
				LangCount: 1,
				ChurchSongID: "",
				VerseOrder: []
			})
	});

	const show_media_selector = ref<boolean>(false);
	const media_selection = ref<MediaFile>();
	const background_media = ref<MediaFile>();

	const show_save_file_dialogue = ref<boolean>(false);
	const song_file_name = ref<string>("");
	const song_selection = defineModel<SongFile>("song_file", { default: undefined });

	watch(
		() => song_selection.value,
		() => {
			if (song_selection.value !== undefined && song_selection.value.children === undefined) {
				song_file_name.value = song_selection.value.name.replace(/\.sng$/, "");

				console.debug("setting song_file_name to", song_file_name.value);
			}
		}
	);

	const media_directory_stack = ref<MediaFile[]>([]);
	watch(
		() => [metadata.value.BackgroundImage, Globals.get_media_files()],
		() => {
			create_media_directory_stack();
		},
		{ immediate: true }
	);

	const song_directory_stack = ref<SongFile[]>([]);
	watch(
		() => [song_selection.value, Globals.get_song_files()],
		() => {
			create_song_directory_stack();
		},
		{ immediate: true }
	);

	function create_media_directory_stack() {
		if (metadata.value.BackgroundImage !== undefined) {
			const dir_stack = metadata.value.BackgroundImage.split(/[\\/]/g);
			media_directory_stack.value = create_directory_stack(Globals.get_media_files(), dir_stack);
		}
	}

	function create_song_directory_stack() {
		if (song_selection.value !== undefined) {
			const dir_stack = song_selection.value.path.split(/[\\/]/g);

			song_directory_stack.value = create_directory_stack(Globals.get_song_files(), dir_stack);
		}
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

	function select_media(selection: MediaFile) {
		if (selection && selection.children === undefined) {
			background_media.value = selection;
			media_selection.value = selection;
			show_media_selector.value = false;
		}
	}

	const overwrite_dialog = ref<boolean>(false);
	function save_song(overwrite: boolean = false): boolean {
		show_save_file_dialogue.value = false;

		// if there is no file-name, open the save-dialogue
		if (song_file_name.value === "") {
			show_save_file_dialogue.value = true;

			return false;
		}

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
			const compare_file = (files: SongFile[], path: string): boolean => {
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

			if (overwrite === false && compare_file(Globals.get_song_files(), save_path)) {
				overwrite_dialog.value = true;

				console.warn("abort");

				return false;
			}
		}

		Globals.ws?.send<JCGPRecv.SaveFile>({
			command: "save_file",
			type: "song",
			path: save_path,
			data: create_song_data()
		});

		Globals.ControlWindowStateConfirm = undefined;

		// reset the psalm item-files
		Globals.item_files.value.psalm = [];

		return true;
	}

	function create_song_data(): SongData {
		const song_data_object: SongData = {
			metadata: {
				...metadata.value,
				BackgroundImage: background_media.value?.path
			},
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
			if (metadata.value.ChurchSongID !== undefined && metadata.value.ChurchSongID !== "") {
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

	// watch for any property changes to store
	let save_callback: (change_state: boolean) => void | undefined;
	const show_save_confirm = ref<boolean>(false);
	watch(
		() => [metadata, text_parts, background_media],
		() => {
			Globals.ControlWindowStateConfirm = confirm_dialog;
		},
		{ deep: true }
	);

	function confirm_dialog(callback: (change_state: boolean) => void) {
		save_callback = callback;
		show_save_confirm.value = true;
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
										(metadata.LangCount > 1 ? ` - Language ${language_index + 1}` : '')
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
						<MenuButton :disabled="song_file_name === ''" @click="save_song(true)">
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
					delay-on-touch-only="true"
					delay="250"
				>
					<div
						v-for="(part, index) of metadata.VerseOrder"
						class="verse_part"
						:class="{ selected: selected_verse_order_part === index }"
						:style="{ color: get_song_part_color(part) }"
						tabindex="-1"
						@click="selected_verse_order_part = index"
						@keydown.enter.prevent="selected_verse_order_part = index"
						@keydown.delete="remove_verse_order_part(index)"
					>
						{{ part }}
					</div>
				</Draggable>
				<MenuButton @click="remove_verse_order_part()">
					<FontAwesomeIcon :icon="['fas', 'trash']" />Delete Part
				</MenuButton>
			</div>
		</div>
	</div>
	<PopUp title="Select Background Image" v-model:active="show_media_selector" :maximize="true">
		<!-- :thumbnails="thumbnails" -->
		<MediaDialogue
			:hide_header="true"
			v-model:directory_stack="media_directory_stack"
			@choose="(ff) => select_media(ff as MediaFile)"
		>
			<template v-slot:buttons>
				<MenuButton class="file_dialogue_button" @click="select_media">
					<FontAwesomeIcon :icon="['fas', 'plus']" />Select Media
				</MenuButton>
			</template>
		</MediaDialogue>
	</PopUp>
	<PopUp title="Save Song" v-model:active="show_save_file_dialogue" :maximize="true">
		<SongDialogue
			:select_dirs="true"
			:hide_header="true"
			:new_directory="true"
			v-model:directory_stack="song_directory_stack"
			v-model:selection="song_selection"
			@new_directory="
				(path: string) =>
					Globals.ws?.send<JCGPRecv.NewDirectory>({
						command: 'new_directory',
						path,
						type: 'song'
					})
			"
		>
			<template v-slot:buttons>
				<input class="file_name_box" v-model="song_file_name" placeholder="Filename" @input="" />
				<MenuButton id="select_song_button" :disabled="song_file_name === ''" @click="save_song()">
					<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Song
				</MenuButton>
			</template>
		</SongDialogue>
	</PopUp>
	<PopUp title="Save Changes" v-model:active="show_save_confirm">
		<MenuButton
			@click="
				show_save_confirm = false;
				save_callback(save_song());
			"
		>
			<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save
		</MenuButton>
		<MenuButton
			@click="
				show_save_confirm = false;
				save_callback(true);
			"
		>
			<FontAwesomeIcon :icon="['fas', 'trash']" />Discard
		</MenuButton>
		<MenuButton
			@click="
				show_save_confirm = false;
				save_callback(false);
			"
		>
			<FontAwesomeIcon :icon="['fas', 'xmark']" />Cancel
		</MenuButton>
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

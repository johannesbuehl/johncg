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

	import type { CasparFile, Directory, SongFile } from "@server/search_part";
	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { SongFileMetadata, SongData } from "@server/PlaylistItems/SongFile/SongFile";

	library.add(fas.faUpDownLeftRight, fas.faBars, fas.faTrash, fas.faFloppyDisk, fas.faXmark);

	const text_parts = defineModel<SongTextPart[]>("text_parts", {
		default: () => reactive([{ part: "", text: [["", "", "", ""]] }])
	});
	const selected_verse_order_part = ref<number>();

	const metadata = defineModel<SongFileMetadata>("metadata", {
		default: () =>
			reactive({
				/* eslint-disable @typescript-eslint/naming-convention */
				Title: ["", "", "", ""],
				LangCount: 1,
				ChurchSongID: "",
				VerseOrder: []
				/* eslint-enable @typescript-eslint/naming-convention */
			})
	});

	const show_media_selector = ref<boolean>(false);
	const media_selection = ref<CasparFile>();
	const background_media = ref<CasparFile>();

	const show_save_file_dialogue = ref<boolean>(false);
	const song_file_name = ref<string>("");
	const song_selection = defineModel<SongFile | undefined>("song_file", { default: undefined });

	watch(
		() => song_selection.value,
		() => {
			if (song_selection.value !== undefined && !song_selection.value?.is_dir) {
				song_file_name.value = song_selection.value.name.replace(/\.sng$/, "");
			}
		}
	);

	const media_directory_stack = ref<Directory<"media">[]>([]);
	watch(
		() => [metadata.value.BackgroundImage, Globals.get_media_files()],
		() => {
			if (metadata.value.BackgroundImage !== undefined && Globals.get_media_files().length > 0) {
				const dir_stack = metadata.value.BackgroundImage.split(/[\\/]/g);
				media_directory_stack.value = create_directory_stack(Globals.get_media_files(), dir_stack);

				// select the media-file
				const potential_selection = media_directory_stack.value
					.slice(-1)[0]
					?.children?.filter((ff) => ff.name === dir_stack.slice(-1)[0])[0];

				if (potential_selection !== undefined && !potential_selection?.is_dir) {
					media_selection.value = potential_selection;
					background_media.value = potential_selection;
				}
			}
		},
		{ immediate: true }
	);

	const song_directory_stack = ref<Directory<"song">[]>([]);
	watch(
		() => Globals.get_song_files(),
		() => {
			if (song_selection.value !== undefined) {
				const dir_stack = song_selection.value.path.split(/[\\/]/g);

				song_directory_stack.value = create_directory_stack(Globals.get_song_files(), dir_stack);
			}
		},
		{ immediate: true }
	);

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

		// if the last isn't empty, add another one
		if (text_parts.value.length > 0) {
			if (!is_empty_part(text_parts.value.slice(-1)[0])) {
				text_parts.value.push({
					part: "",
					text: [["", "", "", ""]]
				});
			} else {
				// if the second-last part is also empty, remove the last one
				if (text_parts.value.length > 1 && is_empty_part(text_parts.value.slice(-2)[0])) {
					text_parts.value.pop();
				}
			}
		}
	}

	function is_empty_part(part: SongTextPart): boolean {
		return (
			part.part.length === 0 &&
			part.text.every((part) =>
				part.every((text, index) => index >= metadata.value.LangCount || text.length === 0)
			)
		);
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

	function select_media(selection: CasparFile) {
		if (selection && !selection.is_dir) {
			background_media.value = selection;
			media_selection.value = selection;
			show_media_selector.value = false;
		}
	}

	function add_part_callback(part: SongTextPart): string {
		return part.part;
	}

	function save_song(overwrite: boolean = false): boolean {
		show_save_file_dialogue.value = false;

		// if there is no file-name, open the save-dialogue
		if (song_file_name.value === "") {
			show_save_file_dialogue.value = true;

			return false;
		}

		let save_path: string = song_file_name.value + ".sng";

		// if the directory-stack is filled, use its top-most as the path
		if (song_directory_stack.value.length > 0) {
			save_path = song_directory_stack.value.slice(-1)[0].path + "/" + save_path;
		}

		const id = Globals.add_confirm((state: boolean) => {
			if (state) {
				Globals.control_window_state_confirm = undefined;

				// reset the item-files
				Globals.item_files.value.song = [];
			}
		});

		Globals.ws?.send<JCGPRecv.SaveFile>({
			command: "save_file",
			type: "song",
			path: save_path,
			overwrite,
			id,
			data: create_song_data()
		});

		return true;
	}

	function create_song_data(): SongData {
		const song_data_object: SongData = {
			metadata: {
				...metadata.value,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				BackgroundImage: background_media.value?.path
			},
			text: {}
		};

		// filter out empty metadata
		song_data_object.metadata = Object.fromEntries(
			Object.entries(song_data_object.metadata).filter(([key, value]) => value !== "")
		) as SongFileMetadata;

		// filter out the last, empty element
		const saved_text_parts = text_parts.value.filter(
			(text_part, index) => index < text_parts.value.length - 1 || !is_empty_part(text_part)
		);

		saved_text_parts.forEach((part) => {
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
						return { lang: lang_index, text: slide[lang_index].split("\n")[line_index] ?? "" };
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
			if (metadata.value.ChurchSongID) {
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
			Globals.control_window_state_confirm = confirm_dialog;
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
				<Draggable
					class="content"
					id="text_editor_container"
					v-model="text_parts"
					:group="{ name: 'song_part', pull: 'clone', put: false }"
					handle=".text_part_handle.enabled"
					animation="150"
					easing="cubic-bezier(1, 0, 0, 1)"
					delay-on-touch-only="true"
					delay="250"
					ghost-class="draggable_ghost"
					:clone="add_part_callback"
				>
					<div v-for="(part, index) of text_parts" class="text_part" :key="index">
						<div class="verse_part" :style="{ color: get_song_part_color(part.part) }">
							{{ text_parts[index].part }}
						</div>
						<div
							class="draggable_handle text_part_handle"
							:class="{ enabled: index < text_parts.length - 1 }"
						>
							<FontAwesomeIcon :icon="['fas', 'up-down-left-right']" />
						</div>
						<div class="text_part_data">
							<input
								placeholder="Part Name"
								v-model="text_parts[index].part"
								:style="{ color: get_song_part_color(part.part) }"
							/>
							<Draggable
								class="text_part_text"
								v-model="part.text"
								:group="{ name: 'text_part', pull: true, put: true }"
								handle=".text_slide_handle.enabled"
								animation="150"
								easing="cubic-bezier(1, 0, 0, 1)"
								delay-on-touch-only="true"
								delay="250"
								ghost-class="draggable_ghost"
							>
								<div
									v-for="(slide, slide_index) of part.text"
									class="song_text_language"
									:key="slide_index"
								>
									<div
										class="draggable_handle text_slide_handle"
										:class="{ enabled: index < text_parts.length - 1 }"
									>
										<FontAwesomeIcon :icon="['fas', 'bars']" />
									</div>
									<template v-for="(language, language_index) of slide" :key="language_index">
										<textarea
											v-show="clamp_lang_count() > language_index"
											ref="textarea_refs"
											v-model="part.text[slide_index][language_index]"
											:rows="(language.match(/\n/g) || []).length + 1"
											:placeholder="
												`Slide ${slide_index + 1}` +
												(metadata.LangCount > 1 ? ` - Language ${language_index + 1}` : '')
											"
										/>
									</template>
								</div>
							</Draggable>
						</div>
						<MenuButton
							:square="true"
							:disabled="text_parts.length <= 1 || index === text_parts.length - 1"
							@click="
								text_parts.length > 1 && index < text_parts.length - 1
									? text_parts.splice(index, 1)
									: undefined
							"
						>
							<FontAwesomeIcon :icon="['fas', 'trash']" />
						</MenuButton>
						<MenuButton
							:square="true"
							:disabled="text_parts.length <= 1 || index === text_parts.length - 1"
							@click="metadata.VerseOrder?.push(part.part)"
						>
							<FontAwesomeIcon :icon="['fas', 'plus']" />
						</MenuButton>
					</div>
				</Draggable>
			</div>
		</div>
		<div>
			<div class="container">
				<div class="header">Song-File</div>
				<div class="content">
					<div class="row_container">
						<MenuButton
							:disabled="song_file_name === ''"
							@click="song_file_name !== '' ? save_song(true) : undefined"
						>
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
					:group="{ name: 'song_part', pull: false, put: true }"
					animation="150"
					easing="cubic-bezier(1, 0, 0, 1)"
					delay-on-touch-only="true"
					delay="250"
					ghost-class="draggable_ghost"
				>
					<div
						v-for="(part, index) of metadata.VerseOrder"
						:key="index"
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
		<MediaDialogue
			class="file_dialogue"
			:hide_header="true"
			v-model:directory_stack="media_directory_stack"
			v-model:selection="media_selection"
			@choose="(ff) => select_media(ff as CasparFile)"
		>
			<template v-slot:buttons>
				<MenuButton
					class="file_dialogue_button"
					@click="media_selection ? select_media(media_selection) : undefined"
				>
					<FontAwesomeIcon :icon="['fas', 'plus']" />Select Media
				</MenuButton>
			</template>
		</MediaDialogue>
	</PopUp>
	<PopUp title="Save Song" v-model:active="show_save_file_dialogue" :maximize="true">
		<SongDialogue
			class="file_dialogue"
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
				<input
					class="file_name_box"
					v-model="song_file_name"
					placeholder="Filename"
					@input="song_selection = undefined"
				/>
				<MenuButton id="select_song_button" :disabled="song_file_name === ''" @click="save_song()">
					<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Song
				</MenuButton>
			</template>
		</SongDialogue>
	</PopUp>
	<PopUp title="Save Changes" v-model:active="show_save_confirm">
		<div id="save_changes_popup">
			<MenuButton
				@click="
					show_save_confirm = false;
					save_callback(save_song(true));
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
		</div>
	</PopUp>
</template>

<style scoped>
	#new_song_container {
		flex: 1;
		display: flex;
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

		overflow: hidden;
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
		align-items: baseline;

		gap: inherit;

		overflow: visible;
	}

	.text_part > * {
		overflow: visible;
	}

	#text_editor_container .verse_part {
		display: none;
	}

	#verse_order > .text_part > :not(.verse_part) {
		display: none !important;
	}

	#verse_order > .text_part > .verse_part {
		display: unset;
	}

	.text_part_data {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.text_part_text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.draggable_handle {
		aspect-ratio: 1;

		border-radius: 0.25rem;

		height: 2em;

		display: flex;
		align-items: center;
		justify-content: center;
	}

	.draggable_handle:not(.enabled) > * {
		color: var(--color-text-disabled);
	}

	.draggable_handle.enabled {
		cursor: move;
	}

	.text_part_data > input {
		width: 100%;
	}

	.song_text_language {
		flex: 1;
		display: flex;
		gap: inherit;
	}

	.song_text_language > textarea {
		flex: 1;
		resize: none;
	}

	#verse_order_container {
		flex: 1;
	}

	#verse_order {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
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

		padding: 0.25rem;
	}

	.file_dialogue_button {
		flex: 1;
	}

	.draggable_ghost {
		color: var(--color-text-disabled);
	}

	#save_changes_popup {
		padding: 0.5rem;
		display: flex;
		gap: 0.25rem;

		background-color: var(--color-container);
	}

	#save_changes_popup > .button {
		margin: 0;
	}
</style>

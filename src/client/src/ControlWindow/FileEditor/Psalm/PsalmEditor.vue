<script lang="ts">
	export interface PsalmTextBlock {
		text: string;
		indent: boolean;
	}
</script>

<script setup lang="ts">
	import { reactive, ref, watch, type Ref } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import type { SearchInputDefinitions } from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";
	import PopUp from "@/ControlWindow/PopUp.vue";

	import type { File, PsalmFile } from "@server/search_part";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { PsalmFile as PsalmData } from "@server/PlaylistItems/Psalm";

	library.add(fas.faPlus, fas.faTrash, fas.faFloppyDisk, fas.faIndent);

	const props = defineProps<{
		ws: WebSocket;
		psalm_files: PsalmFile[];
	}>();

	const emit = defineEmits<{}>();

	const show_save_file_dialogue = ref<boolean>(false);
	const psalm_file_tree = ref<PsalmFile[]>();
	const psalm_selection = ref<File>();
	const psalm_search_strings = ref<SearchInputDefinitions<"name">>([
		{ id: "name", placeholder: "Name", value: "" }
	]);
	const psalm_file_name = defineModel<string>("psalm_file_name", { default: "" });
	const metadata = defineModel<PsalmData["metadata"]>("metadata", {
		default: reactive({ caption: "", id: "", book: "", indent: true })
	});
	const psalm_text = defineModel<PsalmTextBlock[][]>("psalm_text", {
		default: reactive([[{ text: "", indent: false }]])
	});

	// watch for new psalm-files
	watch(
		() => props.psalm_files,
		() => {
			psalm_search_map = create_search_map(props.psalm_files);

			search_psalm();
		}
	);

	type SearchMapFile<K extends File> = K & {
		children?: SearchMapFile<K>[];
		search_data?: { name: string };
	};
	let psalm_search_map: SearchMapFile<PsalmFile>[] = [];
	function create_search_map(files: PsalmFile[]): SearchMapFile<File>[] {
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
	// process psalm-file-search-queries
	function search_psalm() {
		psalm_file_tree.value = search_string(psalm_search_map, psalm_search_strings.value);
	}

	// create search-trees
	function search_string(
		files: SearchMapFile<File>[],
		search_inputs: SearchInputDefinitions<"name">
	): PsalmFile[] {
		const return_files: PsalmFile[] = [];

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

	function on_text_change() {
		let indent_state: boolean = false;

		psalm_text.value.forEach((slide) => {
			// if the last slide isn't empty, add another one
			if (slide[slide.length - 1].text !== "") {
				slide.push({ text: "", indent: indent_state });

				// else if the second-last is also empty, remove the last one
			} else if (slide[slide.length - 2]?.text === "" && slide.length > 1) {
				slide.pop();
			}

			// set the indentation for all blocks
			slide.forEach((block) => {
				block.indent = indent_state;

				// only flip the indentation, if the block isn't empty
				if (block.text !== "") {
					indent_state = !indent_state;
				}
			});
		});
	}

	watch(
		() => psalm_text.value,
		() => {
			on_text_change();
		},
		{ deep: true }
	);

	function get_psalm_files() {
		const message: JGCPRecv.GetItemFiles = {
			command: "get_item_files",
			type: "psalm"
		};

		props.ws.send(JSON.stringify(message));
	}

	function add_slide() {
		const last_slide = psalm_text.value[psalm_text.value.length - 1];

		psalm_text.value.push([
			{ text: "", indent: last_slide[last_slide.length - 1].indent && metadata.value.indent }
		]);
	}

	const overwrite_dialog = ref<boolean>(false);
	let overwrite_path: string = "";
	function save_psalm(overwrite: boolean = false) {
		// if no file is selected, save at the root dir
		let save_path: string;
		if (psalm_selection.value === undefined) {
			save_path = psalm_file_name.value + ".psm";
		} else {
			// if the selection is a file, replace the file-name with the file-name
			if (psalm_selection.value.children === undefined) {
				save_path =
					psalm_selection.value.path.slice(0, psalm_selection.value.path.lastIndexOf("/") + 1) +
					psalm_file_name.value +
					".psm";
			} else {
				save_path = psalm_selection.value.path + "/" + psalm_file_name.value + ".psm";
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

			if (overwrite === false && compare_file(props.psalm_files, save_path)) {
				overwrite_path = save_path;

				overwrite_dialog.value = true;

				return;
			}
		}

		const message: JGCPRecv.SaveFile = {
			command: "save_file",
			path: save_path,
			type: "psalm",
			data: create_psalm_data()
		};

		props.ws.send(JSON.stringify(message));
	}

	function create_psalm_data(): PsalmData {
		const psalm_data: PsalmData = {
			metadata: metadata.value,
			text: [[[]]]
		};

		psalm_data.text = psalm_text.value.map((slide) => {
			// filter out the empty, last elements meant for the next slide to be inputted (but keep it if it is the first)
			const slide_blocks = slide.filter((block, block_index, text_block) => {
				// if it is the first element use it always
				if (block_index === 0) {
					return true;
				}

				// if it is the last element and empty, don't use it
				return !(block_index === text_block.length - 1 && block.text === "");
			});

			return slide_blocks.map((part) => part.text.split("\n"));
		});

		return psalm_data;
	}

	function show_save_dialogue() {
		// if there currently is no file-name for the psalm, try to generate it from the psalm-data
		if (psalm_file_name.value === "") {
			// if the id is specified, use it
			if (metadata.value.id !== undefined) {
				psalm_file_name.value = metadata.value.id;

				// if there is also a title defined, add an seperator
				if (metadata.value.caption !== "") {
					psalm_file_name.value += " - ";
				}
			}

			// if a title is defined, use it
			if (metadata.value.caption !== "") {
				psalm_file_name.value += metadata.value.caption;
			}
		}

		show_save_file_dialogue.value = true;
	}
</script>

<template>
	<div id="new_psalm_container">
		<div id="metadata_container">
			<div class="container">
				<div class="header">Psalm-Caption</div>
				<div class="content" id="title_input_container">
					<input v-model="metadata.caption" placeholder="Caption" />
				</div>
			</div>
			<div class="container">
				<div class="header">Psalm ID</div>
				<div class="content">
					<input v-model="metadata.id" placeholder="Psalm ID" />
				</div>
			</div>
			<div class="container">
				<div class="header">Indentation</div>
				<div class="content">
					<MenuButton v-model="metadata.indent">
						<FontAwesomeIcon :icon="['fas', 'indent']" />Indent
					</MenuButton>
				</div>
			</div>
			<div class="container">
				<div class="header">Psalm-File</div>
				<div class="content">
					<div class="row_container">
						<MenuButton @click="save_psalm()">
							<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save
						</MenuButton>
						<MenuButton @click="show_save_dialogue()">
							<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save As
						</MenuButton>
					</div>
				</div>
			</div>
		</div>
		<div class="container" id="text_container">
			<div class="header">Text</div>
			<div class="content" id="text_editor_container">
				<div v-for="(slide, slide_index) of psalm_text" class="psalm_slide">
					<MenuButton @click="psalm_text.splice(slide_index, 1)" :square="true">
						<FontAwesomeIcon :icon="['fas', 'trash']" />
					</MenuButton>
					<div class="psalm_text_block">
						<template v-for="(block, block_index) of slide">
							<textarea
								:class="{ indent: block.indent && metadata.indent }"
								:rows="(block.text.match(/\n/g) || []).length + 1"
								v-model="psalm_text[slide_index][block_index].text"
								placeholder="Textblock"
							/>
						</template>
					</div>
				</div>
			</div>
			<MenuButton @click="add_slide()">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Slide
			</MenuButton>
		</div>
	</div>
	<PopUp title="Save Psalm" v-model:active="show_save_file_dialogue" :maximize="true">
		<FileDialogue
			class="file_dialogue"
			name="Save Path"
			:files="psalm_file_tree"
			:select_dirs="true"
			v-model:selection="psalm_selection"
			v-model:search_strings="psalm_search_strings"
			@search="search_psalm"
			@refresh_files="get_psalm_files()"
		>
			<template v-slot:buttons>
				<input class="file_name_box" v-model="psalm_file_name" placeholder="Filename" @input="" />
				<MenuButton id="select_psalm_button" @click="save_psalm()">
					<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Psalm
				</MenuButton>
			</template>
		</FileDialogue>
	</PopUp>
</template>

<style scoped>
	#new_psalm_container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	#metadata_container {
		display: flex;
		gap: inherit;
	}

	#metadata_container > :first-child {
		flex: 1;
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

		transition: padding 0.5s ease;
	}

	input:focus,
	textarea:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	textarea.indent {
		padding-left: 2rem;
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

		gap: 1rem;
	}

	.psalm_slide {
		display: flex;

		gap: 0.25rem;

		overflow: visible;
	}

	.psalm_slide > * {
		overflow: visible;
	}

	.psalm_slide_title {
		flex: 1;
		display: flex;
		gap: 0.25rem;
	}

	.psalm_slide_title > input {
		width: 100%;
	}

	.psalm_text_block {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: inherit;
	}

	.psalm_text_block > textarea {
		flex: 1;

		resize: none;
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

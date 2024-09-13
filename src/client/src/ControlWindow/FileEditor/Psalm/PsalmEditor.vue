<script lang="ts">
	export interface PsalmTextBlock {
		text: string;
		indent: boolean;
	}
</script>

<script setup lang="ts">
	import { reactive, ref, watch } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { VueDraggableNext as Draggable } from "vue-draggable-next";

	import type { SearchInputDefinitions } from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		create_directory_stack
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import PopUp from "@/ControlWindow/PopUp.vue";
	import Globals from "@/Globals";

	import type { Directory, PsalmFile } from "@server/search_part";
	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { PsalmFile as PsalmData } from "@server/PlaylistItems/Psalm";

	library.add(fas.faBars, fas.faTrash, fas.faFloppyDisk, fas.faIndent, fas.faCheck);

	const show_save_file_dialogue = ref<boolean>(false);
	const file_selection = defineModel<PsalmFile | undefined>("psalm_file", { default: undefined });
	const psalm_search_strings = ref<SearchInputDefinitions<"name", "psalm">>([
		{ id: "name", placeholder: "Name", value: "", get: (ff) => ff.name }
	]);
	const psalm_file_name = ref<string>("");
	const metadata = defineModel<PsalmData["metadata"]>("metadata", {
		default: () => reactive({ caption: "", id: "", book: "", indent: true })
	});
	const psalm_text = defineModel<PsalmTextBlock[][]>("psalm_text", {
		default: () => reactive([[{ text: "", indent: false }]])
	});

	watch(
		() => file_selection.value,
		() => {
			if (file_selection.value !== undefined && !file_selection.value.is_dir) {
				psalm_file_name.value = file_selection.value.name.replace(/\.psm$/, "");
			}
		},
		{ immediate: true }
	);

	const directory_stack = ref<Directory<"psalm">[]>([]);
	watch(
		() => [file_selection.value, Globals.get_psalm_files()],
		() => {
			if (file_selection.value !== undefined) {
				const dir_stack = file_selection.value.path.split(/[\\/]/g);

				directory_stack.value = create_directory_stack(Globals.get_psalm_files(), dir_stack);
			}
		},
		{ immediate: true }
	);

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

		// if the last slide isn't empty, add another one
		if (psalm_text.value.length > 0) {
			if (!is_empty_slide(psalm_text.value.slice(-1)[0])) {
				psalm_text.value.push([
					{
						text: "",
						indent: indent_state
					}
				]);
			} else {
				// if the second-last part is also empty, remove the last one
				if (psalm_text.value.length > 1 && is_empty_slide(psalm_text.value.slice(-2)[0])) {
					psalm_text.value.pop();
				}
			}
		}
	}

	function is_empty_slide(part: PsalmTextBlock[]): boolean {
		return part.every((block) => block.text.length === 0);
	}

	watch(
		() => psalm_text.value,
		() => {
			on_text_change();
		},
		{ deep: true }
	);

	function save_psalm(overwrite: boolean = false): boolean {
		show_save_file_dialogue.value = false;

		// if there is no file-name, open the save-dialogue
		if (psalm_file_name.value === "") {
			show_save_file_dialogue.value = true;

			return false;
		}

		let save_path: string = psalm_file_name.value + ".psm";

		// if the directory-stack is filled, use its top-most as the path
		if (directory_stack.value.length > 0) {
			save_path = directory_stack.value.slice(-1)[0].path + "/" + save_path;
		}

		const id = Globals.add_confirm((state: boolean) => {
			if (state) {
				Globals.control_window_state_confirm = undefined;

				// reset the item-files
				Globals.item_files.value.psalm = [];
			}
		});

		Globals.ws?.send<JCGPRecv.SaveFile>({
			command: "save_file",
			path: save_path,
			type: "psalm",
			data: create_psalm_data(),
			id,
			overwrite
		});

		return true;
	}

	function create_psalm_data(): PsalmData {
		const psalm_data: PsalmData = {
			metadata: metadata.value,
			text: [[[]]]
		};

		// filter out the last, empty element
		const saved_psalm_text = psalm_text.value.filter(
			(text_part, index) => index < psalm_text.value.length - 1 || !is_empty_slide(text_part)
		);

		psalm_data.text = saved_psalm_text.map((slide) => {
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
			if (metadata.value.id) {
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

	// watch for any property changes to store
	let save_callback: (change_state: boolean) => void | undefined;
	const show_save_confirm = ref<boolean>(false);
	watch(
		() => [metadata, psalm_text],
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
						<MenuButton :disabled="psalm_file_name === ''" @click="save_psalm()">
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
				<div v-for="(slide, slide_index) of psalm_text" class="psalm_slide" :key="slide_index">
					<Draggable
						class="psalm_text_blocks"
						v-model="psalm_text[slide_index]"
						:group="{ name: 'text_blocks', pull: true, put: true }"
						handle=".text_part_handle.enabled"
						animation="150"
						easing="cubic-bezier(1, 0, 0, 1)"
						delay-on-touch-only="true"
						delay="250"
						ghost-class="draggable_ghost"
					>
						<div class="psalm_text_block" v-for="(block, block_index) of slide" :key="block_index">
							<div
								class="draggable_handle text_part_handle"
								:class="{ enabled: slide_index < psalm_text.length - 1 }"
							>
								<FontAwesomeIcon :icon="['fas', 'bars']" />
							</div>
							<textarea
								:class="{ indent: block.indent && metadata.indent }"
								:rows="(block.text.match(/\n/g) || []).length + 1"
								v-model="psalm_text[slide_index][block_index].text"
								placeholder="Textblock"
							/>
						</div>
					</Draggable>
					<MenuButton
						:disabled="psalm_text.length <= 1 || slide_index === psalm_text.length - 1"
						@click="
							psalm_text.length > 1 && slide_index < psalm_text.length - 1
								? psalm_text.splice(slide_index, 1)
								: undefined
						"
						:square="true"
					>
						<FontAwesomeIcon :icon="['fas', 'trash']" />
					</MenuButton>
				</div>
			</div>
		</div>
	</div>
	<PopUp title="Save Psalm" v-model:active="show_save_file_dialogue" :maximize="true">
		<FileDialogue
			class="file_dialogue"
			:files="Globals.get_psalm_files()"
			:select_dirs="true"
			:new_directory="true"
			v-model:selection="file_selection"
			v-model:search_strings="psalm_search_strings"
			v-model:directory_stack="directory_stack"
			@refresh_files="() => Globals.get_psalm_files(true)"
			@new_directory="
				(path: string) =>
					Globals.ws?.send<JCGPRecv.NewDirectory>({
						command: 'new_directory',
						path,
						type: 'psalm'
					})
			"
		>
			<template v-slot:buttons>
				<input
					class="file_name_box"
					v-model="psalm_file_name"
					placeholder="Filename"
					@input="file_selection = undefined"
				/>
				<MenuButton
					id="select_psalm_button"
					:disabled="psalm_file_name === ''"
					@click="save_psalm()"
				>
					<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Psalm
				</MenuButton>
			</template>
		</FileDialogue>
	</PopUp>
	<PopUp title="Save Changes" v-model:active="show_save_confirm">
		<div id="save_changes_popup">
			<MenuButton
				@click="
					show_save_confirm = false;
					save_callback(save_psalm());
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
		align-items: baseline;

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

	.psalm_text_blocks {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: inherit;
	}

	.psalm_text_block {
		display: flex;
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

		padding: 0.25rem;
	}

	.file_dialogue_button {
		flex: 1;
	}

	.draggable_handle {
		aspect-ratio: 1;

		border-radius: 0.25rem;

		height: 2em;

		display: flex;
		align-items: center;
		justify-content: center;
	}

	.draggable_handle:not(.enabled) {
		color: var(--color-text-disabled);
	}

	.draggable_handle.enabled {
		cursor: move;
	}

	.draggable_ghost {
		opacity: 0.25;
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

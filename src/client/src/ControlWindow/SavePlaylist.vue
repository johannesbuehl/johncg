<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import FileDialogue from "./FileDialogue/FileDialogue.vue";
	import MenuButton from "./MenuBar/MenuButton.vue";
	import Globals from "@/Globals";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { PlaylistFile } from "@server/search_part";
	import PopUp from "./PopUp.vue";
	import { ControlWindowState } from "@/Enums";

	library.add(fas.faFolderOpen);

	const file_dialogue_selection = ref<PlaylistFile>();
	const file_dialogue_directory_stack = ref<PlaylistFile[]>([]);
	const playlist_file = ref<PlaylistFile>();

	const playlist_file_name = defineModel<string>("playlist_file_name", { required: true });

	onMounted(() => {
		Globals.get_playlist_files();
	});

	const overwrite_dialog = ref<boolean>(false);
	let overwrite_file: PlaylistFile | undefined = undefined;
	function save_playlist(playlist?: PlaylistFile, overwrite: boolean = false) {
		// if the selection is a directory, exit
		if (playlist?.children !== undefined) {
			return;
		}

		// if there is no playlist-file argument, create it
		if (playlist === undefined) {
			playlist = playlist_file.value ?? {
				path:
					(file_dialogue_directory_stack.value.length > 0
						? file_dialogue_directory_stack.value.slice(-1)[0].path + "/"
						: "") +
					playlist_file_name.value +
					".jcg",
				name: playlist_file_name.value
			};
		}

		// close the overwrite-dialog
		overwrite_dialog.value = false;

		// check, wether the file already exists
		const compare_file = (files: PlaylistFile[], reference_file: PlaylistFile): boolean => {
			return files.some((fil) => {
				if (fil.path === reference_file.path) {
					return true;
				}

				if (fil.children !== undefined) {
					return compare_file(fil.children, reference_file);
				}

				return false;
			});
		};

		// overwrite is false and the file already exists, abort
		if (overwrite === false && compare_file(Globals.get_playlist_files(), playlist)) {
			overwrite_file = playlist;

			overwrite_dialog.value = true;

			return;
		}

		console.debug(playlist);

		Globals.ws?.send<JCGPRecv.SavePlaylist>({
			command: "save_playlist",
			playlist: playlist.path
		});

		Globals.ControlWindowState = ControlWindowState.Slides;
	}
</script>

<template>
	<FileDialogue
		name="Playlist Files"
		:files="Globals.get_playlist_files()"
		:search_disabled="true"
		v-model:selection="file_dialogue_selection"
		v-model:directory_stack="file_dialogue_directory_stack"
		:select_dirs="true"
		:new_directory="true"
		@choose="(playlist) => save_playlist(playlist)"
		@refresh_files="() => Globals.get_playlist_files(true)"
		@new_directory="
			(path: string) =>
				Globals.ws?.send<JCGPRecv.NewDirectory>({
					command: 'new_directory',
					path,
					type: 'playlist'
				})
		"
	>
		<template v-slot:buttons>
			<input class="file_name_box" v-model="playlist_file_name" placeholder="Filename" @input="" />
			<MenuButton @click="save_playlist()">
				<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Playlist
			</MenuButton>
		</template>
	</FileDialogue>
	<PopUp v-model:active="overwrite_dialog" title="Overwrite Playlist">
		<div id="popup_menu_wrapper">
			<div class="popup_menu_content">
				The playlist
				<div class="file_path">{{ overwrite_file?.path }}</div>
				already exists. Overwrite?
			</div>
			<div class="popup_menu_buttons">
				<MenuButton @click="save_playlist(file_dialogue_selection, true)">Overwrite</MenuButton>
				<MenuButton @click="overwrite_dialog = false">Cancel</MenuButton>
			</div>
		</div>
	</PopUp>
</template>

<style scoped>
	.file_name_box {
		font-size: 1.5rem;

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);

		flex: 1;
	}

	.file_name_box:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	.file_name_box::placeholder {
		color: var(--color-text-disabled);
	}

	.file_name_box:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	#popup_menu_wrapper {
		background-color: var(--color-container);
	}

	.popup_menu_content {
		padding: 0.5rem;
	}

	.file_path {
		font-family: "Courier New", Courier, monospace;

		text-wrap: wrap;

		background-color: var(--color-item);

		margin: 0.5rem;
		padding: 0.5rem;

		border-radius: 0.25rem;
	}

	.popup_menu_buttons {
		display: grid;

		grid-template-columns: 1fr 1fr;
	}
</style>

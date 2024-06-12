<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
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

	const selection = ref<PlaylistFile>();

	const file_name = defineModel<string>("file_name", { required: true });

	onMounted(() => {
		Globals.get_playlist_files();
	});

	const overwrite_dialog = ref<boolean>(false);
	let overwrite_path: string = "";
	function save_playlist(playlist?: PlaylistFile, overwrite: boolean = false) {
		// close the overwrite-dialog
		overwrite_dialog.value = false;

		// if no file is selected, save at the root dir
		let save_path: string;
		if (playlist === undefined) {
			save_path = file_name.value + ".jcg";
		} else {
			// if the selection is a file, replace the file-name with the input-file-name
			if (playlist.children === undefined) {
				save_path =
					playlist.path.slice(0, playlist.path.lastIndexOf("/") + 1) + file_name.value + ".jcg";
			} else {
				save_path = playlist.path + "/" + file_name.value + ".jcg";
			}

			// if the save file exists already, ask wether it should be overwritten
			const compare_file = (files: PlaylistFile[], path: string): boolean => {
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

			if (overwrite === false && compare_file(Globals.get_playlist_files(), save_path)) {
				overwrite_path = save_path;

				overwrite_dialog.value = true;

				return;
			}
		}

		Globals.ws?.send<JCGPRecv.SavePlaylist>({
			command: "save_playlist",
			playlist: save_path
		});

		Globals.ControlWindowState = ControlWindowState.Slides;
	}

	watch(selection, () => {
		if (selection.value !== undefined && selection.value?.children === undefined) {
			file_name.value = selection.value.name;
		}
	});
</script>

<template>
	<FileDialogue
		name="Playlist Files"
		:files="Globals.get_playlist_files()"
		:search_disabled="true"
		v-model:selection="selection"
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
			<input class="file_name_box" v-model="file_name" placeholder="Filename" @input="" />
			<MenuButton @click="save_playlist(selection)">
				<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Playlist
			</MenuButton>
		</template>
	</FileDialogue>
	<PopUp v-model:active="overwrite_dialog" title="Overwrite Playlist">
		<div class="popup_menu_content">
			The playlist
			<div class="file_path">{{ overwrite_path }}</div>
			already exists. Overwrite?
		</div>
		<div class="popup_menu_buttons">
			<MenuButton @click="save_playlist(selection, true)">Overwrite</MenuButton>
			<MenuButton @click="overwrite_dialog = false">Cancel</MenuButton>
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

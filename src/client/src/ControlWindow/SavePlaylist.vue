<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import FileDialogue from "./FileDialogue/FileDialogue.vue";
	import MenuButton from "./MenuBar/MenuButton.vue";
	import Globals from "@/Globals";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { Directory, Node, PlaylistFile } from "@server/search_part";

	library.add(fas.faFolderOpen);

	const file_dialogue_selection = ref<PlaylistFile>();
	const file_dialogue_directory_stack = ref<Directory<"playlist">[]>([]);
	const playlist_file = ref<PlaylistFile>();

	const playlist_file_name = defineModel<string>("playlist_file_name", { required: true });

	onMounted(() => {
		Globals.get_playlist_files();
	});

	function save_playlist(playlist?: Node<"playlist">) {
		// if the selection is a directory, exit
		if (playlist?.is_dir) {
			return;
		}

		// if there is no playlist-file argument, create it

		const new_playlist = playlist ??
			playlist_file.value ?? {
				path:
					(file_dialogue_directory_stack.value.length > 0
						? file_dialogue_directory_stack.value.slice(-1)[0].path + "/"
						: "") +
					playlist_file_name.value +
					".jcg",
				name: playlist_file_name.value
			};

		const id = Globals.add_confirm((state: boolean) => {
			if (state === true) {
				Globals.previous_control_window_state();
			}
		});

		Globals.ws?.send<JCGPRecv.SavePlaylist>({
			command: "save_playlist",
			playlist: new_playlist.path,
			id: id
		});
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
			<input class="file_name_box" v-model="playlist_file_name" placeholder="Filename" />
			<MenuButton @click="save_playlist()">
				<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />Save Playlist
			</MenuButton>
		</template>
	</FileDialogue>
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
</style>

<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import FileDialogue, { type SearchInputDefinitions } from "./FileDialogue/FileDialogue.vue";
	import MenuButton from "./MenuBar/MenuButton.vue";
	import { ControlWindowState } from "@/Enums";
	import Globals from "@/Globals";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { Node, PlaylistFile } from "@server/search_part";

	library.add(fas.faFolderOpen);

	const selection = ref<PlaylistFile>();

	const search_strings = ref<SearchInputDefinitions<"name", "playlist">>([
		{ id: "name", placeholder: "Name", value: "", get: (ff) => ff.name }
	]);

	function load_playlist(playlist?: Node<"playlist">) {
		// if the selection is a directory, exit
		if (playlist !== undefined && !playlist.is_dir) {
			const id = Globals.add_confirm((state: boolean) => {
				if (state === true) {
					Globals.ControlWindowState = ControlWindowState.Slides;
				}
			});

			Globals.ws?.send<JCGPRecv.OpenPlaylist>({
				command: "load_playlist",
				playlist: playlist.path,
				id: id
			});
		}
	}
</script>

<template>
	<FileDialogue
		key="playlist"
		:files="Globals.get_playlist_files()"
		name="Playlist Files"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="load_playlist"
		@refresh_files="() => Globals.get_playlist_files(true)"
	>
		<template v-slot:buttons>
			<MenuButton @click="load_playlist(selection)">
				<FontAwesomeIcon :icon="['fas', 'folder-open']" />Load Playlist
			</MenuButton>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}
</style>

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
	import type { PlaylistFile } from "@server/search_part";

	library.add(fas.faFolderOpen);

	const selection = ref<PlaylistFile>();

	const search_strings = ref<SearchInputDefinitions<"name">>([
		{ id: "name", placeholder: "Name", value: "" }
	]);

	type SearchMapFile = PlaylistFile & {
		search_data?: { name: string };
	};
	let search_map: SearchMapFile[] = [];
	const file_tree = defineModel<PlaylistFile[]>("file_tree");

	watch(
		() => Globals.get_playlist_files(),
		() => {
			search_map = create_search_map(Globals.get_playlist_files());

			search_file();
		},
		{ immediate: true, deep: true }
	);

	watch(search_strings.value, () => {
		search_file();
	});

	function load_playlist(playlist?: PlaylistFile) {
		// if the selection is a directory, exit
		if (playlist !== undefined && playlist?.children === undefined) {
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

	function search_file() {
		file_tree.value = search_string();
	}

	function create_search_map(files: PlaylistFile[]): SearchMapFile[] {
		const return_map: SearchMapFile[] = [];

		files.forEach((f) => {
			return_map.push({
				...f,
				search_data: {
					name: f.name.toLowerCase()
				}
			});

			if (f.children !== undefined) {
				return_map.push(...create_search_map(f.children));
			}
		});

		return return_map;
	}

	function search_string(files: SearchMapFile[] | undefined = search_map): PlaylistFile[] {
		// if there are no search-strings, return the default files
		if (search_strings.value.every((search_string) => search_string.value === "")) {
			return Globals.get_playlist_files();
		}

		const return_files: PlaylistFile[] = [];

		files?.forEach((f) => {
			if (
				search_strings.value.every((search_string) => {
					if (f.search_data !== undefined) {
						if (f.search_data[search_string.id] !== undefined) {
							f.hidden = !f.search_data[search_string.id]?.includes(
								search_string.value.toLowerCase()
							);
						} else {
							f.hidden = search_string.value !== "";
						}
					} else {
						f.hidden = false;
					}

					return f.hidden !== true;
				})
			) {
				return_files.push(f);
			} else if (f.children !== undefined) {
				if (f.children.length > 0) {
					return_files.push({
						...f,
						children: search_string(f.children)
					});
				}
			}
		});

		return return_files;
	}
</script>

<template>
	<FileDialogue
		key="playlist"
		:files="file_tree"
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

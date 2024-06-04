<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import FileDialogue, {
		type SearchInputDefinitions
	} from "./ItemDialogue/FileDialogue/FileDialogue.vue";
	import MenuButton from "./MenuBar/MenuButton.vue";
	import { ControlWindowState } from "@/Enums";

	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { PlaylistFile } from "@server/search_part";

	library.add(fas.faFolderOpen);

	const props = defineProps<{
		ws: WebSocket;
		files: PlaylistFile[];
	}>();

	const selection = ref<PlaylistFile>();

	const search_strings = defineModel<SearchInputDefinitions<"name">>("search_strings", {
		default: [{ id: "name", placeholder: "Name", value: "" }]
	});

	type SearchMapFile = PlaylistFile & {
		children?: SearchMapFile[];
		search_data?: { name: string };
	};
	let search_map: SearchMapFile[] = [];
	const file_tree = defineModel<PlaylistFile[]>("file_tree");
	const control_window_state = defineModel<ControlWindowState>("control_window_state", {
		required: true
	});

	onMounted(() => {
		refresh_items();
	});

	watch(
		() => props.files,
		() => {
			search_map = create_search_map();

			search_file();
		},
		{ immediate: true, deep: true }
	);

	function refresh_items() {
		const message: JGCPRecv.GetItemFiles = {
			command: "get_item_files",
			type: "playlist"
		};

		props.ws.send(JSON.stringify(message));
	}

	function load_playlist(playlist?: PlaylistFile) {
		if (playlist !== undefined) {
			const message: JGCPRecv.OpenPlaylist = {
				command: "load_playlist",
				playlist: playlist.path
			};

			props.ws.send(JSON.stringify(message));

			control_window_state.value = ControlWindowState.Slides;
		}
	}

	function search_file() {
		file_tree.value = search_string();
	}

	function create_search_map(files: PlaylistFile[] | undefined = props.files): SearchMapFile[] {
		const return_map: SearchMapFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
				return_map.push({
					...f,
					search_data: {
						name: f.name.toLowerCase()
					},
					children: f.children !== undefined ? create_search_map(f.children) : undefined
				});
			});
		}

		return return_map;
	}

	function search_string(files: SearchMapFile[] | undefined = search_map): PlaylistFile[] {
		const return_files: PlaylistFile[] = [];

		files?.forEach((f) => {
			if (
				search_strings.value.every((search_string) => {
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
				const children = search_string(f.children);

				if (children.length > 0) {
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
		@search="search_file"
		@refresh_files="refresh_items"
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

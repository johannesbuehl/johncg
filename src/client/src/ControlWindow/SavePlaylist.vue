<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import FileDialogue, {
		type SearchInputDefinitions
	} from "./ItemDialogue/FileDialogue/FileDialogue.vue";
	import MenuButton from "./MenuBar/MenuButton.vue";

	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { File } from "@server/search_part";
	import PopUp from "./PopUp.vue";
	import { ControlWindowState } from "@/Enums";

	library.add(fas.faFolderOpen);

	const props = defineProps<{
		ws: WebSocket;
		files: File[];
	}>();

	const selection = ref<File>();

	const search_strings = defineModel<SearchInputDefinitions<"name">>("search_strings", {
		default: [{ id: "name", placeholder: "Name", value: "" }]
	});
	const file_name = defineModel<string>("file_name", { required: true });
	const control_window_state = defineModel<ControlWindowState>("control_window_state", {
		required: true
	});

	type SearchMapFile = File & { children?: SearchMapFile[]; search_data?: { name: string } };
	let search_map: SearchMapFile[] = [];
	const file_tree = defineModel<File[]>("file_tree");

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

	const overwrite_dialog = ref<boolean>(false);
	let overwrite_path: string = "";
	function save_playlist(playlist?: File, overwrite: boolean = false) {
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

			if (overwrite === false && compare_file(props.files, save_path)) {
				overwrite_path = save_path;

				overwrite_dialog.value = true;

				return;
			}
		}

		const message: JGCPRecv.SavePlaylist = {
			command: "save_playlist",
			playlist: save_path
		};

		props.ws.send(JSON.stringify(message));

		control_window_state.value = ControlWindowState.Slides;
	}

	watch(selection, () => {
		if (selection.value !== undefined && selection.value?.children === undefined) {
			file_name.value = selection.value.name;
		}
	});

	function search_file() {
		file_tree.value = search_string();
	}

	function create_search_map(files: File[] | undefined = props.files): SearchMapFile[] {
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

	function search_string(files: SearchMapFile[] | undefined = search_map): File[] {
		const return_files: File[] = [];

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
		:files="file_tree"
		name="Playlist Files"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		:select_dirs="true"
		@choose="(playlist) => save_playlist(playlist)"
		@search="search_file"
		@refresh_files="refresh_items"
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

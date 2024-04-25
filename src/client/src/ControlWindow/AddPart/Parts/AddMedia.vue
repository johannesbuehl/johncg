<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";

	import type { MediaProps } from "@server/PlaylistItems/Media";
	import type { MediaFile } from "@server/search_part";

	library.add(fas.faPlus, fas.faRepeat);
	const props = defineProps<{
		files: MediaFile[];
	}>();

	const emit = defineEmits<{
		add: [item_props: MediaProps];
		refresh: [];
	}>();

	const selection = defineModel<MediaFile>({});
	const loop = ref<boolean>(false);

	const search_strings = defineModel<SearchInputDefinitions<"name">>("search_strings", {
		default: [{ id: "name", placeholder: "Name", value: "" }]
	});

	const file_tree = defineModel<MediaFile[]>("file_tree");

	onMounted(() => {
		// init
		refresh_search_index();

		init_files();
	});

	watch(
		() => props.files,
		() => {
			init_files();
		}
	);

	function init_files() {
		search_map = create_search_map();

		search_media();
	}

	function add_media(file?: MediaFile, type?: "dir" | "file") {
		if (file !== undefined && type === "file") {
			emit("add", create_props(file));
		}
	}

	function create_props(file: MediaFile): MediaProps {
		return {
			type: "media",
			caption: file.name,
			color: "#00FF00",
			media: file.path,
			loop: loop.value
		};
	}

	function search_media() {
		file_tree.value = search_string();
	}

	type SearchMapFile = MediaFile & { children?: SearchMapFile[]; search_data?: { name: string } };
	let search_map: SearchMapFile[] = [];
	function create_search_map(files: MediaFile[] | undefined = props.files): SearchMapFile[] {
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

	function search_string(files: SearchMapFile[] | undefined = search_map): MediaFile[] {
		const return_files: MediaFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
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
		}

		return return_files;
	}

	function refresh_search_index() {
		emit("refresh");
	}
</script>

<template>
	<FileDialogue
		:files="file_tree"
		:clone_callback="create_props"
		name="Media"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_media"
		@search="search_media"
		@refresh_files="refresh_search_index"
	>
		<template v-slot:buttons>
			<MenuButton @click="loop = !loop" :active="loop">
				<FontAwesomeIcon :icon="['fas', 'repeat']" />Loop
			</MenuButton>
			<MenuButton @click="add_media(selection, 'file')">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Media
			</MenuButton>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button:not(:first-child) {
		flex: 1;
	}
</style>

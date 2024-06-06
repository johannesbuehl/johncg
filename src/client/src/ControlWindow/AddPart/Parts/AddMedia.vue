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
	import type { Directory, ItemFile, MediaFile } from "@server/search_part";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import Globals from "@/Globals";

	library.add(fas.faPlus, fas.faRepeat);
	const props = defineProps<{
		files: MediaFile[];
		thumbnails: Record<string, string>;
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

	const file_tree = ref<MediaFile[]>([]);

	onMounted(() => {
		// init
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

		get_media_thumbnails(props.files);
	}

	function add_media(file: MediaFile | undefined) {
		if (file && file.children === undefined) {
			emit("add", create_props(file));
		} else {
			get_media_thumbnails(file?.children);
		}
	}

	// function create_props(file: ItemFile): MediaProps {
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

	type SearchMapFile = MediaFile & { search_data?: { name: string } };
	let search_map: SearchMapFile[] = [];
	function create_search_map(files: MediaFile[] | undefined = props.files): SearchMapFile[] {
		const return_map: SearchMapFile[] = [];

		if (files !== undefined) {
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
		}

		return return_map;
	}

	function search_string(files: SearchMapFile[] | undefined = search_map): MediaFile[] {
		// if there are no search-strings, return the default files
		if (search_strings.value.every((search_string) => search_string.value === "")) {
			return props.files;
		}

		const return_files: MediaFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
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

	function get_media_thumbnails(files: MediaFile[] | undefined) {
		files = (files ?? props.files).filter((ff) => ff.children === undefined);

		const message: JGCPRecv.GetMediaThumbnails = {
			command: "get_media_thumbnails",
			files
		};

		Globals.ws?.send(JSON.stringify(message));
	}
</script>

<template>
	<FileDialogue
		:files="file_tree"
		:thumbnails="thumbnails"
		:clone_callback="(file: ItemFile) => create_props(file as MediaFile)"
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
			<MenuButton
				@click="
					selection !== undefined && selection.children === undefined
						? add_media(selection)
						: undefined
				"
			>
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

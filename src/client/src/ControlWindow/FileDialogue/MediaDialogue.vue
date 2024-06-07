<script setup lang="ts">
	import { onMounted, reactive, ref, watch } from "vue";

	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";

	import type { MediaProps } from "@server/PlaylistItems/Media";
	import type { MediaFile } from "@server/search_part";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import Globals from "@/Globals";

	const props = defineProps<{
		files: MediaFile[];
		thumbnails: Record<string, string>;
		hide_header?: boolean;
		create_props_callback?: (file: MediaFile) => MediaProps;
	}>();

	const emit = defineEmits<{
		choose: [file: MediaFile];
	}>();

	const selection = defineModel<MediaFile>({});

	const directory_stack = defineModel<MediaFile[]>("directory_stack", {
		default: () => reactive([])
	});

	const search_strings = ref<SearchInputDefinitions<"name">>([
		{ id: "name", placeholder: "Name", value: "" }
	]);

	const file_tree = ref<MediaFile[]>([]);

	type SearchMapFile = MediaFile & { search_data?: { name: string } };
	let search_map: SearchMapFile[] = [];

	watch(
		() => props.files,
		() => {
			init_files();
		},
		{ immediate: true }
	);

	function init_files() {
		search_map = create_search_map();

		search_media();

		// if there are no fitting thumbnails , retriefe them also
		const thumbnail_files = Object.keys(props.thumbnails);
		if (
			!props.files
				.filter((ff) => ff.children === undefined)
				.every((ff) => thumbnail_files.includes(ff.path))
		) {
			get_media_thumbnails(props.files);
		}
	}

	watch(search_strings.value, () => {
		search_media();
	});

	function search_media() {
		file_tree.value = search_string();
	}

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
		const message: JGCPRecv.GetItemFiles = {
			command: "get_item_files",
			type: "media"
		};

		Globals.ws?.send(message);
	}

	function get_media_thumbnails(files: MediaFile[] | undefined) {
		console.debug("get_media_thumbnails");

		files = (files ?? props.files).filter((ff) => ff.children === undefined);

		const message: JGCPRecv.GetMediaThumbnails = {
			command: "get_media_thumbnails",
			files
		};

		Globals.ws?.send(message);
	}
</script>

<template>
	<FileDialogue
		:files="file_tree"
		:thumbnails="thumbnails"
		:hide_header="hide_header"
		:clone_callback="
			create_props_callback !== undefined
				? (file) => create_props_callback!(file as MediaFile)
				: undefined
		"
		name="Media"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		v-model:directory_stack="directory_stack"
		@refresh_files="refresh_search_index"
		@choose="
			(file) => {
				get_media_thumbnails(file?.children);
				$emit('choose', file as MediaFile);
			}
		"
	>
		<template v-slot:buttons>
			<slot name="buttons"></slot>
		</template>
		<template v-slot:edit>
			<slot name="edit"></slot>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button:not(:first-child) {
		flex: 1;
	}
</style>

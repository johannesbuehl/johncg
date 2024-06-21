<script setup lang="ts">
	import { reactive, ref, watch } from "vue";

	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import Globals from "@/Globals";

	import type { MediaProps } from "@server/PlaylistItems/Media";
	import type { MediaFile } from "@server/search_part";

	const props = defineProps<{
		hide_header?: boolean;
		create_props_callback?: (file: MediaFile) => MediaProps;
	}>();

	const emit = defineEmits<{
		choose: [file: MediaFile];
	}>();

	const selection = defineModel<MediaFile>("selection");

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
		() => Globals.get_media_files(),
		() => {
			search_map = create_search_map();

			search_media();

			// if there are no fitting thumbnails , retrieve them also
			// if the directory-stack is populated, use it
			let files: MediaFile[];
			if (directory_stack.value.length > 0) {
				files = directory_stack.value.slice(-1)[0].children ?? [];
			} else {
				files = Globals.get_media_files();
			}

			Globals.get_thumbnails(files.filter((ff) => ff.children === undefined));
		},
		{ immediate: true }
	);

	watch(search_strings.value, () => {
		search_media();
	});

	function search_media() {
		file_tree.value = search_string();
	}

	function create_search_map(
		files: MediaFile[] | undefined = Globals.get_media_files()
	): SearchMapFile[] {
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
			return Globals.get_media_files();
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
					if (f.children.length > 0) {
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

	function get_media_thumbnails(files: MediaFile[] | undefined) {
		files = (files ?? Globals.get_media_files()).filter((ff) => ff.children === undefined);

		Globals.get_thumbnails(files);
	}
</script>

<template>
	<FileDialogue
		:files="file_tree"
		:thumbnails="Globals.get_thumbnails()"
		:clone_callback="
			create_props_callback !== undefined
				? (file) => create_props_callback!(file as MediaFile)
				: undefined
		"
		:item_color="Globals.color.media"
		:name="!hide_header ? 'Media' : undefined"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		v-model:directory_stack="directory_stack"
		@refresh_files="() => Globals.get_media_files(true)"
		@choose="
			(file) => {
				if (file?.children !== undefined) {
					get_media_thumbnails(file?.children);
				}

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

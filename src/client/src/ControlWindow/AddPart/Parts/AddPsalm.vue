<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";

	import type { PsalmFile } from "@server/search_part";
	import type { PsalmProps } from "@server/PlaylistItems/Psalm";

	library.add(fas.faPlus);
	const props = defineProps<{
		files: PsalmFile[];
	}>();

	const emit = defineEmits<{
		add: [item_props: PsalmProps];
		refresh: [];
		new_psalm: [];
	}>();

	const selection = ref<PsalmFile>();

	const search_strings = ref<SearchInputDefinitions<keyof SearchMapData>>([
		{ id: "id", placeholder: "Psalm ID", value: "" },
		{ id: "caption", placeholder: "Title", value: "" }
	]);

	const file_tree = ref<PsalmFile[]>();

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

		search_psalm();
	}

	function add_psalm(file?: PsalmFile, type?: "dir" | "file") {
		if (file !== undefined && type === "file") {
			emit("add", create_props(file));
		}
	}

	function create_props(file: PsalmFile): PsalmProps {
		return {
			type: "psalm",
			caption: file.name,
			color: "#FFFF00",
			file: file.path
		};
	}

	function search_psalm() {
		file_tree.value = search_string();
	}

	interface SearchMapData {
		id: string;
		caption: string;
	}
	type SearchMapFile = PsalmFile & { children?: SearchMapFile[]; search_data?: SearchMapData };
	let search_map: SearchMapFile[] = [];
	function create_search_map(files: PsalmFile[] | undefined = props.files): SearchMapFile[] {
		const return_map: SearchMapFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
				if (f.children !== undefined) {
					return_map.push({
						...f,
						children: create_search_map(f.children)
					});
				} else {
					return_map.push({
						...f,
						search_data: {
							id: f.data?.metadata.id?.toLowerCase() ?? "",
							caption: f.data?.metadata?.caption?.toLowerCase() ?? ""
						}
					});
				}
			});
		}

		return return_map;
	}

	function search_string(files: SearchMapFile[] | undefined = search_map): PsalmFile[] {
		const return_files: PsalmFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
				if (f.children !== undefined) {
					const children = search_string(f.children);

					if (children.length > 0) {
						return_files.push({
							...f,
							children: search_string(f.children)
						});
					}
				} else {
					if (
						search_strings.value.every((search_string) => {
							if (f.search_data !== undefined) {
								if (f.search_data[search_string.id] !== undefined) {
									return f.search_data[search_string.id]?.includes(
										search_string.value.toLowerCase()
									);
								} else {
									return search_string.value === "";
								}
							} else {
								return true;
							}
						})
					) {
						return_files.push(f);
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
		:new_button="true"
		name="Psalm"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_psalm"
		@search="search_psalm"
		@refresh_files="refresh_search_index"
		@new_file="emit('new_psalm')"
	>
		<template v-slot:buttons>
			<MenuButton @click="add_psalm(selection, 'file')">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Psalm
			</MenuButton>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}

	:deep(.search_box:first-child) {
		width: 8rem;
		flex: none;
	}
</style>

<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";

	import type { PDFFile } from "@server/search_part";
	import type { PDFProps } from "@server/PlaylistItems/PDF";

	library.add(fas.faPlus, fas.faRepeat);
	const props = defineProps<{
		files: PDFFile[];
	}>();

	const emit = defineEmits<{
		add: [item_props: PDFProps];
		refresh: [];
	}>();

	const selection = defineModel<PDFFile>({});

	const search_strings = defineModel<SearchInputDefinitions<"name">>("search_strings", {
		default: [{ id: "name", placeholder: "Name", value: "" }]
	});

	const file_tree = defineModel<PDFFile[]>("file_tree");

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

		search_pdf();
	}

	function add_pdf(file?: PDFFile, type?: "dir" | "file") {
		if (file !== undefined && type === "file") {
			emit("add", create_props(file));
		}
	}

	function create_props(file: PDFFile): PDFProps {
		return {
			type: "pdf",
			caption: file.name,
			color: "#00FFFF",
			file: file.path
		};
	}

	function search_pdf() {
		file_tree.value = search_string();
	}

	type SearchMapFile = PDFFile & { children?: SearchMapFile[]; search_data?: { name: string } };
	let search_map: SearchMapFile[] = [];
	function create_search_map(files: PDFFile[] | undefined = props.files): SearchMapFile[] {
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

	function search_string(files: SearchMapFile[] | undefined = search_map): PDFFile[] {
		const return_files: PDFFile[] = [];

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
		name="PDF"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_pdf"
		@search="search_pdf"
		@refresh_files="refresh_search_index"
	>
		<template v-slot:buttons>
			<MenuButton @click="add_pdf(selection, 'file')">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add PDF
			</MenuButton>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}
</style>

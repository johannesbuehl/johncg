<script setup lang="ts">
	import { ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import Globals from "@/Globals";

	import type { PDFFile } from "@server/search_part";
	import type { PDFProps } from "@server/PlaylistItems/PDF";

	library.add(fas.faPlus, fas.faRepeat);

	const emit = defineEmits<{
		add: [item_props: PDFProps];
	}>();

	const selection = defineModel<PDFFile>({});

	const search_strings = ref<SearchInputDefinitions<"name">>([
		{ id: "name", placeholder: "Name", value: "" }
	]);

	const file_tree = defineModel<PDFFile[]>("file_tree");

	type SearchMapFile = PDFFile & { search_data?: { name: string } };
	let search_map: SearchMapFile[] = [];
	watch(
		() => Globals.get_pdf_files(),
		() => {
			search_map = create_search_map(Globals.get_pdf_files());

			search_pdf();
		},
		{ immediate: true }
	);

	watch(search_strings.value, () => {
		search_pdf();
	});

	function add_pdf(file?: PDFFile) {
		if (file !== undefined && file.children === undefined) {
			emit("add", create_props(file));
		}
	}

	function create_props(file: PDFFile): PDFProps {
		return {
			type: "pdf",
			caption: file.name,
			color: Globals.color.pdf,
			file: file.path
		};
	}

	function search_pdf() {
		file_tree.value = search_string();
	}

	function create_search_map(files: PDFFile[]): SearchMapFile[] {
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

	function search_string(files: SearchMapFile[] | undefined = search_map): PDFFile[] {
		// if there are no search-strings, return the default files
		if (search_strings.value.every((search_string) => search_string.value === "")) {
			return Globals.get_pdf_files();
		}

		const return_files: PDFFile[] = [];

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
</script>

<template>
	<FileDialogue
		:files="file_tree"
		:clone_callback="(ff) => create_props(ff as PDFFile)"
		name="PDF"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_pdf"
		@refresh_files="() => Globals.get_template_files(true)"
	>
		<template v-slot:buttons>
			<MenuButton @click="add_pdf(selection)">
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

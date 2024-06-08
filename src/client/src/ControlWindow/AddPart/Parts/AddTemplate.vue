<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import JSONEditor from "@/ControlWindow/JSONEditor.vue";

	import type { TemplateProps } from "@server/PlaylistItems/Template";
	import type { TemplateFile } from "@server/search_part";

	library.add(fas.faPlus);
	const props = defineProps<{
		files: TemplateFile[];
	}>();

	const emit = defineEmits<{
		add: [item_props: TemplateProps];
		refresh: [];
	}>();

	const selection = defineModel<TemplateFile>("selection", {});
	const template_data = defineModel<object>("template_data", { default: {} });

	const search_strings = ref<SearchInputDefinitions<"name">>([
		{ id: "name", placeholder: "Name", value: "" }
	]);

	const file_tree = defineModel<TemplateFile[]>("file_tree");

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

		search_template();
	}

	watch(search_strings.value, () => {
		search_template();
	});

	function add_template(file?: TemplateFile) {
		if (file !== undefined && file.children === undefined) {
			emit("add", create_props(file));
		}
	}

	function create_props(file: TemplateFile): TemplateProps {
		return {
			type: "template",
			caption: file.name,
			color: "#FF0000",
			template: {
				template: file.path,
				data: Object.keys(template_data.value).length > 0 ? template_data.value : undefined
			}
		};
	}

	function search_template() {
		file_tree.value = search_string();
	}

	type SearchMapFile = TemplateFile & {
		search_data?: { name: string };
	};
	let search_map: SearchMapFile[] = [];
	function create_search_map(files: TemplateFile[] | undefined = props.files): SearchMapFile[] {
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

	function search_string(files: SearchMapFile[] | undefined = search_map): TemplateFile[] {
		// if there are no search-strings, return the default files
		if (search_strings.value.every((search_string) => search_string.value === "")) {
			return props.files;
		}

		const return_files: TemplateFile[] = [];

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
</script>

<template>
	<FileDialogue
		:files="file_tree"
		:clone_callback="(ff) => create_props(ff as TemplateFile)"
		name="Template"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_template"
		@refresh_files="refresh_search_index"
	>
		<template v-slot:buttons>
			<MenuButton @click="add_template(selection)">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Template
			</MenuButton>
		</template>
		<template v-slot:edit>
			<JSONEditor v-model="template_data" />
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}

	.data_editor {
		background-color: var(--color-container);

		display: flex;
		flex-direction: column;

		border-radius: 0.25rem;
	}
</style>

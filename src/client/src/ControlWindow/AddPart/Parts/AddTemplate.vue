<script setup lang="ts">
	import { ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import JSONEditor from "@/ControlWindow/JSONEditor.vue";
	import Globals from "@/Globals";

	import type { TemplateProps } from "@server/PlaylistItems/Template";
	import type { CasparFile, Node } from "@server/search_part";

	library.add(fas.faPlus);

	const emit = defineEmits<{
		add: [item_props: TemplateProps];
	}>();

	const selection = defineModel<Node<CasparFile>>("selection", {});
	const template_data = defineModel<object>("template_data", { default: {} });

	const search_strings = ref<SearchInputDefinitions<"name", CasparFile>>([
		{ id: "name", placeholder: "Name", value: "", get: (ff) => ff.name }
	]);

	function add_template(ff?: Node<CasparFile>) {
		if (ff !== undefined && !ff.is_dir) {
			emit("add", create_props(ff));
		}
	}

	function create_props(file: CasparFile): TemplateProps {
		return {
			type: "template",
			caption: file.name,
			color: Globals.color.template,
			template: {
				template: file.path,
				data: Object.keys(template_data.value).length > 0 ? template_data.value : undefined
			}
		};
	}
</script>

<template>
	<FileDialogue
		:files="Globals.get_template_files()"
		:clone_callback="(ff) => create_props(ff)"
		:item_color="Globals.color.template"
		name="Template"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_template"
		@refresh_files="() => Globals.get_template_files(true)"
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

<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type ChooseNode,
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import Globals from "@/Globals";

	import { NodeType, type PDFFile } from "@server/search_part_types";
	import type { PDFProps } from "@server/PlaylistItems/PDF";

	library.add(fas.faPlus, fas.faRepeat);

	const emit = defineEmits<{
		add: [item_props: PDFProps];
	}>();

	const selection = defineModel<PDFFile>({});

	const search_strings = ref<SearchInputDefinitions<"name", "pdf">>([
		{ id: "name", placeholder: "Name", value: "", get: (ff) => ff.name }
	]);

	function add_pdf(file?: ChooseNode<"pdf">) {
		if (file?.type === NodeType.File) {
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
</script>

<template>
	<FileDialogue
		:files="Globals.get_pdf_files()"
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

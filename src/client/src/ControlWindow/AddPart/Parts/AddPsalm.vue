<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import Globals from "@/Globals";

	import type { Node, PsalmFile } from "@server/search_part";
	import type { PsalmProps } from "@server/PlaylistItems/Psalm";

	library.add(fas.faPlus);

	const emit = defineEmits<{
		add: [item_props: PsalmProps];
		new_psalm: [];
	}>();

	const selection = ref<PsalmFile>();
	const search_strings = ref<SearchInputDefinitions<"id" | "caption", "psalm">>([
		{
			id: "id",
			placeholder: "Psalm ID",
			value: "",
			size: 5,
			get: (ff) => (!ff.is_dir ? (ff.data.metadata.id ?? "") : "")
		},
		{
			id: "caption",
			placeholder: "Title",
			value: "",
			get: (ff) => (!ff.is_dir ? ff.data.metadata.caption : "")
		}
	]);

	function add_psalm(file?: Node<"psalm">) {
		if (file !== undefined && !file.is_dir) {
			emit("add", create_props(file));
		}
	}

	function create_props(file: PsalmFile): PsalmProps {
		return {
			type: "psalm",
			caption: file.name,
			color: Globals.color.psalm,
			file: file.path
		};
	}
</script>

<template>
	<FileDialogue
		:files="Globals.get_psalm_files()"
		:clone_callback="(ff) => create_props(ff as PsalmFile)"
		:new_button="true"
		:item_color="Globals.color.psalm"
		name="Psalm"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_psalm"
		@refresh_files="() => Globals.get_psalm_files(true)"
		@new_file="emit('new_psalm')"
	>
		<template v-slot:buttons>
			<MenuButton @click="add_psalm(selection)">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Psalm
			</MenuButton>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}

	:deep(.search_input_container:first-child) {
		flex: none;
	}
</style>

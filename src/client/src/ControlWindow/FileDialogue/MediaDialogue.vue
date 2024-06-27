<script setup lang="ts">
	import { reactive, ref, watch } from "vue";

	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import Globals from "@/Globals";

	import type { MediaProps } from "@server/PlaylistItems/Media";
	import type { CasparFile, Directory, Node } from "@server/search_part";

	const props = defineProps<{
		hide_header?: boolean;
		create_props_callback?: (file: CasparFile) => MediaProps;
	}>();

	const emit = defineEmits<{
		choose: [file: CasparFile];
	}>();

	const selection = defineModel<CasparFile>("selection");

	const directory_stack = defineModel<Directory<CasparFile>[]>("directory_stack", {
		default: () => reactive([])
	});

	const search_strings = ref<SearchInputDefinitions<"name", CasparFile>>([
		{ id: "name", placeholder: "Name", value: "", get: (ff: Node<CasparFile>) => ff.name }
	]);

	watch(
		() => Globals.get_media_files(),
		() => {
			// if there are no fitting thumbnails , retrieve them also
			// if the directory-stack is populated, use it
			let files: Node<CasparFile>[];
			if (directory_stack.value.length > 0) {
				files = directory_stack.value.slice(-1)?.[0].children ?? [];
			} else {
				files = Globals.get_media_files();
			}

			Globals.get_thumbnails(files.filter((ff) => !ff.is_dir) as CasparFile[]);
		},
		{ immediate: true }
	);

	function get_media_thumbnails(files: Node<CasparFile>[] | undefined) {
		const request_files: CasparFile[] = (files ?? Globals.get_media_files()).filter(
			(ff) => !ff.is_dir
		) as CasparFile[];

		Globals.get_thumbnails(request_files);
	}
</script>

<template>
	<FileDialogue
		:files="Globals.get_media_files()"
		:thumbnails="Globals.get_thumbnails()"
		:clone_callback="
			create_props_callback !== undefined
				? (file) => create_props_callback!(file as CasparFile)
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
				if (file?.is_dir) {
					get_media_thumbnails(file.children);
				}

				$emit('choose', file as CasparFile);
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

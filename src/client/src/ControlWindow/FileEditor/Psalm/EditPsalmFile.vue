<script setup lang="ts">
	import { ref, watch } from "vue";

	import type { PsalmTextBlock } from "./PsalmEditor.vue";
	import PsalmEditor from "./PsalmEditor.vue";

	import type { PsalmFile } from "@server/search_part";
	import type { PsalmFile as PsalmData } from "@server/PlaylistItems/Psalm";

	const props = defineProps<{
		ws: WebSocket;
		psalm_files: PsalmFile[];
		psalm_file: PsalmFile;
	}>();

	const emit = defineEmits<{}>();

	const metadata = ref<PsalmData["metadata"]>();
	const psalm_text = ref<PsalmTextBlock[][]>([[]]);

	watch(
		() => props.psalm_file,
		() => {
			if (props.psalm_file.data !== undefined) {
				metadata.value = props.psalm_file.data.metadata;

				let indent_state: boolean = false;

				psalm_text.value = props.psalm_file.data.text.map((slide) => {
					const slide_blocks = slide.map((block) => {
						const block_object = { text: block.join("\n"), indent: indent_state };

						indent_state = !indent_state;

						return block_object;
					});

					// if the last block isn't empty, add an empty one
					if (slide_blocks[slide_blocks.length - 1].text !== "") {
						slide_blocks.push({ text: "", indent: indent_state });
					}

					// set the indentation for all blocks
					slide_blocks.forEach((block) => {
						block.indent = indent_state;

						// only flip the indentation, if the block isn't empty
						if (block.text !== "") {
							indent_state = !indent_state;
						}
					});

					return slide_blocks;
				});
			}
		},
		{ immediate: true }
	);
</script>

<template>
	<PsalmEditor
		:ws="ws"
		:psalm_files="psalm_files"
		:psalm_file_name="psalm_file?.path.replace(/\.psm$/, '')"
		v-model:metadata="metadata"
		v-model:psalm_text="psalm_text"
	/>
</template>

<style scoped></style>

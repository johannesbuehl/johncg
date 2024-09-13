<script setup lang="ts">
	import { ref, watch } from "vue";

	import SongEditor, { is_slide_empty, type SongTextPart } from "./SongEditor.vue";

	import type { SongFile } from "@server/search_part";
	import type { SongFileMetadata } from "@server/PlaylistItems/SongFile/SongFile";

	const props = defineProps<{
		song_file: SongFile;
	}>();

	const metadata = ref<SongFileMetadata>();
	const text_parts = ref<SongTextPart[]>([]);

	watch(
		() => props.song_file,
		() => {
			if (props.song_file.data?.metadata !== undefined) {
				metadata.value = props.song_file.data.metadata;

				// fill up the title-array
				metadata.value.Title = Array.apply(null, Array(4)).map((_, lang_index) => {
					return metadata.value?.Title[lang_index] ?? "";
				});

				text_parts.value = Object.entries(props.song_file.data.text).map(([part, text]) => {
					const part_text: SongTextPart["text"] = text.map((slide) => {
						return Array.apply(null, Array(4)).map((_, lang_index) => {
							const sl = slide
								.map(
									(line) =>
										line
											.filter((ll) => ll.lang === lang_index)
											.map((ll) => ll.text)
											.join("\n") ?? ""
								)
								.filter((line) => line !== undefined)
								.join("\n");

							return sl;
						});
					}) as SongTextPart["text"];

					// if the last slide is empty and it isn't the only one, append an empty one
					if (
						!is_slide_empty(part_text[part_text.length - 1], metadata.value?.LangCount ?? 1) &&
						part_text.length > 0
					) {
						part_text.push(["", "", "", ""]);
					}

					return {
						part,
						text: part_text
					};
				});
			}
		},
		{ immediate: true }
	);
</script>

<template>
	<SongEditor :song_file="song_file" v-model:metadata="metadata" v-model:text_parts="text_parts" />
</template>

<style scoped></style>

<script setup lang="ts">
	import { ref, watch } from "vue";

	import SongEditor, { is_slide_empty, type TextPart } from "./SongEditor.vue";

	import type { MediaFile, SongFile } from "@server/search_part";
	import type { SongFileMetadata } from "@server/PlaylistItems/SongFile/SongFile";

	const props = defineProps<{
		ws: WebSocket;
		song_files: SongFile[];
		media_files: MediaFile[];
		song_data: SongFile["data"];
	}>();

	const emit = defineEmits<{}>();

	const metadata = ref<SongFileMetadata>();
	const text_parts = ref<TextPart[]>([]);

	watch(
		() => props.song_data,
		() => {
			if (props.song_data !== undefined) {
				metadata.value = props.song_data.metadata;

				text_parts.value = Object.entries(props.song_data.text).map(([part, text]) => {
					const part_text: TextPart["text"] = text.map((slide) => {
						return Array.apply(null, Array(4)).map((_, lang_index) => {
							return slide
								.map((line) => {
									return line[lang_index] ?? "";
								})
								.join("\n");
						});
					}) as TextPart["text"];

					// if the last line is empty and it isn't the only one, append an empty one
					if (
						!is_slide_empty(part_text[part_text.length - 1], metadata.value?.LangCount ?? 1) &&
						part_text.length > 1
					) {
						part_text.push(["", "", "", ""]);
					}

					return {
						part,
						text: part_text
					};
				});
			}
		}
	);
</script>

<template>
	<SongEditor
		:ws="ws"
		:song_files="song_files"
		:media_files="media_files"
		:song_file_name="song_data?.path.replace(/\.sng$/, '')"
		v-model:metadata="metadata"
		v-model:text_parts="text_parts"
	/>
</template>

<style scoped></style>

<script setup lang="ts">
	import { nextTick, onMounted, ref, watch } from "vue";

	import SongPartSelector from "../AddPart/Parts/Song/SongPartSelector.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { SongProps } from "@server/PlaylistItems/Song";

	const props = defineProps<{
		ws: WebSocket;
		song_data?: JGCPSend.SongSearchResults;
	}>();

	const emit = defineEmits<{
		update: [];
	}>();

	const verse_order = ref<string[]>([]);
	const languages = ref<[number, boolean][]>([]);

	const song_props = defineModel<SongProps>("item_props", { required: true });

	let song_loaded = false;
	watch(
		() => props.song_data,
		(new_song_data) => {
			verse_order.value =
				song_props.value.verse_order ?? new_song_data?.result[0].parts.default ?? [];

			const default_languages: [number, boolean][] = Array(new_song_data?.result[0].title.length)
				.fill([])
				.map((ele, index) => [index, true]);

			if (song_props.value.languages !== undefined) {
				languages.value = song_props.value.languages.map((ele) => [ele, true]);

				languages.value.push(
					...default_languages
						.filter((ele) => !song_props.value.languages?.includes(ele[0]))
						.map((ele): [number, boolean] => [ele[0], false])
				);
			} else {
				languages.value = default_languages;
			}

			nextTick().then(() => {
				song_loaded = true;
			});
		}
	);

	// when something gets changed, fire an update
	watch(
		(): [string[], [number, boolean][]] => [verse_order.value, languages.value],
		([verse_order, languages]: [string[], [number, boolean][]]) => {
			if (song_loaded) {
				// store the new verse-order in the song-props
				song_props.value.verse_order = verse_order;
				song_props.value.languages = languages.filter((ele) => ele[1]).map((ele) => ele[0]);

				emit("update");
			}
		},
		{ deep: true }
	);

	// whenever the song changes, request the SongResults
	watch(() => song_props.value.file, request_song_data);

	onMounted(() => request_song_data(song_props.value.file));

	function request_song_data(file: string) {
		const message: JGCPRecv.GetItemData = {
			command: "get_item_data",
			type: "song",
			file: file
		};

		props.ws.send(JSON.stringify(message));
	}
</script>

<template>
	<div id="edit_song_wrapper">
		<SongPartSelector
			v-if="song_data !== undefined"
			v-model:selected_parts="verse_order"
			v-model:selected_languages="languages"
			:song_data="song_data.result[0]"
		/>
	</div>
</template>

<style scoped>
	#edit_song_wrapper {
		flex: 1;
		display: flex;

		gap: 0.25rem;

		border-radius: 0.25rem;
	}
</style>

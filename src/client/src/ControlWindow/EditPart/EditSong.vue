<script setup lang="ts">
	import { nextTick, onMounted, reactive, watch } from "vue";

	import PartSelector from "../AddPart/Parts/Song/PartSelector.vue";

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

	const state: { verse_order: string[] } = reactive({ verse_order: [] });
	const song_props = defineModel<SongProps>("song_props", { required: true });

	let song_loaded = false;
	watch(
		() => props.song_data,
		(new_song_data) => {
			state.verse_order =
				song_props.value.verse_order ?? new_song_data?.result[0].parts.default ?? [];

			nextTick().then(() => {
				song_loaded = true;
			});
		}
	);

	// when the selected parts change, fire an update-event
	watch(
		() => state.verse_order,
		(new_verse_order) => {
			if (song_loaded) {
				// store the new verse-order in the song-props
				song_props.value.verse_order = new_verse_order;

				emit("update");
			}
		}
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
		<PartSelector
			v-if="song_data !== undefined"
			:song_data="song_data.result[0]"
			v-model:selected_parts="state.verse_order"
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

<script setup lang="ts">
	import { onMounted, onUnmounted, ref, toRaw, watch } from "vue";

	import SongPartSelector from "../ItemDialogue/SongPartSelector.vue";

	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ClientSongItem, SongProps } from "@server/PlaylistItems/Song";
	import type { SongFile } from "@server/search_part";

	const props = defineProps<{
		ws: WebSocket;
		song_file: SongFile[] | undefined;
		item_index: number;
	}>();

	const verse_order = ref<string[]>([]);
	const languages = ref<[number, boolean][]>([]);

	const song_props = defineModel<ClientSongItem>("item_props", { required: true });

	watch(
		() => props.song_file,
		(new_song_data) => {
			if (new_song_data !== undefined) {
				verse_order.value =
					song_props.value.verse_order ?? new_song_data[0].data?.parts.default ?? [];

				const default_languages: [number, boolean][] = Array(new_song_data[0].data?.title?.length)
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
			}
		}
	);

	onUnmounted(() => {
		update();
	});

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

	function update() {
		const return_props = create_props();

		if (return_props !== undefined) {
			const message: JGCPRecv.UpdateItem = {
				command: "update_item",
				index: props.item_index,
				props: return_props
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	function create_props(): ClientSongItem | undefined {
		if (
			props.song_file !== undefined &&
			props.song_file.length > 0 &&
			props.song_file[0].data !== undefined
		) {
			const return_props = structuredClone(toRaw(song_props.value));

			const default_parts = props.song_file[0].data.parts.default;
			if (
				default_parts.length !== verse_order.value.length ||
				!verse_order.value.every((verse, index) => {
					return verse === default_parts[index];
				})
			) {
				return_props.verse_order = verse_order.value;
			} else {
				return_props.verse_order = undefined;
			}

			if (
				languages.value.some((val, index) => {
					return val[0] !== index || val[1] === false;
				})
			) {
				return_props.languages = languages.value
					.filter(([number, active]) => active)
					.map(([number, active]) => number);
			} else {
				return_props.languages = undefined;
			}

			return return_props;
		}
	}
</script>

<template>
	<div id="edit_song_wrapper">
		<SongPartSelector
			v-if="song_file !== undefined"
			v-model:selected_parts="verse_order"
			v-model:selected_languages="languages"
			:song_file="song_file[0]"
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

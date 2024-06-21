<script setup lang="ts">
	import { onMounted, onUnmounted, ref, toRaw, watch } from "vue";

	import SongPartSelector from "../ItemDialogue/SongPartSelector.vue";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ClientSongItem } from "@server/PlaylistItems/Song";
	import type { SongData } from "@server/PlaylistItems/SongFile/SongFile";
	import Globals from "@/Globals";

	const props = defineProps<{
		song_data: SongData | undefined;
		item_index: number;
	}>();

	const verse_order = ref<string[]>([]);
	const languages = ref<[number, boolean][]>([]);

	const song_props = defineModel<ClientSongItem>("item_props", { required: true });

	watch(
		() => props.song_data,
		(song_data) => {
			if (song_data !== undefined) {
				console.debug(song_props.value);
				console.debug(song_data.metadata.VerseOrder);

				verse_order.value = song_props.value.verse_order ?? song_data.metadata.VerseOrder ?? [];

				const default_languages: [number, boolean][] = Array(song_data.metadata.Title?.length)
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
		Globals.ws?.send<JCGPRecv.GetItemData>({
			command: "get_item_data",
			type: "song",
			file: file
		});
	}

	function update() {
		const return_props = create_props();

		if (return_props !== undefined) {
			Globals.ws?.send<JCGPRecv.UpdateItem>({
				command: "update_item",
				index: props.item_index,
				props: return_props
			});
		}
	}

	function create_props(): ClientSongItem | undefined {
		const return_props = structuredClone(toRaw(song_props.value));

		const default_parts = Object.keys(props.song_data?.text || {});
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
</script>

<template>
	<div id="edit_song_wrapper">
		<SongPartSelector
			v-if="song_data !== undefined"
			v-model:selected_parts="verse_order"
			v-model:selected_languages="languages"
			:song_data="song_data"
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

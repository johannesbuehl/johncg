<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import Draggable from "vuedraggable";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import MediaItem from "../MediaItem.vue";
	import SongPartSelector from "./SongPartSelector.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { SongProps } from "@server/PlaylistItems/Song";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type { SongData } from "@server/search_part";

	library.add(fas.faAdd, fas.faTrash, fas.faArrowsRotate, fas.faPlus);

	const props = defineProps<{
		ws: WebSocket;
		search_results?: JGCPSend.SearchResults;
	}>();

	const emit = defineEmits<{
		add: [song_props: SongProps];
		update: [];
	}>();

	// song-id-input-element used for focusing on mounting
	const input_song_id = ref<HTMLInputElement>();

	// currently selected song
	const song_selection = ref<SongData>();
	const verse_order = ref<string[]>([]);
	const languages = ref<[number, boolean][]>([]);

	// props of the the song
	const item_props = defineModel<SongProps>("item_props", {
		default: {
			type: "song",
			caption: "",
			color: "#0000ff",
			file: ""
		}
	});

	// data in the search-boxes
	const title = defineModel<string>("title", { default: "" });
	const id = defineModel<string>("id", { default: "" });
	const text = defineModel<string>("text", { default: "" });

	defineExpose({
		edit: edit_item
	});

	watch(
		() => props.search_results?.result,
		(new_search_result) => {
			if (new_search_result !== undefined) {
				set_selection(new_search_result[0]);
			}
		}
	);

	onMounted(() => {
		input_song_id.value?.focus();
	});

	let input_debounce_timeout_id: NodeJS.Timeout | undefined = undefined;
	function search_string(debounce_time: number = 500) {
		clearTimeout(input_debounce_timeout_id);

		input_debounce_timeout_id = setTimeout(() => {
			const message: JGCPRecv.SearchItem = {
				command: "search_item",
				type: "song",
				search: {
					title: title.value.toLowerCase(),
					id: id.value.toLowerCase(),
					text: text.value.toLowerCase()
				}
			};

			props.ws.send(JSON.stringify(message));
		}, debounce_time);
	}

	function renew_search_index() {
		const message: JGCPRecv.RenewSearchIndex = {
			command: "renew_search_index",
			type: "song"
		};

		props.ws.send(JSON.stringify(message));
	}

	function add_song() {
		if (song_selection.value?.file !== undefined && item_props.value !== undefined) {
			// if the selected parts differ from the default ones, save them in the playlist
			if (
				!song_selection.value.parts.default.every((val, index) => val === verse_order.value[index])
			) {
				item_props.value.verse_order = verse_order.value;
			}

			// if not all languages are checked or the order isn't default, add it to the props
			if (!languages.value.every(([lang, state], index) => lang === index && state)) {
				item_props.value.languages = languages.value.filter((ele) => ele[1]).map((ele) => ele[0]);
			} else {
				// delete them from the props
				delete item_props.value.languages;
			}

			emit("add", item_props.value);
		}
	}

	function set_selection(song?: SongData) {
		if (song !== undefined) {
			song_selection.value = song;

			item_props.value = {
				type: "song",
				caption: song.title ? song.title[0] : "Song title missing",
				color: "#0000ff",
				file: song.file
			};

			verse_order.value = structuredClone(song.parts.default);
			languages.value = Array(song_selection.value.title.length)
				.fill([])
				.map((ele, index) => [index, true]);
		} else {
			verse_order.value = [];
			languages.value = [];
			song_selection.value = undefined;
		}
	}

	function on_clone(song: SongData): SongProps {
		return {
			type: "song",
			caption: (song.title ?? [""])[0],
			color: "#0000ff",
			file: song.file
		};
	}

	function edit_item(edit_props: ItemProps) {
		if (edit_props.type === "song") {
			item_props.value = edit_props;
		}
	}

	// init
	renew_search_index();
	search_string(0);
</script>

<template>
	<div class="add_song_wrapper">
		<div class="search_wrapper">
			<div class="search_input_wrapper">
				<input
					v-model="id"
					ref="input_song_id"
					placeholder="Song ID"
					class="search_box"
					@input="search_string()"
					@keyup.enter="add_song"
				/>
				<input
					v-model="title"
					placeholder="Title"
					class="search_box"
					@input="search_string()"
					@keyup.enter="add_song"
				/>
				<input
					v-model="text"
					placeholder="Text"
					class="search_box"
					@input="search_string()"
					@keyup.enter="add_song"
				/>
			</div>
			<MenuButton icon="arrows-rotate" @click="renew_search_index" />
		</div>
		<div class="results_wrapper">
			<div id="song_results">
				<div class="header">Songs</div>
				<Draggable
					class="results_list"
					:list="search_results?.result"
					:group="{ name: 'playlist', pull: 'clone', put: 'false' }"
					item-key="file"
					:clone="on_clone"
					:sort="false"
				>
					<template #item="{ element, index }">
						<MediaItem
							:song_result="element"
							:active="element.file === song_selection?.file"
							v-model="song_selection"
							:id="`${element.file}_${index}`"
							@set_selection="set_selection(element)"
							@add_song="add_song"
						/>
					</template>
				</Draggable>
				<MenuButton icon="plus" text="Add Song" @click="add_song" />
			</div>
			<SongPartSelector
				v-model:selected_parts="verse_order"
				v-model:selected_languages="languages"
				:song_data="song_selection"
			/>
		</div>
	</div>
</template>

<style scoped>
	.add_song_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: inherit;
	}

	.search_wrapper {
		display: flex;
		padding: 1rem;

		border-radius: 0.25rem;

		column-gap: 1rem;

		background-color: var(--color-container);
	}

	.search_input_wrapper {
		flex: 1;

		column-gap: inherit;
		display: grid;
		grid-template-columns: 2fr 3fr 4fr;
	}

	.search_box {
		font-size: 1.5rem;

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);
	}

	.search_box:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	.search_box::placeholder {
		color: var(--color-text-disabled);
	}

	.search_box:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	.results_wrapper {
		flex: 1;

		display: flex;

		gap: inherit;
	}

	.header {
		text-align: center;

		background-color: var(--color-item);

		border-radius: 0.25rem;

		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
		padding-left: 0.75rem;
	}

	.results_list {
		overflow: auto;

		flex: 1;

		display: flex;
		flex-direction: column;

		gap: inherit;

		padding: 0.25rem;
		padding-top: 0;
	}

	#song_results {
		flex: 1;
		display: flex;
		flex-direction: column;

		border-radius: 0.25rem;

		background-color: var(--color-container);

		gap: inherit;
	}

	#result_text_wrapper {
		display: flex;
		flex-direction: column;
	}

	#result_text {
		display: flex;
		flex-direction: column;
		flex: 1;

		row-gap: 0.5rem;

		padding: 1rem;

		overflow: auto;
	}

	.song_part {
		overflow: visible;
	}

	.song_slides_wrapper {
		display: flex;
		flex-direction: column;

		gap: 1rem;
	}

	.song_language_line {
		font-weight: lighter;
	}

	.song_language_line:not(:first-child) {
		color: var(--color-text-disabled);
		font-style: italic;
	}
</style>

<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import Draggable from "vuedraggable";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { SongResult } from "@server/search_part";
	import type { SongProps } from "@server/PlaylistItems/Song";
	import MediaItem from "./MediaItem.vue";

	library.add(fas.faArrowsRotate, fas.faPlus);

	const props = defineProps<{
		ws: WebSocket;
		search_results?: JGCPSend.SearchResults;
	}>();

	const input_song_title = ref<HTMLInputElement>();
	const selection = ref<SongResult>();

	const title = defineModel<string>("title", { default: "" });
	const id = defineModel<string>("id", { default: "" });
	const text = defineModel<string>("text", { default: "" });

	watch(
		() => props.search_results?.result,
		(new_search_result) => {
			if (new_search_result !== undefined) {
				selection.value = new_search_result[0];
			}
		}
	);

	onMounted(() => {
		input_song_title.value?.focus();
	});

	let input_debounce_timeout_id: NodeJS.Timeout | undefined = undefined;
	function search_string(event?: Event, debounce_time: number = 500) {
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
		if (selection.value?.path !== undefined) {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "song",
					caption: (selection.value?.title ?? [])[0] ?? "[song-title missing]",
					color: "#0000ff",
					file: selection.value?.path,
					languages: [0]
				}
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	function set_selection(song: SongResult) {
		selection.value = song;
	}

	function on_clone(song: SongResult): SongProps {
		return {
			type: "song",
			caption: (song.title ?? [""])[0],
			color: "#0000ff",
			file: song.path
		};
	}

	// init
	renew_search_index();
	search_string(undefined, 0);
</script>

<template>
	<div class="add_song_wrapper">
		<div class="search_wrapper">
			<div class="search_input_wrapper">
				<input
					v-model="title"
					ref="input_song_title"
					placeholder="Title"
					class="search_box"
					@input="search_string"
					@keyup.enter="add_song"
				/>
				<input
					v-model="id"
					placeholder="Song ID"
					class="search_box"
					@input="search_string"
					@keyup.enter="add_song"
				/>
				<input
					v-model="text"
					placeholder="Text"
					class="search_box"
					@input="search_string"
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
					item-key="path"
					:clone="on_clone"
					:sort="false"
				>
					<template #item="{ element, index }">
						<MediaItem
							:song_result="element"
							:active="element.path === selection?.path"
							v-model="selection"
							:id="`${element.path}_${index}`"
							@set_selection="set_selection(element)"
							@add_song="add_song"
						/>
					</template>
				</Draggable>
				<MenuButton icon="plus" text="" @click="add_song" />
			</div>
			<div id="result_text_wrapper">
				<div class="header">Text</div>
				<div id="result_text">
					<div class="song_part" v-for="text in selection?.text?.split('\n\n')">
						<p v-for="line in text.split('\n')">
							{{ line }}
						</p>
					</div>
				</div>
			</div>
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
		grid-template-columns: 3fr 1fr 4fr;
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
		display: flex;
		flex: 1;

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
		width: 50%;

		display: flex;
		flex-direction: column;

		background-color: var(--color-container);

		border-radius: 0.25rem;

		gap: inherit;
	}

	#result_text_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		background-color: var(--color-container);

		border-radius: 0.25rem;
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

	.song_part > p {
		font-weight: lighter;
	}
</style>

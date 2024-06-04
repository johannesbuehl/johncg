<script setup lang="ts">
	import { ControlWindowState } from "@/Enums";
	import { stop_event, type ItemData } from "@/App.vue";
	import PlaylistItemsList from "./Playlist/PlaylistItemsList.vue";
	import SlidesView from "./SlidesView/SlidesView.vue";
	import MenuBar from "./MenuBar/MenuBar.vue";
	import AddPart from "./AddPart/AddPart.vue";
	import EditPart from "./EditPart/EditPart.vue";
	import OpenPlaylist from "./OpenPlaylist.vue";
	import MessagePopup, { type LogMessage } from "./Message/MessagePopup.vue";
	import MessageView from "./Message/MessageView.vue";
	import SavePlaylist from "./SavePlaylist.vue";
	import SongEditor from "./FileEditor/Song/SongEditor.vue";
	import EditSongFile from "./FileEditor/Song/EditSongFile.vue";
	import PsalmEditor from "./FileEditor/Psalm/PsalmEditor.vue";
	import EditPsalmFile from "./FileEditor/Psalm/EditPsalmFile.vue";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ActiveItemSlide } from "@server/Playlist";
	import type { BibleFile } from "@server/PlaylistItems/Bible";
	import type { ItemFileMapped, ItemFileType } from "@server/search_part";

	const props = defineProps<{
		ws: WebSocket;
		client_id: string;
		server_state: JGCPSend.State;
		playlist?: JGCPSend.Playlist;
		slides?: JGCPSend.ItemSlides;
		active_item_slide?: ActiveItemSlide;
		files: { [key in keyof ItemFileType]: ItemFileMapped<key>[] };
		bible_file?: BibleFile;
		selected: number | null;
		playlist_caption: string;
		messages: LogMessage[];
		item_data: ItemData;
		media_thumbnails: Record<string, string>;
	}>();

	const emit = defineEmits<{
		select_item: [item: number];
		select_slide: [item: number, slide: number];
	}>();

	const control_window_state = defineModel<ControlWindowState>("control_window_state", {
		required: true
	});
	const log_level = defineModel<Record<JGCPSend.LogLevel, boolean>>("log_level", {
		required: true
	});

	document.addEventListener("keydown", (event) => {
		// exit on composing
		if (event.isComposing) {
			return;
		}

		let prevent_default = false;

		// execute the navigation-keys only if the slides are visible
		if (control_window_state.value === ControlWindowState.Slides && !event.repeat) {
			prevent_default = true;

			switch (event.code) {
				case "PageUp":
				case "ArrowLeft":
					navigate("slide", -1);
					break;
				case "PageDown":
				case "ArrowRight":
					navigate("slide", 1);
					break;
				case "KeyB":
					if (props.server_state.visibility !== undefined) {
						visibility(!props.server_state.visibility);
					}
					break;
				default:
					prevent_default = false;
					break;
			}
		}

		if (prevent_default) {
			stop_event(event);
		}
	});

	// send navigate-request over teh websocket
	function navigate(type: JGCPRecv.NavigateType, steps: number) {
		const message: JGCPRecv.Navigate = {
			command: "navigate",
			type,
			steps,
			client_id: props.client_id
		};

		props.ws.send(JSON.stringify(message));
	}

	// send visibility changes over the websocket
	function visibility(state: boolean) {
		const message: JGCPRecv.SetVisibility = {
			command: "set_visibility",
			visibility: state,
			client_id: props.client_id
		};

		props.ws.send(JSON.stringify(message));
	}

	function dragged(from: number, to: number) {
		const message: JGCPRecv.MovePlaylistItem = {
			command: "move_playlist_item",
			from,
			to,
			client_id: props.client_id
		};

		props.ws.send(JSON.stringify(message));
	}

	function edit_item(index: number) {
		control_window_state.value = ControlWindowState.Edit;
		emit("select_item", index);
	}
</script>

<template>
	<MenuBar
		:ws="ws"
		:visibility="server_state?.visibility ?? false"
		v-model:control_window_state="control_window_state"
		:playlist_caption="playlist_caption"
		:playlist_path="playlist?.path"
		@navigate="navigate"
		@set_visibility="visibility"
	/>
	<div id="main_view">
		<OpenPlaylist
			v-if="control_window_state === ControlWindowState.OpenPlaylist"
			:files="files.playlist"
			:ws="ws"
			v-model:control_window_state="control_window_state"
		/>
		<SavePlaylist
			v-if="control_window_state === ControlWindowState.SavePlaylist"
			:files="files.playlist"
			:ws="ws"
			:file_name="playlist_caption"
			v-model:control_window_state="control_window_state"
		/>
		<PlaylistItemsList
			v-if="
				control_window_state === ControlWindowState.Slides ||
				control_window_state === ControlWindowState.Add ||
				control_window_state === ControlWindowState.Edit
			"
			:playlist="playlist"
			:selected="selected"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			:ws="ws"
			@selection="emit('select_item', $event)"
			@dragged="dragged"
			@set_active="emit('select_slide', $event, 0)"
			@edit="edit_item"
		/>
		<SlidesView
			v-if="typeof slides?.item === 'number' && control_window_state === ControlWindowState.Slides"
			:slides="slides"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			@select_slide="
				slides?.item !== undefined ? emit('select_slide', slides.item, $event) : undefined
			"
		/>
		<AddPart
			v-else-if="control_window_state === ControlWindowState.Add"
			:ws="ws"
			:files="files"
			:bible="bible_file"
			:mode="control_window_state"
			:media_thumbnails="media_thumbnails"
			v-model:control_window_state="control_window_state"
		/>
		<EditPart
			v-else-if="control_window_state === ControlWindowState.Edit"
			:item_props="typeof selected === 'number' ? playlist?.playlist_items[selected] : undefined"
			:ws="ws"
			:item_index="selected"
			:bible="bible_file"
			:files="files"
			:item_data="item_data"
			v-model:control_window_state="control_window_state"
		/>
		<SongEditor
			v-else-if="control_window_state === ControlWindowState.NewSong"
			:ws="ws"
			:song_files="files.song"
			:media_files="files.media"
			:thumbnails="media_thumbnails"
		/>
		<PsalmEditor
			v-else-if="control_window_state === ControlWindowState.NewPsalm"
			:ws="ws"
			:psalm_files="files.psalm"
		/>
		<EditSongFile
			v-else-if="
				control_window_state === ControlWindowState.EditSong && item_data.song !== undefined
			"
			:ws="ws"
			:song_files="files.song"
			:song_file="item_data.song"
			:media_files="files.media"
			:thumbnails="media_thumbnails"
		/>
		<EditPsalmFile
			v-else-if="
				control_window_state === ControlWindowState.EditPsalm && item_data.psalm !== undefined
			"
			:ws="ws"
			:psalm_files="files.psalm"
			:psalm_file="item_data.psalm"
		/>
		<MessageView
			v-else-if="control_window_state === ControlWindowState.Message"
			:messages="messages"
			v-model:log_level="log_level"
		/>
		<MessagePopup
			v-if="control_window_state !== ControlWindowState.Message"
			:messages="messages"
			:log_level="log_level"
		/>
	</div>
</template>

<style scoped>
	#main_view {
		display: flex;
		flex: 1;

		column-gap: 0.25rem;
	}
</style>

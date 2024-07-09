<script setup lang="ts">
	import { ControlWindowState } from "@/Enums";
	import { stop_event, type ItemData } from "@/App.vue";
	import PlaylistItemsList from "./Playlist/PlaylistItemsList.vue";
	import SlidesView from "./SlidesView/SlidesView.vue";
	import MenuBar from "./MenuBar/MenuBar.vue";
	import AddPart from "./AddPart/AddPart.vue";
	import EditPart from "./EditPart/EditPart.vue";
	import OpenPlaylist from "./OpenPlaylist.vue";
	import MessagePopup from "./Message/MessagePopup.vue";
	import MessageView from "./Message/MessageView.vue";
	import SavePlaylist from "./SavePlaylist.vue";
	import SongEditor from "./FileEditor/Song/SongEditor.vue";
	import EditSongFile from "./FileEditor/Song/EditSongFile.vue";
	import PsalmEditor from "./FileEditor/Psalm/PsalmEditor.vue";
	import EditPsalmFile from "./FileEditor/Psalm/EditPsalmFile.vue";
	import Globals, { ServerConnection } from "@/Globals";

	import type * as JCGPSend from "@server/JCGPSendMessages";
	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ActiveItemSlide } from "@server/Playlist";

	const props = defineProps<{
		client_id: string;
		server_state: JCGPSend.State;
		playlist?: JCGPSend.Playlist;
		slides?: JCGPSend.ItemSlides;
		active_item_slide?: ActiveItemSlide;
		selected: number | null;
		playlist_caption: string;
		item_data: ItemData;
	}>();

	const emit = defineEmits<{
		select_item: [item: number];
		select_slide: [item: number, slide: number];
	}>();

	document.addEventListener("keydown", (event) => {
		// exit on composing
		if (event.isComposing) {
			return;
		}

		let prevent_default = false;

		// execute the navigation-keys only if the slides are visible
		if (Globals.ControlWindowState === ControlWindowState.Slides && !event.repeat) {
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

			if (prevent_default) {
				stop_event(event);
			}
		}
	});

	// send navigate-request over teh websocket
	function navigate(type: JCGPRecv.NavigateType, steps: number) {
		Globals.ws?.send<JCGPRecv.Navigate>({
			command: "navigate",
			type,
			steps,
			client_id: props.client_id
		});
	}

	// send visibility changes over the websocket
	function visibility(state: boolean) {
		Globals.ws?.send<JCGPRecv.SetVisibility>({
			command: "set_visibility",
			visibility: state,
			client_id: props.client_id
		});
	}

	function dragged(from: number, to: number) {
		Globals.ws?.send<JCGPRecv.MovePlaylistItem>({
			command: "move_playlist_item",
			from,
			to,
			client_id: props.client_id
		});
	}

	function edit_item(index: number) {
		Globals.ControlWindowState = ControlWindowState.Edit;
		emit("select_item", index);
	}
</script>

<template>
	<MenuBar
		:visibility="server_state?.visibility ?? false"
		:playlist_caption="playlist_caption"
		:playlist_path="playlist?.path"
		@navigate="navigate"
		@set_visibility="visibility"
	/>
	<div id="main_view">
		<template v-if="Globals.server_connection.value === ServerConnection.Connected">
			<OpenPlaylist v-if="Globals.ControlWindowState === ControlWindowState.OpenPlaylist" />
			<SavePlaylist
				v-if="Globals.ControlWindowState === ControlWindowState.SavePlaylist"
				:playlist_file_name="playlist_caption"
			/>
			<PlaylistItemsList
				v-if="
					playlist !== undefined &&
					(Globals.ControlWindowState === ControlWindowState.Slides ||
						Globals.ControlWindowState === ControlWindowState.Add ||
						Globals.ControlWindowState === ControlWindowState.Edit)
				"
				:playlist="playlist"
				:selected="selected"
				:active_item_slide="active_item_slide"
				:scroll="client_id === server_state.client_id"
				@selection="emit('select_item', $event)"
				@dragged="dragged"
				@set_active="emit('select_slide', $event, 0)"
				@edit="edit_item"
			/>
			<SlidesView
				v-if="
					typeof slides?.item === 'number' &&
					Globals.ControlWindowState === ControlWindowState.Slides
				"
				:slides="slides"
				:active_item_slide="active_item_slide"
				:scroll="client_id === server_state.client_id"
				@select_slide="
					slides?.item !== undefined ? emit('select_slide', slides.item, $event) : undefined
				"
			/>
			<AddPart v-else-if="Globals.ControlWindowState === ControlWindowState.Add" />
			<EditPart
				v-else-if="Globals.ControlWindowState === ControlWindowState.Edit"
				:item_props="typeof selected === 'number' ? playlist?.playlist_items[selected] : undefined"
				:item_index="selected"
				:item_data="item_data"
			/>
			<SongEditor v-else-if="Globals.ControlWindowState === ControlWindowState.NewSong" />
			<PsalmEditor v-else-if="Globals.ControlWindowState === ControlWindowState.NewPsalm" />
			<EditSongFile
				v-else-if="
					Globals.ControlWindowState === ControlWindowState.EditSong && item_data.song !== undefined
				"
				:song_file="item_data.song"
			/>
			<EditPsalmFile
				v-else-if="
					Globals.ControlWindowState === ControlWindowState.EditPsalm &&
					item_data.psalm !== undefined
				"
				:psalm_file="item_data.psalm"
			/>
		</template>
		<MessageView v-if="Globals.ControlWindowState === ControlWindowState.Message" />
		<MessagePopup v-if="Globals.ControlWindowState !== ControlWindowState.Message" />
	</div>
</template>

<style scoped>
	#main_view {
		display: flex;
		flex: 1;

		column-gap: 0.25rem;
	}
</style>

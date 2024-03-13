<script setup lang="ts">
	import PlaylistItemsList from "./Playlist/PlaylistItemsList.vue";
	import SlidesView from "./SlidesView/SlidesView.vue";
	import MenuBar from "./MenuBar/MenuBar.vue";
	import { ControlWindowState } from "./ControlWindowState";
	import AddPart from "./AddPart/AddPart.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ActiveItemSlide } from "@server/Playlist";

	const props = defineProps<{
		ws: WebSocket;
		client_id: string;
		server_state: JGCPSend.State;
		playlist?: JGCPSend.Playlist;
		slides?: JGCPSend.ItemSlides;
		active_item_slide?: ActiveItemSlide;
		search_results?: JGCPSend.SearchResults;
	}>();

	defineEmits<{
		select_item: [item: number];
		select_slide: [item: number, slide: number];
	}>();

	const control_window_state = defineModel<ControlWindowState>("control_window_state", {
		required: false,
		default: ControlWindowState.Add
	});
	const selected = defineModel<number>("selected", { required: true });

	document.addEventListener("keydown", (event) => {
		// exit on composing
		if (event.isComposing || event.keyCode === 229) {
			return;
		}

		let prevent_default = false;

		// execute the navigation-keys only if the slides are visible
		if (control_window_state.value === ControlWindowState.Playlist && !event.repeat) {
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
				default:
					prevent_default = false;
					break;
			}
		}

		if (prevent_default) {
			event.preventDefault();
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

	function delete_item(item: number) {
		const message: JGCPRecv.DeleteItem = {
			command: "delete_item",
			position: item
		};

		props.ws.send(JSON.stringify(message));
	}
</script>

<template>
	<MenuBar
		class="menu_bar"
		:ws="ws"
		:visibility="server_state?.visibility ?? false"
		v-model="control_window_state"
		@navigate="navigate"
		@set_visibility="visibility"
	/>
	<div
		id="MenuBar_wrapper"
		v-if="
			control_window_state === ControlWindowState.Playlist ||
			control_window_state === ControlWindowState.Add
		"
	>
		<PlaylistItemsList
			:playlist="playlist"
			:selected="selected"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			@selection="$emit('select_item', $event)"
			@dragged="dragged"
			@set_active="$emit('select_slide', $event, 0)"
			@delete="delete_item"
		/>
		<SlidesView
			v-if="slides !== undefined && control_window_state === ControlWindowState.Playlist"
			:slides="slides"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			@select_slide="$emit('select_slide', slides.item, $event)"
		/>
		<AddPart
			v-if="control_window_state === ControlWindowState.Add"
			:ws="ws"
			:search_results="search_results"
		/>
	</div>
</template>

<style scoped>
	#MenuBar_wrapper {
		display: flex;
		flex: 1;

		column-gap: 0.25rem;
	}
</style>

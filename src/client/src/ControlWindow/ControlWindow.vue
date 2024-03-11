<script setup lang="ts">
import PlaylistItemsList, { type DragEndEvent } from "@/components/PlaylistItemsList.vue";
import SlidesView from "@/components/SlidesView.vue";
import MenuBar from "@/components/MenuBar.vue";

import * as JGCPSend from "../../../server/JGCPSendMessages";
import * as JGCPRecv from "../../../server/JGCPReceiveMessages";
import type { ActiveItemSlide } from "../../../server/Playlist";

const props = defineProps<{
	ws: WebSocket;
	client_id: string;
	server_state: JGCPSend.State;
	playlist?: JGCPSend.Playlist;
	slides?: JGCPSend.ItemSlides;
	active_item_slide?: ActiveItemSlide;
	selected: number;
}>();

defineEmits<{
	select_item: [item: number];
	select_slide: [slide: number];
}>();

document.addEventListener("keydown", (event) => {
	// exit on composing
	if (event.isComposing || event.keyCode === 229) {
		return;
	}

	if (!event.repeat) {
		switch (event.code) {
			case "PageUp":
			case "ArrowLeft":
				navigate("slide", -1);
				break;
			case "PageDown":
			case "ArrowRight":
				navigate("slide", 1);
				break;
			case "ArrowUp":
				navigate("item", -1);
				break;
			case "ArrowDown":
				navigate("item", 1);
				break;
			default:
				console.debug(event.code);
				break;
		}
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
		command: "move_sequence_item",
		from,
		to,
		client_id: props.client_id
	};

	props.ws.send(JSON.stringify(message));
}
</script>

<template>
	<MenuBar
		class="menu_bar"
		:ws="ws"
		@navigate="navigate"
		@set_visibility="visibility"
		:visibility="server_state?.visibility ?? false"
	/>
	<div id="MenuBar_wrapper">
		<PlaylistItemsList
			v-if="playlist !== undefined"
			:playlist="playlist"
			:selected="selected"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			@selection="$emit('select_item', $event)"
			@dragged="dragged"
		/>
		<SlidesView
			v-if="slides !== undefined"
			:slides="slides"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			@select_slide="$emit('select_slide', $event)"
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

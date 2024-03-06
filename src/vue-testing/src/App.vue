<script setup lang="ts">
/**
 * MISSING
 * sortableJS
 * auto-reconnect
 * error-log
 */
import { ref, watch } from "vue";
import ControlWindow from './ControlWindow/ControlWindow.vue';

import * as JGCPSend from "../../server/JGCPSendMessages";
import * as JGCPRecv from "../../server/JGCPReceiveMessages";

const ws = new WebSocket("ws://127.0.0.1:8765", "JGCP");

const server_state = ref<JGCPSend.State>({ command: "state" });
const sequence_items = ref<JGCPSend.Sequence>();
const item_slides = ref<JGCPSend.ItemSlides>();
const selected_item = ref<number>(-1);

watch(selected_item, (new_selection) => {
	const message: JGCPRecv.RequestItemSlides = {
		command: "request_item_slides",
		item: new_selection ?? -1,
		client_id
	};
	
	ws.send(JSON.stringify(message));
});

function select_item(item: number) {
	if (sequence_items.value?.sequence_items[item].selectable) {
		selected_item.value = item;
	}
}

ws.addEventListener("message", (event: MessageEvent) => {
	let data: JGCPSend.Message;

	try {
		data = JSON.parse(event.data as string);
	} catch (e) {
		if (e instanceof SyntaxError) {
			console.error("received invalid JSON");
			return;
		} else {
			throw e;
		}
	}

	const command_parser_map = {
		sequence_items: load_sequence_items,
		state: parse_state,
		item_slides: load_item_slides,
		response: handle_ws_response
	};

	command_parser_map[data.command ?? ""](data as never);
});

function load_sequence_items(data: JGCPSend.Sequence) {
	// if (if data.metada)

	sequence_items.value = data;
}

function parse_state(data: JGCPSend.State) {
	if (typeof data.active_item_slide === "object") {
		if ((typeof data.active_item_slide?.item ?? 0) !== "number"
			|| (typeof data.active_item_slide?.slide ?? 0) !== "number"
		) {
			throw new TypeError("'active_item_slide' is not of type '{item: number; slide: number}'");
		}
	}

	if (typeof (data.visibility ?? false) !== "boolean") {
		throw new TypeError("'visibility' is not of type 'boolean'");
	}
	
	// if the client_id is ours, set the selected to the active
	if (data.active_item_slide !== undefined && data.client_id === client_id) {
		selected_item.value = data.active_item_slide?.item
	}

	// merge the objects, to keep states, that aren't transmitted this time
	server_state.value = {
		...server_state.value,
		...data
	};
}

function load_item_slides(data: JGCPSend.ItemSlides) {
	item_slides.value = data;
}

function set_active_slide(slide: number) {
	const message: JGCPRecv.SelectItemSlide = {
		command: "select_item_slide",
		item: selected_item.value,
		slide,
		client_id: client_id
	}

	ws.send(JSON.stringify(message));
}

function handle_ws_response(response: JGCPSend.Response) {
	if (typeof response.code === "number") {
		switch (Number(response.code.toString()[0])) {
			case 4:
				console.error(response.message);
				break;
			default:
				console.debug(response.message);
		}
	}
}

const random_4_hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
const client_id = `${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;
</script>

<template>
	<div id="main_window">
		<ControlWindow
			:ws="ws"
			:client_id="client_id"
			:server_state="server_state"
			:sequence="sequence_items"
			:slides="item_slides"
			:active_item_slide="server_state.active_item_slide"
			:selected="selected_item"
			@select_item="select_item"
			@select_slide="set_active_slide"
		/>
	</div>
</template>

<style scoped>
#main_window {
	width: 100vw;
	height: 100vh;

	display: flex;
	flex-direction: column;

	padding: 0.25rem
}
/* 
@media (min-width: 1024px) {
	header {
		display: flex;
		flex-direction: column;
		place-items: center;
		padding-right: calc(var(--section-gap) / 2);
	}

	.logo {
		margin: 0 2rem 0 0;
	}

	header .wrapper {
		display: flex;
		place-items: flex-start;
		flex-wrap: wrap;
	}
} */
</style>./views/ControlWindow.vue

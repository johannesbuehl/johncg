<script setup lang="ts">
/**
 * MISSING
 * sortableJS
 * error-log
 * add keyboard-control
 * create css-files for duplicate css in Parts
 */
import { ref, watch } from "vue";
import ControlWindow from "./ControlWindow/ControlWindow.vue";

import * as JGCPSend from "../../server/JGCPSendMessages";
import * as JGCPRecv from "../../server/JGCPReceiveMessages";

const Config = {
	client_server: {
		websocket: {
			port: "8765"
		}
	}
};

const enum ServerConnection {
	disconnected = 0,
	connected = 1
}

const server_state = ref<JGCPSend.State>({ command: "state" });
const playlist_items = ref<JGCPSend.Playlist>();
const item_slides = ref<JGCPSend.ItemSlides>();
const selected_item = ref<number>(-1);
const server_connection = ref<ServerConnection>(ServerConnection.disconnected);
let ws: WebSocket | undefined;
ws_connect();

watch(selected_item, (new_selection) => {
	const message: JGCPRecv.RequestItemSlides = {
		command: "request_item_slides",
		item: new_selection ?? -1,
		client_id
	};

	ws?.send(JSON.stringify(message));
});

function init() {
	server_state.value = { command: "state" };
	playlist_items.value = undefined;
	item_slides.value = undefined;
	selected_item.value = -1;
}

function select_item(item: number) {
	if (playlist_items.value?.playlist_items[item].selectable) {
		selected_item.value = item;
	}
}

function ws_connect() {
	const url = new URL(document.URL);

	const ws_url: string = `ws://${url.hostname}:${Config.client_server.websocket.port}`;

	ws = new WebSocket(ws_url, "JGCP");

	ws.addEventListener("open", () => {
		server_connection.value = ServerConnection.connected;
	});

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
			playlist_items: load_playlist_items,
			state: parse_state,
			item_slides: load_item_slides,
			response: handle_ws_response
		};

		command_parser_map[data.command ?? ""](data as never);
	});

	ws.addEventListener("ping", () => {});

	ws.addEventListener("error", (event: Event) => {
		console.error(
			`Server connection encountered error '${(event as ErrorEvent).message}'. Closing socket`
		);

		ws?.close();
	});

	ws.addEventListener("close", () => {
		console.log("No connection to server. Retrying in 1s");

		// delete the playlist and slides
		init();

		server_connection.value = ServerConnection.disconnected;

		setTimeout(() => {
			ws_connect();
		}, 1000);
	});
}

function load_playlist_items(data: JGCPSend.Playlist) {
	playlist_items.value = data;
}

function parse_state(data: JGCPSend.State) {
	if (typeof data.active_item_slide === "object") {
		if (
			typeof data.active_item_slide?.item !== "number" ||
			typeof data.active_item_slide?.slide !== "number"
		) {
			throw new TypeError("'active_item_slide' is not of type '{item: number; slide: number}'");
		}
	}

	if (typeof (data.visibility ?? false) !== "boolean") {
		throw new TypeError("'visibility' is not of type 'boolean'");
	}

	// if the client_id is ours, set the selected to the active
	if (data.active_item_slide !== undefined && data.client_id === client_id) {
		selected_item.value = data.active_item_slide?.item;
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
	};

	ws?.send(JSON.stringify(message));
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

const random_4_hex = () =>
	Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
const client_id = `${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;
</script>

<template>
	<div id="main_window">
		<ControlWindow
			v-if="server_connection === ServerConnection.connected"
			:ws="ws!"
			:client_id="client_id"
			:server_state="server_state"
			:playlist="playlist_items"
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

	padding: 0.25rem;
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
</style>

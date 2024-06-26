<script lang="ts">
	export function stop_event(event: Event) {
		event.stopPropagation();
		event.preventDefault();
	}

	export type ItemData = { [key in JCGPRecv.GetItemData["type"]]?: ItemFileMapped<key> };
</script>

<script setup lang="ts">
	import { ref, watch } from "vue";

	import ControlWindow from "@/ControlWindow/ControlWindow.vue";
	import { ControlWindowState } from "./Enums";

	import * as JCGPSend from "@server/JCGPSendMessages";
	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ItemFileMapped, ItemFileType } from "@server/search_part";
	import Globals, { WSWrapper } from "./Globals";

	const Config = {
		client_server: {
			websocket: {
				port: 8765
			}
		},
		timeouts: {
			item_file_getters: 5000, // 5 seconds
			item_file_invalidation: 300000 // 5 minutes
		}
	};

	const enum ServerConnection {
		disconnected = 0,
		connected = 1
	}

	const server_state = ref<JCGPSend.State>({ command: "state" });
	const playlist_items = ref<JCGPSend.Playlist>();
	const item_slides = ref<JCGPSend.ItemSlides>();
	const selected_item = ref<number | null>(null);
	const server_connection = ref<ServerConnection>(ServerConnection.disconnected);
	const playlist_caption = ref<string>("");

	const item_data = ref<ItemData>({});

	ws_connect();

	// watch for changes in item-selection
	watch(selected_item, (new_selection) => {
		// only request the slides, if they are actually shown
		if (
			Globals.ControlWindowState === ControlWindowState.Slides &&
			typeof new_selection === "number"
		) {
			request_item_slides(new_selection);
		} else {
			// else: delete the stored item-slides
			item_slides.value = undefined;
		}
	});

	watch(
		() => Globals.ControlWindowState,
		() => {
			// if the new control-window-state is the playlist, request the slides
			if (Globals.ControlWindowState === ControlWindowState.Slides && selected_item.value) {
				request_item_slides(selected_item.value);
			} else {
				// else delete the stored slides
				item_slides.value = undefined;
			}
		}
	);

	function request_item_slides(index: number) {
		Globals.ws?.send<JCGPRecv.RequestItemSlides>({
			command: "request_item_slides",
			item: index,
			client_id
		});
	}

	function init() {
		server_state.value = { command: "state" };
		playlist_items.value = undefined;
		item_slides.value = undefined;
		selected_item.value = -1;
	}

	function select_item(item: number) {
		if (
			playlist_items.value?.playlist_items[item].displayable ||
			Globals.ControlWindowState === ControlWindowState.Edit
		) {
			if (selected_item.value === item) {
				request_item_slides(item);
			}

			selected_item.value = item;
		}
	}

	function ws_connect() {
		const url = new URL(document.URL);

		Globals._ws = new WSWrapper(url.hostname, Config.client_server.websocket.port);

		Globals.ws?.ws.addEventListener("open", () => {
			// reset the window-state
			Globals.ControlWindowState === ControlWindowState.Slides;

			server_connection.value = ServerConnection.connected;

			Globals.message.log("Connected to JohnCG");
		});

		Globals.ws?.ws.addEventListener("message", (event: MessageEvent) => {
			let data: JCGPSend.Message;

			try {
				data = JSON.parse(event.data as string);
			} catch (e) {
				if (e instanceof SyntaxError) {
					Globals.message.error("received invalid JSON");
					return;
				} else {
					throw e;
				}
			}

			const command_parser_map: { [key in JCGPSend.Message["command"]]: (...args: any) => void } = {
				playlist_items: load_playlist_items,
				state: parse_state,
				item_slides: load_item_slides,
				response: handle_ws_response,
				clear: init,
				item_files: parse_item_files,
				bible: parse_bible,
				playlist_pdf: save_playlist_pdf,
				client_mesage: show_client_message,
				item_data: store_item_data,
				media_thumbnails: store_thumbnails
			};

			command_parser_map[data.command](data as never);
		});

		Globals.ws?.ws.addEventListener("ping", () => {});

		Globals.ws?.ws.addEventListener("error", (event: Event) => {
			Globals.message.error(
				`Server connection encountered error '${(event as ErrorEvent).message}'. Closing socket`
			);

			Globals.ws?.ws.close();
		});

		Globals.ws?.ws.addEventListener("close", () => {
			Globals.message.log("No connection to server. Retrying in 1s");

			// delete the playlist and slides
			init();

			server_connection.value = ServerConnection.disconnected;

			setTimeout(() => {
				ws_connect();
			}, 1000);
		});
	}

	function load_playlist_items(data: JCGPSend.Playlist) {
		playlist_items.value = data;
		playlist_caption.value = data.caption;

		// if it is a new-playlist, reset the selected-item to the first one
		if (data.new) {
			selected_item.value = data.playlist_items.length > 0 ? 0 : null;
		}

		// if the playlist is empty, clear the slides-view
		if (data.playlist_items.length === 0) {
			item_slides.value = undefined;
		} else {
			// request new slides for the selected item
			if (Globals.ControlWindowState === ControlWindowState.Slides && selected_item.value) {
				Globals.ws?.send<JCGPRecv.RequestItemSlides>({
					command: "request_item_slides",
					item: selected_item.value
				});
			}
		}
	}

	function parse_state(data: JCGPSend.State) {
		if (typeof data.active_item_slide === "object") {
			if (
				(typeof data.active_item_slide?.item !== "number" &&
					data.active_item_slide?.item !== null) ||
				(typeof data.active_item_slide?.slide !== "number" &&
					data.active_item_slide?.slide !== null)
			) {
				throw new TypeError("'active_item_slide' is not of type '{item: number; slide: number}'");
			}
		}

		if (typeof (data.visibility ?? false) !== "boolean") {
			throw new TypeError("'visibility' is not of type 'boolean'");
		}

		// if the client_id is ours or currently no item is selected, set the selected to the active
		if (
			data.active_item_slide !== undefined &&
			(data.client_id === client_id || selected_item.value === -1)
		) {
			selected_item.value = data.active_item_slide?.item;
		}

		// merge the objects, to keep states, that aren't transmitted this time
		server_state.value = {
			...server_state.value,
			...data
		};
	}

	function load_item_slides(data: JCGPSend.ItemSlides) {
		item_slides.value = data;
	}

	function set_active_slide(item: number, slide: number) {
		Globals.ws?.send<JCGPRecv.SelectItemSlide>({
			command: "select_item_slide",
			item: item,
			slide,
			client_id: client_id
		});
	}

	function parse_item_files(data: JCGPSend.ItemFiles<keyof ItemFileType>) {
		if (Object.keys(Globals.item_files.value).includes(data.type)) {
			Globals.item_files.value[data.type] = data.files;
		}
	}

	function store_item_data(data: JCGPSend.ItemData<JCGPRecv.GetItemData["type"]>) {
		// work around typescripts conservative type-system
		switch (data.type) {
			case "song":
				item_data.value.song = data.data;
				break;
			case "psalm":
				item_data.value.psalm = data.data;
				break;
		}
	}

	function store_thumbnails(data: JCGPSend.MediaThumbnails) {
		if (typeof data.thumbnails === "object") {
			Object.assign(Globals._thumbnails.value, {
				...Globals._thumbnails.value,
				...data.thumbnails
			});
		}
	}

	function parse_bible(data: JCGPSend.Bible) {
		Globals.bible_file.value = data.bible;
	}

	function save_playlist_pdf(data: JCGPSend.PlaylistPDF) {
		Globals.message.log("Received Playlist PDF");

		const url = `data:application/pdf;base64,${data.playlist_pdf}`;

		const link = document.createElement("a");
		link.href = url;
		link.download = `${playlist_caption.value}.pdf`;

		link.click();

		URL.revokeObjectURL(url);
	}

	function show_client_message(data: JCGPSend.ClientMessage) {
		Globals.message.add(data.message, data.type);
	}

	function handle_ws_response(response: JCGPSend.Response) {
		if (typeof response.code === "number") {
			switch (Number(response.code.toString()[0])) {
				case 4:
					Globals.message.error(response.message);
					break;
				default:
					Globals.message.debug(response.message);
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
			:client_id="client_id"
			:server_state="server_state"
			:playlist="playlist_items"
			:slides="item_slides"
			:active_item_slide="server_state.active_item_slide"
			:selected="selected_item"
			:playlist_caption="playlist_caption"
			:item_data="item_data"
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

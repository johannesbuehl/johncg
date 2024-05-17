<script setup lang="ts">
	import { ref, watch } from "vue";

	import ControlWindow from "@/ControlWindow/ControlWindow.vue";
	import { ControlWindowState } from "./Enums";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { BibleFile } from "@server/PlaylistItems/Bible";
	import type { File } from "@server/search_part";
	import { LogLevel, type LogMessage } from "./ControlWindow/Message/MessagePopup.vue";

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
	const selected_item = ref<number | null>(null);
	const server_connection = ref<ServerConnection>(ServerConnection.disconnected);
	const bible_file = ref<BibleFile>();
	const playlist_caption = ref<string>("");
	const messages = ref<LogMessage[]>([]);
	const log_level = ref<Record<LogLevel, boolean>>({ error: true, warn: true, log: true, debug: false });
	const control_window_state = defineModel<ControlWindowState>("control_window_state", {
		default: ControlWindowState.Slides
	});

	const files = ref<{ [key in JGCPSend.ItemFiles["type"]]: File[] }>({
		song: [],
		media: [],
		pdf: [],
		playlist: [],
		template: [],
		psalm: []
	});

	let ws: WebSocket | undefined;
	ws_connect();

	// watch for changes in item-selection
	watch(selected_item, (new_selection) => {
		// only request the slides, if they are actually shown
		if (
			control_window_state.value === ControlWindowState.Slides &&
			typeof new_selection === "number"
		) {
			request_item_slides(new_selection);
		} else {
			// else: delete the stored item-slides
			item_slides.value = undefined;
		}
	});

	watch(control_window_state, (new_state) => {
		// if the new control-window-state is the playlist, request the slides
		if (new_state === ControlWindowState.Slides && selected_item.value) {
			request_item_slides(selected_item.value);
		} else {
			// else delete the stored slides
			item_slides.value = undefined;
		}
	});

	function request_item_slides(index: number) {
		const message: JGCPRecv.RequestItemSlides = {
			command: "request_item_slides",
			item: index,
			client_id
		};

		ws?.send(JSON.stringify(message));
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
			control_window_state.value === ControlWindowState.Edit
		) {
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
					messages.value.push({
						message: "received invalid JSON",
						type: LogLevel.error,
						timestamp: new Date()
					});
					return;
				} else {
					throw e;
				}
			}

			const command_parser_map: { [key in JGCPSend.Message["command"]]: (...args: any) => void } = {
				playlist_items: load_playlist_items,
				state: parse_state,
				item_slides: load_item_slides,
				response: handle_ws_response,
				clear: init,
				playlist_save: save_playlist_file,
				item_files: parse_item_files,
				bible: parse_bible,
				playlist_pdf: save_playlist_pdf
			};

			command_parser_map[data.command](data as never);
		});

		ws.addEventListener("ping", () => {});

		ws.addEventListener("error", (event: Event) => {
			messages.value.push({
				message: `Server connection encountered error '${(event as ErrorEvent).message}'. Closing socket`,
				type: LogLevel.error,
				timestamp: new Date()
			});

			ws?.close();
		});

		ws.addEventListener("close", () => {
			messages.value.push({
				message: "No connection to server. Retrying in 1s",
				type: LogLevel.log,
				timestamp: new Date()
			});

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
		playlist_caption.value = data.caption;

		// if it is a new-playlist, reset the selected-item to the first one
		if (data.new) {
			selected_item.value = data.playlist_items.length > 0 ? 0 : null;
		}

		if (control_window_state.value === ControlWindowState.OpenPlaylist) {
			control_window_state.value = ControlWindowState.Slides;
		}

		// if the playlist is empty, clear the slides-view
		if (data.playlist_items.length === 0) {
			item_slides.value = undefined;
		} else {
			// request new slides for the selected item
			if (control_window_state.value === ControlWindowState.Slides && selected_item.value) {
				const message: JGCPRecv.RequestItemSlides = {
					command: "request_item_slides",
					item: selected_item.value
				};

				ws?.send(JSON.stringify(message));
			}
		}
	}

	function parse_state(data: JGCPSend.State) {
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

	function load_item_slides(data: JGCPSend.ItemSlides) {
		item_slides.value = data;
	}

	function set_active_slide(item: number, slide: number) {
		const message: JGCPRecv.SelectItemSlide = {
			command: "select_item_slide",
			item: item,
			slide,
			client_id: client_id
		};

		ws?.send(JSON.stringify(message));
	}

	function save_playlist_file(data: JGCPSend.PlaylistSave) {
		const json_string = JSON.stringify(data.playlist, null, "\t");

		const blob = new Blob([json_string], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const link = document.createElement("a");
		link.href = url;
		link.download = "playlist.jcg";

		link.click();

		URL.revokeObjectURL(url);
	}

	function parse_item_files(data: JGCPSend.ItemFiles) {
		if (Object.keys(files.value).includes(data.type)) {
			files.value[data.type] = data.files;
		}
	}

	function parse_bible(data: JGCPSend.Bible) {
		bible_file.value = data.bible;
	}

	function save_playlist_pdf(data: JGCPSend.PlaylistPDF) {
		// const json_string = JSON.stringify(data.playlist_pdf, null, "\t");

		// const blob = new Blob([Buffer.from(data.playlist_pdf, "base64")], { type: "application/pdf" });
		// const url = URL.createObjectURL(blob);
		const url = `data:application/pdf;base64,${data.playlist_pdf}`;

		const link = document.createElement("a");
		link.href = url;
		link.download = `${playlist_caption.value}.pdf`;

		link.click();

		URL.revokeObjectURL(url);
	}

	function handle_ws_response(response: JGCPSend.Response) {
		if (typeof response.code === "number") {
			switch (Number(response.code.toString()[0])) {
				case 4:
					messages.value.push({
						message: response.message,
						type: LogLevel.error,
						timestamp: new Date()
					});
					break;
				default:
					messages.value.push({
						message: response.message,
						type: LogLevel.debug,
						timestamp: new Date()
					});
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
			v-model:control_window_state="control_window_state"
			:ws="ws!"
			:client_id="client_id"
			:server_state="server_state"
			:playlist="playlist_items"
			:slides="item_slides"
			:active_item_slide="server_state.active_item_slide"
			:selected="selected_item"
			:files="files"
			:bible_file="bible_file"
			:playlist_caption="playlist_caption"
			:messages="messages"
			:log_level="log_level"
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

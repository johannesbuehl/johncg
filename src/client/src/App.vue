<script lang="ts">
	export function stop_event(event: Event) {
		event.stopPropagation();
		event.preventDefault();
	}

	export type ItemData = { [key in JCGPRecv.GetItemData["type"]]?: ItemFileMapped<key> };
</script>

<script setup lang="ts">
	import { ref, watch } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import ControlWindow from "@/ControlWindow/ControlWindow.vue";
	import { ControlWindowState } from "./Enums";
	import Globals, { ServerConnection, WSWrapper } from "./Globals";
	import PopUp from "./ControlWindow/PopUp.vue";
	import MenuButton from "./ControlWindow/MenuBar/MenuButton.vue";

	import * as JCGPSend from "@server/JCGPSendMessages";
	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ItemFileMap, ItemFileMapped, ItemNodeMapped } from "@server/search_part_types";

	library.add(fas.faCheck, fas.faXmark);

	// eslint-disable-next-line @typescript-eslint/naming-convention
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

	const server_state = ref<JCGPSend.State>({ command: "state", server_id: "" });
	const playlist_items = ref<JCGPSend.Playlist>();
	const item_slides = ref<JCGPSend.ItemSlides>();
	const selected_item = ref<number | null>(null);

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

	/**
	 * requests the item-slides for a given item-dinex
	 * @param index number of the item
	 */
	function request_item_slides(index: number) {
		Globals.ws?.send<JCGPRecv.RequestItemSlides>({
			command: "request_item_slides",
			item: index,
			client_id: Globals.client_id
		});
	}

	/**
	 * sets the selected item
	 * @param item
	 */
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

	/**
	 * opens a websocket to the server
	 */
	function ws_connect() {
		const url = new URL(document.URL);

		Globals._ws = new WSWrapper(url.hostname, Config.client_server.websocket.port);

		Globals.ws?.ws.addEventListener("open", () => {
			// reset the window-state
			Globals.ControlWindowState = ControlWindowState.Slides;

			Globals.server_connection.value = ServerConnection.Connected;

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

			// check the server-id
			if (typeof (data.server_id ?? "") !== "string") {
				throw new TypeError("server-id is invalid");
			}
			// if the connection is new / no server-id is stored, save it
			if (server_state.value.server_id === "") {
				server_state.value.server_id = data.server_id;
			}
			// if the server-id is new, reload the page
			if (server_state.value.server_id !== data.server_id) {
				window.location.reload();
			}

			const command_parser_map: { [key in JCGPSend.Message["command"]]: (arg: never) => void } = {
				playlist_items: load_playlist_items,
				state: parse_state,
				item_slides: load_item_slides,
				response: handle_ws_response,
				item_files: parse_item_files,
				bible: parse_bible,
				playlist_pdf: save_playlist_pdf,
				client_mesage: show_client_message,
				item_data: store_item_data,
				media_thumbnails: store_thumbnails,
				client_confirmation: show_confirmation_dialog,
				confirm_id: handle_confirm_id
			};

			command_parser_map[data.command](data as never);
		});

		Globals.ws?.ws.addEventListener("ping", () => {});

		Globals.ws?.ws.addEventListener("error", (event: Event) => {
			if (Globals.server_connection.value !== ServerConnection.Disconnected) {
				const message: string | undefined = (event as ErrorEvent).message;

				Globals.message.error(
					`Server connection encountered error${!!message ? ` '${message}''` : ""}. Closing socket`
				);
			}

			Globals.ws?.ws.close();
		});

		Globals.ws?.ws.addEventListener("close", () => {
			Globals.message.log("No connection to server. Retrying in 1s");

			Globals.server_connection.value = ServerConnection.Disconnected;

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

		// if auto_follow is active, the client_id is ours or currently no item is selected, set the selected to the active
		if (
			data.active_item_slide !== undefined &&
			(Globals.follow_all_navigates.value ||
				data.client_id === Globals.client_id ||
				selected_item.value === -1)
		) {
			selected_item.value = data.active_item_slide?.item ?? null;
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
			client_id: Globals.client_id
		});
	}

	function parse_item_files<T extends keyof ItemFileMap>(data: JCGPSend.ItemFiles<T>) {
		if (Object.keys(Globals.item_files.value).includes(data.type)) {
			// trickery because of typescripts (too) strict typing
			switch (data.type) {
				case "media":
					Globals.item_files.value.media = data.files as ItemNodeMapped<T>[];
					break;
				case "pdf":
					Globals.item_files.value.pdf = data.files as ItemNodeMapped<T>[];
					break;
				case "playlist":
					Globals.item_files.value.playlist = data.files as ItemNodeMapped<T>[];
					break;
				case "template":
					Globals.item_files.value.template = data.files as ItemNodeMapped<T>[];
					break;
				case "psalm":
					Globals.item_files.value.psalm = data.files as ItemNodeMapped<"psalm">[];
					break;
				case "song":
					Globals.item_files.value.song = data.files as ItemNodeMapped<"song">[];
					break;
			}
		}
	}

	function store_item_data<K extends JCGPRecv.GetItemData["type"]>(data: JCGPSend.ItemData<K>) {
		item_data.value[data.type] = data.data;
	}

	function store_thumbnails(data: JCGPSend.MediaThumbnails) {
		if (typeof data.thumbnails === "object") {
			Object.assign(Globals._thumbnails.value, {
				...Globals._thumbnails.value,
				...data.thumbnails
			});
		}
	}

	// const confirm_dialog_text = ref<JCGPSend.ClientConfirmation["text"]>();
	let confirm_dialog_request: JCGPSend.ClientConfirmation;
	const show_confirm_dialogue = ref<boolean>(false);
	function show_confirmation_dialog(data: JCGPSend.ClientConfirmation) {
		if (
			typeof data.id === "string" &&
			typeof data.text?.header === "string" &&
			typeof data.text?.text === "string" &&
			data.options.every(
				(option) =>
					["undfined", "string"].includes(typeof option?.icon) &&
					["undfined", "string"].includes(typeof option?.text) &&
					["string", "number", "boolean"].includes(typeof option?.value)
			)
		) {
			confirm_dialog_request = data;

			show_confirm_dialogue.value = true;
		}
	}

	function answer_confirmation_dialogue(option: JCGPRecv.ClientConfirmation["option"]) {
		show_confirm_dialogue.value = false;

		Globals.ws?.send<JCGPRecv.ClientConfirmation>({
			command: "client_confirmation",
			id: confirm_dialog_request.id,
			option
		});
	}

	function handle_confirm_id(data: JCGPSend.ConfirmID) {
		if (typeof data.id === "string" && typeof data.state === "boolean") {
			Globals._confirm_id_functions[data.id]?.(data.state);

			delete Globals._confirm_id_functions?.[data.id];
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
</script>

<template>
	<div id="main_window">
		<ControlWindow
			:client_id="Globals.client_id"
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
		<PopUp
			v-model:active="show_confirm_dialogue"
			:title="confirm_dialog_request?.text?.header ?? ''"
			@close="answer_confirmation_dialogue(null)"
		>
			<div id="confirm_dialogue_content">
				<div id="confirm_dialog_text">
					{{ confirm_dialog_request?.text?.text }}
				</div>
				<div id="confirm_button_wrapper">
					<MenuButton
						v-for="(option, index) of confirm_dialog_request?.options"
						:key="index"
						@click="answer_confirmation_dialogue(option.value)"
					>
						<FontAwesomeIcon
							v-if="option.icon !== undefined"
							:icon="['fas', option.icon]"
							:squre="option.text === undefined"
						/>{{ option.text ?? "" }}
					</MenuButton>
				</div>
			</div>
		</PopUp>
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

	#confirm_dialogue_content {
		background-color: var(--color-container);
	}

	#confirm_dialog_text {
		padding: 0.5rem;
		padding-bottom: 0.25rem;
	}

	#confirm_button_wrapper {
		display: flex;

		justify-content: right;
	}
	/* 
@media (min-width: 1024px) {
	header {
		display: flex;
		flex-direction: column;
		place-items: center;
		padding-right: calc(var(--section-gap) / 2);
	}
*/
</style>

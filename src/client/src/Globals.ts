import { ref } from "vue";

import { ControlWindowState } from "./Enums";

import * as JCGPRecv from "@server/JCGPReceiveMessages";
import * as JCGPSend from "@server/JCGPSendMessages";
import { LogLevel } from "@server/JCGPSendMessages";
import type { BibleFile } from "@server/PlaylistItems/Bible";
import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
import { random_id } from "@server/lib";
import type { CasparFile, ItemFileMap, ItemNodeMapped, Node } from "@server/search_part_types";
import type { ActiveItemSlide } from "@server/Playlist";

export interface LogMessage {
	message: string;
	type: LogLevel;
	timestamp: Date;
}

export const enum ServerConnection {
	Disconnected = 0,
	Connected = 1
}

class Log {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _messages = ref<LogMessage[]>([]);
	get messages(): LogMessage[] {
		return this._messages.value;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _log_level = ref<Record<LogLevel, boolean>>({
		debug: false,
		log: true,
		warn: true,
		error: true
	});
	get log_level(): Record<LogLevel, boolean> {
		return this._log_level.value;
	}

	add(message: string, level: LogLevel = LogLevel.log) {
		this._messages.value.push({
			message,
			type: level,
			timestamp: new Date()
		});
	}

	debug(message: string) {
		this.add(message, LogLevel.debug);
	}

	log(message: string) {
		this.add(message, LogLevel.log);
	}

	warn(message: string) {
		this.add(message, LogLevel.warn);
	}

	error(message: string) {
		this.add(message, LogLevel.error);
	}
}

export class WSWrapper {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _ws: WebSocket;
	get ws(): WebSocket {
		return this._ws;
	}

	constructor(hostname: string, port: number) {
		const ws_url: string = `ws://${hostname}:${port}`;

		this._ws = new WebSocket(ws_url, "JCGP");
	}

	send<T extends JCGPRecv.Message>(message: T) {
		this.ws?.send(JSON.stringify(message));
	}
}

export interface ClientSettings {
	client_server: {
		websocket: {
			port: number;
		};
	};
	timeouts: {
		item_file_getters: number;
		item_file_invalidation: number;
		client_id_confirm: number;
	};
}

class Global {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _client_id = random_id();

	get client_id() {
		return this._client_id;
	}

	server_state = ref<JCGPSend.State>({ command: "state", server_id: "" });

	get active_item_slide(): ActiveItemSlide | undefined {
		return this.server_state.value?.active_item_slide;
	}

	selected_item = ref<number | null>(null);

	// eslint-disable-next-line @typescript-eslint/naming-convention
	_item_slides = ref<JCGPSend.ItemSlides>();

	get_item_slides(): JCGPSend.ItemSlides | undefined {
		if (
			this.selected_item.value !== null &&
			(this._item_slides.value === undefined ||
				this._item_slides.value.item !== this.selected_item.value)
		) {
			this.ws?.send({
				command: "request_item_slides",
				item: this.selected_item.value,
				client_id: this.client_id
			});
		} else {
			return this._item_slides.value;
		}
	}

	// Settings
	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _settings: ClientSettings = {
		client_server: {
			websocket: {
				port: 8765
			}
		},
		timeouts: {
			item_file_getters: 5, // 5 seconds
			item_file_invalidation: 300, // 5 minutes
			client_id_confirm: 1800 // 30 minutes
		}
	};
	get settings(): ClientSettings {
		return this._settings;
	}

	// WebSocket
	// eslint-disable-next-line @typescript-eslint/naming-convention
	_ws: WSWrapper | undefined;
	get ws(): WSWrapper | undefined {
		return this._ws;
	}
	server_connection = ref<ServerConnection>(ServerConnection.Disconnected);

	// ControlWindowState
	private control_window_state = ref<ControlWindowState[]>([ControlWindowState.Slides]);
	/**
	 * Retrieves the current control-window-state
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	get ControlWindowState(): ControlWindowState | undefined {
		return this.control_window_state.value.at(-1);
	}
	// eslint-disable-next-line @typescript-eslint/naming-convention
	set ControlWindowState(state: ControlWindowState) {
		if (this.control_window_state_change_confirm === undefined) {
			this.control_window_state.value.push(state);

			// shrink the array to the last 20 elements
			this.control_window_state.value = this.control_window_state.value.slice(-20);
		} else {
			this.control_window_state_change_confirm((change_state: boolean) => {
				if (change_state) {
					this.control_window_state.value.push(state);

					// shrink the array to the last 20 elements
					this.control_window_state.value = this.control_window_state.value.slice(-20);

					this.control_window_state_change_confirm = undefined;
				}
			});
		}
	}
	previous_control_window_state() {
		this.control_window_state.value.pop();
	}

	// ControlWindowStateConfirm
	private control_window_state_change_confirm:
		| ((callback: (change_state: boolean) => void) => void)
		| undefined = undefined;
	set control_window_state_confirm(
		callback: ((callback: (change_state: boolean) => void) => void) | undefined
	) {
		this.control_window_state_change_confirm = callback;
	}

	// Log
	private message_log = new Log();
	get message(): Log {
		return this.message_log;
	}

	// Item-Files
	item_files = ref<{ [key in keyof ItemFileMap]: ItemNodeMapped<key>[] }>({
		songs: [],
		media: [],
		pdfs: [],
		playlists: [],
		templates: [],
		psalms: []
	});
	private item_files_last_requests: { [key in keyof ItemFileMap]: number } = {
		songs: 0,
		media: 0,
		pdfs: 0,
		playlists: 0,
		templates: 0,
		psalms: 0
	};
	get_song_files(force: boolean = false): Node<"songs">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.songs.length === 0 &&
				now - this.item_files_last_requests.songs >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.songs >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.songs = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "songs"
			});
		}

		return this.item_files.value.songs;
	}
	get_media_files(force: boolean = false): Node<"media">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.media.length === 0 &&
				now - this.item_files_last_requests.media >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.media >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.media = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "media"
			});

			// reset the thumbnails
			this._thumbnails.value = {};
		}

		return this.item_files.value.media;
	}
	get_pdf_files(force: boolean = false): Node<"pdfs">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.pdfs.length === 0 &&
				now - this.item_files_last_requests.pdfs >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.pdfs >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.pdfs = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "pdfs"
			});
		}

		return this.item_files.value.pdfs;
	}
	get_playlist_files(force: boolean = false): Node<"playlists">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.playlists.length === 0 &&
				now - this.item_files_last_requests.playlists >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.playlists >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.playlists = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "playlists"
			});
		}

		return this.item_files.value.playlists;
	}
	get_template_files(force: boolean = false): Node<"templates">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.templates.length === 0 &&
				now - this.item_files_last_requests.templates >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.templates >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.templates = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "templates"
			});
		}

		return this.item_files.value.templates;
	}
	get_psalm_files(force: boolean = false): Node<"psalms">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.psalms.length === 0 &&
				now - this.item_files_last_requests.psalms >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.psalms >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.psalms = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "psalms"
			});
		}

		return this.item_files.value.psalms;
	}

	bible_file = ref<BibleFile>();
	private bible_file_last_request = 0;
	get_bible_file(force: boolean = false): BibleFile | undefined {
		const now = new Date().valueOf();

		if (
			(this.bible_file.value === undefined &&
				now - this.bible_file_last_request > this.settings.timeouts.item_file_getters * 1000) ||
			now - this.bible_file_last_request > this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.bible_file_last_request = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetBible>({
				command: "get_bible"
			});
		}

		return this.bible_file.value;
	}

	// Thumbnails
	// eslint-disable-next-line @typescript-eslint/naming-convention
	_thumbnails = ref<JCGPSend.MediaThumbnails["thumbnails"]>({});
	get_thumbnails(files?: CasparFile[]): Record<string, string> {
		if (files !== undefined) {
			const thumbnails_result: [CasparFile, string | undefined][] = files.map((ff) => [
				ff,
				this._thumbnails.value[ff.path]
			]);

			const missing_thumbnails = thumbnails_result
				.filter(([, thumbnail]) => thumbnail === undefined)
				.map(([ff]) => ff);

			if (missing_thumbnails.length > 0) {
				this.ws?.send<JCGPRecv.GetMediaThumbnails>({
					command: "get_media_thumbnails",
					files: missing_thumbnails
				});
			}
		}

		return this._thumbnails.value;
	}

	// colors
	readonly color: Record<ItemProps["type"], string> = {
		amcp: "#FF00FF",
		bible: "#0080FF",
		comment: "#FF8000",
		countdown: "#FF0080",
		media: "#00FF00",
		pdf: "#00FFFF",
		psalm: "#FFFF00",
		song: "#0000FF",
		template: "#FF0000",
		text: "#FF0000"
	};

	// ConfirmID
	// eslint-disable-next-line @typescript-eslint/naming-convention
	_confirm_id_functions: Record<string, (state: boolean) => void> = {};
	add_confirm(callback: (state: boolean) => void) {
		const id = random_id();

		this._confirm_id_functions[id] = callback;

		// remove the function after a give time to prevent cluttering
		setTimeout(() => {
			delete this._confirm_id_functions[id];
		}, this.settings.timeouts.client_id_confirm * 1000);

		return id;
	}

	follow_all_navigates = ref<boolean>(false);
}

/* eslint-disable @typescript-eslint/naming-convention */
const Globals = new Global();
/* eslint-enable @typescript-eslint/naming-convention */

export default Globals;

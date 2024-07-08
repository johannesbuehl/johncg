import { ref } from "vue";

import { ControlWindowState } from "./Enums";

import * as JCGPRecv from "@server/JCGPReceiveMessages";
import type * as JCGPSend from "@server/JCGPSendMessages";
import { LogLevel } from "@server/JCGPSendMessages";
import type {
	CasparFile,
	ItemFileMap,
	ItemNodeMapped,
	Node,
	PDFFile,
	PlaylistFile,
	PsalmFile,
	SongFile
} from "@server/search_part";
import type { BibleFile } from "@server/PlaylistItems/Bible";
import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
import { random_id } from "@server/lib";

export interface LogMessage {
	message: string;
	type: LogLevel;
	timestamp: Date;
}

export const enum ServerConnection {
	disconnected = 0,
	connected = 1
}

class Log {
	private _messages = ref<LogMessage[]>([]);
	get messages(): LogMessage[] {
		return this._messages.value;
	}

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
	// Settings
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
	_ws: WSWrapper | undefined;
	get ws(): WSWrapper | undefined {
		return this._ws;
	}
	server_connection = ref<ServerConnection>(ServerConnection.disconnected);

	// ControlWindowState
	private control_window_state = ref<ControlWindowState[]>([ControlWindowState.Slides]);
	get ControlWindowState(): ControlWindowState {
		return this.control_window_state.value.slice(-1)[0];
	}
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
	previousControlWindowState() {
		this.control_window_state.value.pop();
	}

	// ControlWindowStateConfirm
	private control_window_state_change_confirm:
		| ((callback: (change_state: boolean) => void) => void)
		| undefined = undefined;
	set ControlWindowStateConfirm(
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
		song: [],
		media: [],
		pdf: [],
		playlist: [],
		template: [],
		psalm: []
	});
	private item_files_last_requests: { [key in keyof ItemFileMap]: number } = {
		song: 0,
		media: 0,
		pdf: 0,
		playlist: 0,
		template: 0,
		psalm: 0
	};
	get_song_files(force: boolean = false): Node<"song">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.song.length === 0 &&
				now - this.item_files_last_requests.song >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.song >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.song = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "song"
			});
		}

		return this.item_files.value.song;
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
	get_pdf_files(force: boolean = false): Node<"pdf">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.pdf.length === 0 &&
				now - this.item_files_last_requests.pdf >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.pdf >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.pdf = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "pdf"
			});
		}

		return this.item_files.value.pdf;
	}
	get_playlist_files(force: boolean = false): Node<"playlist">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.playlist.length === 0 &&
				now - this.item_files_last_requests.playlist >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.playlist >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.playlist = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "playlist"
			});
		}

		return this.item_files.value.playlist;
	}
	get_template_files(force: boolean = false): Node<"template">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.template.length === 0 &&
				now - this.item_files_last_requests.template >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.template >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.template = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "template"
			});
		}

		return this.item_files.value.template;
	}
	get_psalm_files(force: boolean = false): Node<"psalm">[] {
		const now = new Date().valueOf();

		if (
			(this.item_files.value.psalm.length === 0 &&
				now - this.item_files_last_requests.psalm >
					this.settings.timeouts.item_file_getters * 1000) ||
			now - this.item_files_last_requests.psalm >
				this.settings.timeouts.item_file_invalidation * 1000 ||
			force
		) {
			this.item_files_last_requests.psalm = new Date().valueOf();

			this.ws?.send<JCGPRecv.GetItemFiles>({
				command: "get_item_files",
				type: "psalm"
			});
		}

		return this.item_files.value.psalm;
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
	_thumbnails = ref<JCGPSend.MediaThumbnails["thumbnails"]>({});
	get_thumbnails(files?: CasparFile[]): Record<string, string> {
		if (files !== undefined) {
			const thumbnails_result: [CasparFile, string | undefined][] = files.map((ff) => [
				ff,
				this._thumbnails.value[ff.path]
			]);

			const missing_thumbnails = thumbnails_result
				.filter(([ff, thumbnail]) => thumbnail === undefined)
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
}

const Globals = new Global();

export default Globals;

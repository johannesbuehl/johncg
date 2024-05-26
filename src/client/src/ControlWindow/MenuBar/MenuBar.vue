<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	library.add(
		fas.faFile,
		fas.faFolderOpen,
		fas.faFloppyDisk,
		fas.faFilePdf,
		fas.faBackwardStep,
		fas.faForwardStep,
		fas.faAngleLeft,
		fas.faAngleRight,
		fas.faEyeSlash,
		fas.faEye,
		fas.faList,
		fas.faPlus,
		fas.faPen,
		fas.faMessage,
		fas.faXmark
	);
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import { ControlWindowState } from "@/Enums";
	import MenuButton from "./MenuButton.vue";
	import MenuDivider from "./MenuDivider.vue";
	import PopUp from "../PopUp.vue";

	import type * as JGCPRecv from "@server/JGCPReceiveMessages";

	const props = defineProps<{
		ws: WebSocket;
	}>();

	const control_window_state = defineModel<ControlWindowState>("control_window_state", {
		required: true
	});
	const playlist_caption = defineModel<string>("playlist_caption", { required: true });
	const visibility = defineModel<boolean>("visibility", { required: true });

	const show_abort_changes = ref<boolean>(false);

	const emit = defineEmits<{
		navigate: [type: JGCPRecv.NavigateType, steps: number];
		set_visibility: [state: boolean];
	}>();

	function new_playlist() {
		const message: JGCPRecv.NewPlaylist = {
			command: "new_playlist"
		};

		props.ws.send(JSON.stringify(message));
	}

	// reference for the file-input
	const load_playlist_input = ref<HTMLInputElement>();

	// read the content of the playlist-file and send it to the server
	function load_playlist_file(e: Event) {
		const input_event = e.target as HTMLInputElement;

		// only continue, if there is a file
		if (input_event.files !== null) {
			const reader = new FileReader();

			reader.addEventListener("load", (e) => {
				const message: JGCPRecv.OpenPlaylist = {
					command: "load_playlist",
					playlist: e.target?.result as string
				};

				props.ws.send(JSON.stringify(message));
			});

			reader.readAsText(input_event.files[0]);
		}
	}

	const pdf_popup = ref<boolean>(false);
	function create_playlist_pdf(type: "full" | "small") {
		const message: JGCPRecv.CreatePlaylistPDF = {
			command: "create_playlist_pdf",
			type
		};

		props.ws.send(JSON.stringify(message));

		pdf_popup.value = false;
	}

	let playlist_caption_timeout: NodeJS.Timeout;
	function update_playlist_caption() {
		clearTimeout(playlist_caption_timeout);

		playlist_caption_timeout = setTimeout(() => {
			const message: JGCPRecv.UpdatePlaylistCaption = {
				command: "update_playlist_caption",
				caption: playlist_caption.value
			};

			props.ws.send(JSON.stringify(message));
		}, 1000);
	}

	let control_window_state_wish: ControlWindowState;
	function set_window_state(state: ControlWindowState, force: boolean = false) {
		if (
			[ControlWindowState.NewSong, ControlWindowState.NewPsalm].includes(
				control_window_state.value
			) &&
			!force
		) {
			show_abort_changes.value = true;
			control_window_state_wish = state;
		} else {
			control_window_state.value = state;
		}
	}
</script>

<template>
	<div class="menubar">
		<MenuButton :square="true" @click="new_playlist()">
			<FontAwesomeIcon :icon="['fas', 'file']" />
		</MenuButton>
		<MenuButton
			:square="true"
			@click="set_window_state(ControlWindowState.OpenPlaylist)"
			:active="control_window_state === ControlWindowState.OpenPlaylist"
		>
			<FontAwesomeIcon :icon="['fas', 'folder-open']" />
		</MenuButton>
		<MenuButton
			:square="true"
			@click="set_window_state(ControlWindowState.SavePlaylist)"
			:active="control_window_state === ControlWindowState.SavePlaylist"
		>
			<FontAwesomeIcon :icon="['fas', 'floppy-disk']" />
		</MenuButton>
		<input
			type="file"
			ref="load_playlist_input"
			:accept="'.jcg'"
			@click="load_playlist_input ? (load_playlist_input.value = '') : null"
			@change="load_playlist_file"
			style="display: none"
		/>
		<MenuButton :square="true" @click="pdf_popup = true">
			<FontAwesomeIcon :icon="['fas', 'file-pdf']" />
		</MenuButton>
		<MenuDivider />
		<MenuButton
			:square="true"
			@click="set_window_state(ControlWindowState.Slides)"
			:active="control_window_state === ControlWindowState.Slides"
		>
			<FontAwesomeIcon :icon="['fas', 'list']" />
		</MenuButton>
		<MenuButton
			:square="true"
			@click="set_window_state(ControlWindowState.Add)"
			:active="
				control_window_state === ControlWindowState.Add ||
				control_window_state === ControlWindowState.NewSong ||
				control_window_state === ControlWindowState.NewPsalm
			"
		>
			<FontAwesomeIcon :icon="['fas', 'plus']" />
		</MenuButton>
		<MenuButton
			:square="true"
			@click="set_window_state(ControlWindowState.Edit)"
			:active="control_window_state === ControlWindowState.Edit"
		>
			<FontAwesomeIcon :icon="['fas', 'pen']" />
		</MenuButton>
		<div v-if="control_window_state === ControlWindowState.Slides" class="button_container">
			<MenuDivider />
			<MenuButton :square="true" @click="emit('navigate', 'item', -1)">
				<FontAwesomeIcon :icon="['fas', 'backward-step']" />
			</MenuButton>
			<MenuButton :square="true" @click="emit('navigate', 'item', 1)">
				<FontAwesomeIcon :icon="['fas', 'forward-step']" />
			</MenuButton>
			<MenuButton :square="true" @click="emit('navigate', 'slide', -1)">
				<FontAwesomeIcon :icon="['fas', 'angle-left']" />
			</MenuButton>
			<MenuButton :square="true" @click="emit('navigate', 'slide', 1)">
				<FontAwesomeIcon :icon="['fas', 'angle-right']" />
			</MenuButton>
			<MenuDivider />
			<MenuButton :square="true" v-model="visibility" @click="emit('set_visibility', visibility)">
				<FontAwesomeIcon :icon="['fas', visibility ? 'eye' : 'eye-slash']" />
			</MenuButton>
		</div>
		<template v-if="control_window_state === ControlWindowState.Edit">
			<input
				id="playlist_caption"
				type="text"
				v-model="playlist_caption"
				placeholder="Playlist-Name"
				@keydown="
					update_playlist_caption();
					$event.stopPropagation();
				"
			/>
		</template>
		<MenuButton
			id="message_button"
			:square="true"
			@click="set_window_state(ControlWindowState.Message)"
			:active="control_window_state === ControlWindowState.Message"
		>
			<FontAwesomeIcon :icon="['fas', 'message']" />
		</MenuButton>
	</div>
	<!-- PDF-save -->
	<PopUp v-model:active="pdf_popup" title="Create Playlist-PDF">
		<div class="popup_menu_buttons">
			<MenuButton @click="create_playlist_pdf('full')">Content</MenuButton>
			<MenuButton @click="create_playlist_pdf('small')">Itemlist</MenuButton>
		</div>
	</PopUp>
	<!-- abort-changes -->
	<PopUp v-model:active="show_abort_changes" title="You have unsaved changes">
		<MenuButton @click="show_abort_changes = false">
			<FontAwesomeIcon :icon="['fas', 'check']" />Ok
		</MenuButton>
		<MenuButton
			@click="
				show_abort_changes = false;
				set_window_state(control_window_state_wish, true);
			"
		>
			<FontAwesomeIcon :icon="['fas', 'xmark']" />Discard
		</MenuButton>
	</PopUp>
</template>

<style scoped>
	.menubar {
		display: flex;
		margin-bottom: 0.25rem;

		background-color: var(--color-container);

		border-radius: 0.25rem;
	}

	.button {
		font-size: 1.5rem;
	}

	.seperator {
		margin-top: 0.625rem;
		margin-bottom: 0.625rem;
		margin-inline: 0.125rem;
	}

	#playlist_caption {
		flex: 1;

		font-size: 1.5rem;

		margin: 0.25rem;
		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);
	}

	#playlist_caption:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	#playlist_caption::placeholder {
		color: var(--color-text-disabled);
	}

	#playlist_caption:focus {
		font-weight: unset;

		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	#message_button {
		margin-left: auto;
	}

	.button_container {
		display: inherit;
	}
</style>

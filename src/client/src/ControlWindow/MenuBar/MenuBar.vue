<script setup lang="ts">
	import { ref, watch } from "vue";
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
	import Globals from "@/Globals";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";

	const props = defineProps<{
		playlist_path: string | undefined;
	}>();

	const playlist_caption = defineModel<string>("playlist_caption", { required: true });
	const visibility = defineModel<boolean>("visibility", { required: true });

	const emit = defineEmits<{
		navigate: [type: JCGPRecv.NavigateType, steps: number];
		set_visibility: [state: boolean];
	}>();

	function new_playlist() {
		Globals.ws?.send<JCGPRecv.NewPlaylist>({
			command: "new_playlist"
		});
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
				Globals.ws?.send<JCGPRecv.OpenPlaylist>({
					command: "load_playlist",
					playlist: e.target?.result as string
				});
			});

			reader.readAsText(input_event.files[0]);
		}
	}

	const pdf_popup = ref<boolean>(false);
	function create_playlist_pdf(type: "full" | "small") {
		Globals.ws?.send<JCGPRecv.CreatePlaylistPDF>({
			command: "create_playlist_pdf",
			type
		});

		pdf_popup.value = false;
	}

	function update_caption() {
		Globals.ws?.send<JCGPRecv.UpdatePlaylistCaption>({
			command: "update_playlist_caption",
			caption: playlist_caption.value
		});
	}

	function save_playlist() {
		if (props.playlist_path !== undefined) {
			Globals.ws?.send<JCGPRecv.SavePlaylist>({
				command: "save_playlist",
				playlist: props.playlist_path
			});
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
			@click="Globals.ControlWindowState = ControlWindowState.OpenPlaylist"
			:active="Globals.ControlWindowState === ControlWindowState.OpenPlaylist"
		>
			<FontAwesomeIcon :icon="['fas', 'folder-open']" />
		</MenuButton>
		<MenuButton
			:square="true"
			:active="Globals.ControlWindowState === ControlWindowState.SavePlaylist"
			@click="Globals.ControlWindowState = ControlWindowState.SavePlaylist"
			@dblclick="
				playlist_path !== undefined
					? save_playlist()
					: (Globals.ControlWindowState = ControlWindowState.SavePlaylist)
			"
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
			@click="Globals.ControlWindowState = ControlWindowState.Slides"
			:active="Globals.ControlWindowState === ControlWindowState.Slides"
		>
			<FontAwesomeIcon :icon="['fas', 'list']" />
		</MenuButton>
		<MenuButton
			:square="true"
			@click="Globals.ControlWindowState = ControlWindowState.Add"
			:active="
				Globals.ControlWindowState === ControlWindowState.Add ||
				Globals.ControlWindowState === ControlWindowState.NewSong ||
				Globals.ControlWindowState === ControlWindowState.NewPsalm
			"
		>
			<FontAwesomeIcon :icon="['fas', 'plus']" />
		</MenuButton>
		<MenuButton
			:square="true"
			@click="Globals.ControlWindowState = ControlWindowState.Edit"
			:active="
				Globals.ControlWindowState === ControlWindowState.Edit ||
				Globals.ControlWindowState === ControlWindowState.EditSong ||
				Globals.ControlWindowState === ControlWindowState.EditPsalm
			"
		>
			<FontAwesomeIcon :icon="['fas', 'pen']" />
		</MenuButton>
		<div v-if="Globals.ControlWindowState === ControlWindowState.Slides" class="button_container">
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
		<template v-if="Globals.ControlWindowState === ControlWindowState.Edit">
			<input
				id="playlist_caption"
				type="text"
				v-model="playlist_caption"
				placeholder="Playlist-Name"
				@change="update_caption"
			/>
		</template>
		<MenuButton
			id="message_button"
			:square="true"
			@click="Globals.ControlWindowState = ControlWindowState.Message"
			:active="Globals.ControlWindowState === ControlWindowState.Message"
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

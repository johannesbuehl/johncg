<script setup lang="ts">
	import { ref, watch } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import {
		faAlignJustify,
		faAngleLeft,
		faAngleRight,
		faBackwardStep,
		faCompress,
		faExpand,
		faEye,
		faEyeSlash,
		faFile,
		faFilePdf,
		faFloppyDisk,
		faFolderOpen,
		faForwardStep,
		faLink,
		faLinkSlash,
		faList,
		faListOl,
		faMessage,
		faPen,
		faPlus
	} from "@fortawesome/free-solid-svg-icons";

	import { ControlWindowState } from "@/Enums";
	import MenuButton from "./MenuButton.vue";
	import MenuDivider from "./MenuDivider.vue";
	import PopUp from "../PopUp.vue";
	import Globals, { ServerConnection } from "@/Globals";

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
				playlist: props.playlist_path,
				id: "",
				overwrite: true
			});
		}
	}

	const fullscreen_request = ref<boolean>(!!document.fullscreenElement);
	watch(fullscreen_request, () => {
		if (fullscreen_request.value) {
			document.documentElement.requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	});
</script>

<template>
	<div class="menubar">
		<template v-if="Globals.server_connection.value === ServerConnection.Connected">
			<MenuButton :square="true" @click="new_playlist()">
				<FontAwesomeIcon :icon="faFile" />
			</MenuButton>
			<MenuButton
				:square="true"
				@click="Globals.ControlWindowState = ControlWindowState.OpenPlaylist"
				:active="Globals.ControlWindowState === ControlWindowState.OpenPlaylist"
			>
				<FontAwesomeIcon :icon="faFolderOpen" />
			</MenuButton>
			<MenuButton
				:square="true"
				:active="Globals.ControlWindowState === ControlWindowState.SavePlaylist"
				@click="Globals.ControlWindowState = ControlWindowState.SavePlaylist"
				@dblclick="
					if (playlist_path !== undefined) {
						save_playlist();

						// backroll two states, since a double-click triggers two normal clicks
						Globals.previous_control_window_state();
						Globals.previous_control_window_state();
					}
				"
			>
				<FontAwesomeIcon :icon="faFloppyDisk" />
			</MenuButton>
			<MenuButton :square="true" @click="pdf_popup = true">
				<FontAwesomeIcon :icon="faFilePdf" />
			</MenuButton>
			<MenuDivider />
			<MenuButton
				:square="true"
				@click="Globals.ControlWindowState = ControlWindowState.Slides"
				:active="Globals.ControlWindowState === ControlWindowState.Slides"
			>
				<FontAwesomeIcon :icon="faList" />
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
				<FontAwesomeIcon :icon="faPlus" />
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
				<FontAwesomeIcon :icon="faPen" />
			</MenuButton>
			<div v-if="Globals.ControlWindowState === ControlWindowState.Slides" class="button_container">
				<MenuDivider />
				<MenuButton :square="true" @click="emit('navigate', 'item', -1)">
					<FontAwesomeIcon :icon="faBackwardStep" />
				</MenuButton>
				<MenuButton :square="true" @click="emit('navigate', 'item', 1)">
					<FontAwesomeIcon :icon="faForwardStep" />
				</MenuButton>
				<MenuButton :square="true" @click="emit('navigate', 'slide', -1)">
					<FontAwesomeIcon :icon="faAngleLeft" />
				</MenuButton>
				<MenuButton :square="true" @click="emit('navigate', 'slide', 1)">
					<FontAwesomeIcon :icon="faAngleRight" />
				</MenuButton>
				<MenuDivider />
				<MenuButton :square="true" v-model="visibility" @click="emit('set_visibility', visibility)">
					<FontAwesomeIcon :icon="visibility ? faEye : faEyeSlash" />
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
		</template>
		<div id="stick-right" />
		<MenuButton :square="true" v-model="fullscreen_request">
			<FontAwesomeIcon :icon="fullscreen_request ? faCompress : faExpand" />
		</MenuButton>
		<MenuButton :square="true" v-model="Globals.follow_all_navigates.value">
			<FontAwesomeIcon :icon="Globals.follow_all_navigates.value ? faLink : faLinkSlash" />
		</MenuButton>
		<MenuButton
			:square="true"
			@click="Globals.ControlWindowState = ControlWindowState.Message"
			:active="Globals.ControlWindowState === ControlWindowState.Message"
		>
			<FontAwesomeIcon :icon="faMessage" />
		</MenuButton>
	</div>
	<!-- PDF-save -->
	<PopUp v-model:active="pdf_popup" title="Create Playlist-PDF">
		<div id="playlist_pdf_buttons">
			<MenuButton @click="create_playlist_pdf('full')">
				<FontAwesomeIcon :icon="faAlignJustify" />Content
			</MenuButton>
			<MenuButton @click="create_playlist_pdf('small')">
				<FontAwesomeIcon :icon="faListOl" />Itemlist
			</MenuButton>
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

	.menubar .button {
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

	#stick-right {
		margin-left: auto;
	}

	.button_container {
		display: inherit;
	}

	#playlist_pdf_buttons {
		background-color: var(--color-container);

		padding: 0.5rem;
		display: flex;
		gap: 0.25rem;
	}

	#playlist_pdf_buttons > div {
		margin: 0;
	}
</style>

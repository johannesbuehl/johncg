<script setup lang="ts">
	import { ref, toRef } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	library.add(
		fas.faFile,
		fas.faFolderOpen,
		fas.faFloppyDisk,
		fas.faBackwardStep,
		fas.faForwardStep,
		fas.faAngleLeft,
		fas.faAngleRight,
		fas.faEyeSlash,
		fas.faEye,
		fas.faList,
		fas.faPlus,
		fas.faPen
	);

	import { ControlWindowState } from "@/Enums";
	import MenuButton from "./MenuButton.vue";
	import MenuDivider from "./MenuDivider.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";

	const props = defineProps<{
		ws: WebSocket;
		visibility: boolean;
	}>();

	const visibility_ref = toRef(props, "visibility");

	const emit = defineEmits<{
		navigate: [type: JGCPRecv.NavigateType, steps: number];
		set_visibility: [state: boolean];
	}>();

	const control_window_state = defineModel<ControlWindowState>();

	// reference for the file-input
	const open_playlist_input = ref<HTMLInputElement>();

	// read the content of the playlist-file and send it to the server
	function open_playlist_file(e: Event) {
		const input_event = e.target as HTMLInputElement;

		// only continue, if there is a file
		if (input_event.files !== null) {
			const reader = new FileReader();

			reader.addEventListener("load", (e) => {
				const message: JGCPRecv.OpenPlaylist = {
					command: "open_playlist",
					playlist: e.target?.result as string
				};

				props.ws.send(JSON.stringify(message));
			});

			reader.readAsText(input_event.files[0]);
		}
	}

	function save_playlist() {
		const message: JGCPRecv.SavePlaylist = {
			command: "save_playlist"
		};

		props.ws.send(JSON.stringify(message));
	}
</script>

<template>
	<div class="menubar">
		<MenuButton icon="file" />
		<!-- <MenuButton icon="folder-open" @click="open_playlist_input?.click()" /> -->
		<MenuButton
			icon="folder-open"
			@click="control_window_state = ControlWindowState.OpenPlaylist"
			:active="control_window_state === ControlWindowState.OpenPlaylist"
		/>
		<MenuButton icon="floppy-disk" @click="save_playlist" />
		<input
			type="file"
			ref="open_playlist_input"
			:accept="'.jcg'"
			@click="open_playlist_input ? (open_playlist_input.value = '') : null"
			@change="open_playlist_file"
			style="display: none"
		/>
		<MenuDivider />
		<MenuButton
			icon="fa-list"
			@click="control_window_state = ControlWindowState.Playlist"
			:active="control_window_state === ControlWindowState.Playlist"
		/>
		<MenuButton
			icon="fa-plus"
			@click="control_window_state = ControlWindowState.Add"
			:active="control_window_state === ControlWindowState.Add"
		/>
		<MenuButton
			icon="fa-pen"
			@click="control_window_state = ControlWindowState.Edit"
			:active="control_window_state === ControlWindowState.Edit"
		/>
		<MenuDivider />
		<MenuButton icon="backward-step" @click="emit('navigate', 'item', -1)" />
		<MenuButton icon="forward-step" @click="emit('navigate', 'item', 1)" />
		<MenuButton icon="angle-left" @click="emit('navigate', 'slide', -1)" />
		<MenuButton icon="angle-right" @click="emit('navigate', 'slide', 1)" />
		<MenuDivider />
		<MenuButton icon="eye-slash" @click="emit('set_visibility', false)" :active="!visibility_ref" />
		<MenuButton icon="eye" @click="emit('set_visibility', true)" :active="visibility_ref" />
	</div>
</template>

<style scoped>
	.menubar {
		display: flex;
		margin-bottom: 0.25rem;

		background-color: var(--color-container);

		border-radius: 0.25rem;
	}

	.menubar > .button {
		font-size: 1.5rem;
	}

	.menubar > .seperator {
		margin-top: 0.625rem;
		margin-bottom: 0.625rem;
	}

	.menubar > * {
		margin: 0.125rem;
	}
</style>

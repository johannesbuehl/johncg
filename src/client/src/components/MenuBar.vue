<script setup lang="ts">
	import { ref, toRef } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	library.add(
		fas.faFolderOpen,
		fas.faBackwardStep,
		fas.faForwardStep,
		fas.faAngleLeft,
		fas.faAngleRight,
		fas.faEyeSlash,
		fas.faEye,
		fas.faTriangleExclamation
	);

	import MenuButton from "./MenuButton.vue";
	import MenuDivider from "./MenuDivider.vue";

	import * as JGCPRecv from "../../../server/JGCPReceiveMessages";

	const props = defineProps<{
		ws: WebSocket;
		visibility: boolean;
	}>();

	const visibility_ref = toRef(props, "visibility");

	defineEmits<{
		navigate: [type: JGCPRecv.NavigateType, steps: number];
		set_visibility: [state: boolean];
	}>();

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
</script>

<template>
	<div class="menubar">
		<MenuButton icon="folder-open" @click="open_playlist_input?.click()" />
		<input
			type="file"
			ref="open_playlist_input"
			:accept="'.col'"
			@click="open_playlist_input ? (open_playlist_input.value = '') : null"
			@change="open_playlist_file"
			style="display: none"
		/>
		<MenuDivider />
		<MenuButton icon="backward-step" @click="$emit('navigate', 'item', -1)" />
		<MenuButton icon="forward-step" @click="$emit('navigate', 'item', 1)" />
		<MenuButton icon="angle-left" @click="$emit('navigate', 'slide', -1)" />
		<MenuButton icon="angle-right" @click="$emit('navigate', 'slide', 1)" />
		<MenuDivider />
		<MenuButton
			icon="eye-slash"
			@click="$emit('set_visibility', false)"
			:active="!visibility_ref"
		/>
		<MenuButton icon="eye" @click="$emit('set_visibility', true)" :active="visibility_ref" />
		<MenuDivider />
		<MenuButton icon="triangle-exclamation" />
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

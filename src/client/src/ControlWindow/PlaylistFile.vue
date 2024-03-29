<script setup lang="ts">
	import { onMounted } from "vue";

	import FileDialogue from "./FileDialogue/FileDialogue.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";

	const props = defineProps<{
		ws: WebSocket;
		files: JGCPSend.File[];
	}>();

	onMounted(() => {
		const message: JGCPRecv.GetPlaylistTree = {
			command: "get_item_files",
			type: "playlist"
		};

		props.ws.send(JSON.stringify(message));
	});

	function open_playlist(playlist: JGCPSend.File) {
		const message: JGCPRecv.OpenPlaylist = {
			command: "open_playlist",
			playlist: playlist.path
		};

		props.ws.send(JSON.stringify(message));
	}
</script>

<template>
	<div class="playlist_file_wrapper">
		<div id="file_structure_container">
			<FileDialogue :root="true" :files="files" @choose="open_playlist" />
		</div>
	</div>
</template>

<style scoped>
	.playlist_file_wrapper {
		display: flex;
		flex-direction: column;

		flex: 1;

		gap: 0.25rem;
	}

	.playlist_file_wrapper > div {
		border-radius: 0.25rem;

		background-color: var(--color-container);
	}

	#file_structure_container {
		flex: 1;
	}
</style>

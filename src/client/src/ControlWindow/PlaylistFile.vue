<script setup lang="ts">
	import { onMounted } from "vue";

	import FileItem from "./FileDialogue/FileItem.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { File } from "@server/search_part";

	const props = defineProps<{
		ws: WebSocket;
		files: File[];
	}>();

	onMounted(() => {
		const message: JGCPRecv.GetItemFiles = {
			command: "get_item_files",
			type: "playlist"
		};

		props.ws.send(JSON.stringify(message));
	});

	function open_playlist(playlist: File) {
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
			<FileItem :root="true" :files="files" @choose="open_playlist" />
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

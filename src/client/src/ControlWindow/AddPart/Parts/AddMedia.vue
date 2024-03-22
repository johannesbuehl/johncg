<script setup lang="ts">
	import { onMounted } from "vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { MediaProps } from "@server/PlaylistItems/Media";
	import type { File } from "@server/JGCPSendMessages";
	import FileDialogue from "@/ControlWindow/FileDialogue/FileDialogue.vue";

	const props = defineProps<{
		media: File[];
		ws: WebSocket;
	}>();

	// const emit = defineEmits<{

	// }>();

	onMounted(() => {
		const message: JGCPRecv.GetMediaTree = {
			command: "get_media_tree"
		};

		props.ws.send(JSON.stringify(message));
	});

	function add_media(file: File, type: "dir" | "file") {
		if (type === "file") {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "media",
					caption: file.name,
					color: "#008800",
					media: file.path,
					loop: false
				}
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	function on_clone(file: File): MediaProps {
		return {
			type: "media",
			caption: file.name,
			color: "#008800",
			media: file.path,
			loop: false
		};
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div class="file_view">
			<FileDialogue :files="media" :root="true" :clone_callback="on_clone" @selection="add_media" />
		</div>
	</div>
</template>

<style scoped>
	.add_media_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: inherit;
	}

	.file_view {
		background-color: var(--color-container);

		overflow: auto;

		flex: 1;

		border-radius: 0.25rem;
	}
</style>

<script setup lang="ts">
	import { onMounted } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import FileDialogue, { type File } from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import type { MediaProps } from "@server/PlaylistItems/Media";

	library.add(fas.faArrowsRotate, fas.faPlus);

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

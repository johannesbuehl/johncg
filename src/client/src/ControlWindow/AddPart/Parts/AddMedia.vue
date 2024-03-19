<script setup lang="ts">
	import { onMounted, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import FileDialogue, { type Files } from "@/ControlWindow/FileDialogue/FileDialogue.vue";

	library.add(fas.faArrowsRotate, fas.faPlus);

	const props = defineProps<{
		media: Files;
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

	function add_media(file: string, type: "dir" | "file") {
		if (type === "file") {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "media",
					caption: file,
					color: "#008800",
					media: file,
					loop: false
				}
			};

			props.ws.send(JSON.stringify(message));

			console.debug(file);
		}
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div class="file_view">
			<FileDialogue
				v-for="[name, file] in Object.entries(media)"
				:name="name"
				:files="file"
				@selection="add_media"
			/>
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

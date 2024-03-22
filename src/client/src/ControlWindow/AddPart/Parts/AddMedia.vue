<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { MediaProps } from "@server/PlaylistItems/Media";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import FileDialogue from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	library.add(fas.faPlus, fas.faRepeat);
	const props = defineProps<{
		media: JGCPSend.File[];
		ws: WebSocket;
	}>();

	const selection = defineModel<JGCPSend.File>({});
	const loop = ref<boolean>(false);

	onMounted(() => {
		const message: JGCPRecv.GetMediaTree = {
			command: "get_media_tree"
		};

		props.ws.send(JSON.stringify(message));
	});

	function add_media(file?: JGCPSend.File, type?: "dir" | "file") {
		if (type === "file" && file !== undefined) {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "media",
					caption: file.name,
					color: "#008800",
					media: file.path,
					loop: loop.value
				}
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	function on_clone(file: JGCPSend.File): MediaProps {
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
			<FileDialogue
				:files="media"
				:root="true"
				:clone_callback="on_clone"
				v-model="selection"
				@choose="add_media"
			/>
		</div>
		<div class="button_wrapper">
			<MenuButton icon="repeat" text="Loop" @click="loop = !loop" :active="loop" />
			<MenuButton class="" icon="plus" text="" @click="add_media(selection, 'file')" />
		</div>
	</div>
</template>

<style scoped>
	.add_media_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: inherit;

		background-color: var(--color-container);
	}

	.file_view {
		overflow: auto;

		flex: 1;

		border-radius: 0.25rem;
	}

	.button_wrapper {
		display: flex;
	}

	.button:not(:first-child) {
		flex: 1;
	}
</style>

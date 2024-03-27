<script setup lang="ts">
	import { onMounted, ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { MediaProps } from "@server/PlaylistItems/Media";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import FileDialogue from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import type { PDFProps } from "@server/PlaylistItems/PDF";

	library.add(fas.faPlus, fas.faRepeat);
	const props = defineProps<{
		files: JGCPSend.File[];
		ws: WebSocket;
	}>();

	const selection = defineModel<JGCPSend.File>({});
	const loop = ref<boolean>(false);

	onMounted(() => {
		const message: JGCPRecv.GetPDFTree = {
			command: "get_item_tree",
			type: "pdf"
		};

		props.ws.send(JSON.stringify(message));
	});

	function create_props(file: JGCPSend.File): PDFProps {
		return {
			type: "pdf",
			caption: file.name,
			color: "#ffffff",
			file: file.path
		};
	}

	function add_media(file?: JGCPSend.File, type?: "dir" | "file") {
		if (type === "file" && file !== undefined) {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: create_props(file),
				set_active: true
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	function on_clone(file: JGCPSend.File): PDFProps {
		return create_props(file);
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div class="file_view">
			<FileDialogue
				:files="files"
				:root="true"
				:clone_callback="on_clone"
				v-model="selection"
				@choose="add_media"
			/>
		</div>
		<MenuButton icon="plus" text="" @click="add_media(selection, 'file')" />
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
</style>

<script setup lang="ts">
	import { onMounted } from "vue";

	import JSONEditor from "@/ControlWindow/JSONEditor.vue";
	import FileDialogue from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { File } from "@server/JGCPSendMessages";
	import type { TemplateProps } from "@server/PlaylistItems/Template";

	const props = defineProps<{
		files: JGCPSend.File[];
		ws: WebSocket;
	}>();

	const selection = defineModel<File>("selection");
	const template_data = defineModel<object>({ default: {} });

	onMounted(() => {
		const message: JGCPRecv.GetItemFiles = {
			command: "get_item_files",
			type: "template"
		};

		props.ws.send(JSON.stringify(message));
	});

	function add_template(file: File | undefined, type: "dir" | "file") {
		if (file && type === "file") {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "template",
					caption: file.name,
					color: "#008800",
					template: {
						template: file.path,
						data: template_data.value
					}
				},
				set_active: true
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	function on_clone(file: File): TemplateProps {
		return {
			type: "template",
			caption: file.name,
			color: "#008800",
			template: {
				template: file.path,
				data: template_data.value
			}
		};
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div class="file_view">
			<FileDialogue
				v-model="selection"
				:files="files"
				:root="true"
				:clone_callback="on_clone"
				@choose="add_template"
			/>
			<MenuButton
				icon="plus"
				text="Add Template"
				@click="add_template(selection, selection?.children ? 'dir' : 'file')"
			/>
		</div>
		<JSONEditor v-model="template_data" />
	</div>
</template>

<style scoped>
	.add_media_wrapper {
		flex: 1;

		display: grid;
		grid-template-columns: 1fr 1fr;

		gap: inherit;
	}

	.file_view {
		background-color: var(--color-container);

		overflow: auto;

		display: flex;
		flex-direction: column;

		border-radius: 0.25rem;
	}

	.data_editor {
		background-color: var(--color-container);

		display: flex;
		flex-direction: column;

		border-radius: 0.25rem;
	}
</style>

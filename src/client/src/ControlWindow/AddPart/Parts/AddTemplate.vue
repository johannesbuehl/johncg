<script setup lang="ts">
	import { onMounted, watch } from "vue";
	import type { JSONContent } from "vanilla-jsoneditor";

	import JSONEditor from "@/ControlWindow/JSONEditor.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { File } from "@server/JGCPSendMessages";
	import type { TemplateProps } from "@server/PlaylistItems/Template";
	import FileDialogue from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	const props = defineProps<{
		templates: JGCPSend.File[];
		ws: WebSocket;
	}>();

	const selection = defineModel<File>("selection");
	const template_data = defineModel<object>({ default: {} });

	onMounted(() => {
		const message: JGCPRecv.GetTemplateTree = {
			command: "get_template_tree"
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
				}
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
				:files="templates"
				:root="true"
				:clone_callback="on_clone"
				@choose="add_template"
			/>
		</div>
		<div class="data_editor">
			<JSONEditor v-model="template_data" />
			<MenuButton
				class=""
				icon="plus"
				text=""
				@click="add_template(selection, selection?.children ? 'dir' : 'file')"
			/>
		</div>
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

		border-radius: 0.25rem;
	}

	.data_editor {
		background-color: var(--color-container);

		display: flex;
		flex-direction: column;

		border-radius: 0.25rem;
	}
</style>

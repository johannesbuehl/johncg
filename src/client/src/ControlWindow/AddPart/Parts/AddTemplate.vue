<script setup lang="ts">
	import { onMounted } from "vue";
	import type { JSONContent } from "vanilla-jsoneditor";

	import JSONEditor from "@/ControlWindow/JSONEditor.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { File } from "@server/JGCPSendMessages";
	import type { TemplateProps } from "@server/PlaylistItems/Template";
	import FileDialogue from "@/ControlWindow/FileDialogue/FileDialogue.vue";

	const props = defineProps<{
		templates: JGCPSend.File[];
		ws: WebSocket;
	}>();

	const template_data = defineModel<JSONContent>({ default: { json: {} } });

	onMounted(() => {
		const message: JGCPRecv.GetTemplateTree = {
			command: "get_template_tree"
		};

		props.ws.send(JSON.stringify(message));
	});

	function add_template(file: File, type: "dir" | "file") {
		if (type === "file") {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "template",
					caption: file.name,
					color: "#008800",
					template: {
						template: file.path,
						data: template_data.value.json as object
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
				data: template_data
			}
		};
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div class="file_view">
			<FileDialogue
				:files="templates"
				:root="true"
				:clone_callback="on_clone"
				@selection="add_template"
			/>
		</div>
		<div class="data_editor">
			<JSONEditor v-model="template_data" />
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

		border-radius: 0.25rem;
	}
</style>

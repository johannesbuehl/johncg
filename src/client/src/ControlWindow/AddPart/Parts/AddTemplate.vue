<script setup lang="ts">
	import { onMounted, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import FileDialogue, { type Files } from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import JSONEditor from "@/ControlWindow/JSONEditor.vue";
	import type { Content, JSONContent } from "vanilla-jsoneditor";

	library.add(fas.faArrowsRotate, fas.faPlus);

	const props = defineProps<{
		templates: Files;
		ws: WebSocket;
	}>();

	const template_data = defineModel<JSONContent>({ default: { json: {} } });

	onMounted(() => {
		const message: JGCPRecv.GetTemplateTree = {
			command: "get_template_tree"
		};

		props.ws.send(JSON.stringify(message));
	});

	function add_template(file: string, type: "dir" | "file") {
		if (type === "file") {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "template",
					caption: file,
					color: "#008800",
					template: {
						template: file,
						data: template_data.value.json as object
					}
				}
			};

			props.ws.send(JSON.stringify(message));
		}
	}
</script>

<template>
	<div class="add_media_wrapper">
		<div class="file_view">
			<FileDialogue
				v-for="[name, file] in Object.entries(templates)"
				:name="name"
				:files="file"
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

<script setup lang="ts">
	import { onMounted, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { SongResult } from "@server/search_part";
	import FileDialogue, { type Files } from "@/ControlWindow/FileDialogue/FileDialogue.vue";

	library.add(fas.faArrowsRotate, fas.faPlus);

	const props = defineProps<{
		templates: Files;
		ws: WebSocket;
	}>();

	const search_results = defineModel<JGCPSend.SongSearchResults>("search_results");
	const selection = defineModel<SongResult>("selection");

	watch(
		() => search_results.value?.result,
		(new_search_result) => {
			if (new_search_result !== undefined) {
				selection.value = new_search_result[0];
			}
		}
	);

	onMounted(() => {
		const message: JGCPRecv.GetTemplateTree = {
			command: "get_template_tree"
		};

		props.ws.send(JSON.stringify(message));
	});

	function add_media(file: string, type: "dir" | "file") {
		if (type === "file") {
			const message: JGCPRecv.AddItem = {
				command: "add_item",
				props: {
					type: "template",
					caption: file,
					color: "#008800",
					template: {
						template: file
					}
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
				v-for="[name, file] in Object.entries(templates)"
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

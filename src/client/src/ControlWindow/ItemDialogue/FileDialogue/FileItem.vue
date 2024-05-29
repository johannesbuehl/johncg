<script lang="ts">
	export function sort_files(files?: File[]): File[] | undefined {
		return files?.sort((a, b) => {
			// check for different types (dir vs file)
			if (typeof a.children !== typeof b.children) {
				return a.children === undefined ? 1 : -1;
			}

			if (a.name === b.name) {
				return 0;
			} else {
				const sort_array = [a.name, b.name].sort();

				if (sort_array[0] === a.name) {
					return -1;
				} else {
					return 1;
				}
			}
		});
	}
</script>

<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { ref, watch } from "vue";
	import Draggable from "vuedraggable";

	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type { File } from "@server/search_part";

	library.add(fas.faMinus);

	const props = defineProps<{
		file?: File;
		root?: boolean;
		expand?: boolean;
		files?: File[];
		clone_callback?: (arg: JGCPSend.ItemFiles["files"][0]) => ItemProps;
	}>();

	const files_draggable = ref<HTMLDivElement>();

	const selection = defineModel<File>();

	const emit = defineEmits<{
		choose: [file: File | undefined, type: "dir" | "file"];
	}>();

	function on_enter(event: Event) {
		if (typeof props.files === "object") {
			emit("choose", props.file, "dir");
		} else {
			selection.value = props.file;
		}

		event.stopPropagation();
		event.preventDefault();
	}
</script>

<template>
	<div
		class="file_item_wrapper"
		:class="{ indent: !root, root }"
		:tabindex="root ? undefined : 0"
		@keydown.enter="on_enter"
		@click="
			if (file !== undefined) {
				selection = file;
			}
			$event.stopPropagation();
			$event.preventDefault();
		"
		@dblclick="
			emit('choose', file, files === undefined ? 'file' : 'dir');
			$event.stopPropagation();
			$event.preventDefault();
		"
	>
		<div class="file_item" ref="files_draggable">
			<span
				v-if="!root"
				class="file_content"
				:class="{ selectable: typeof files !== 'object', active: selection === file }"
			>
				{{ file?.name }}
			</span>
			<Draggable
				v-if="(files?.length ?? 0 > 0) && root"
				:list="sort_files(files)"
				:group="{
					name: 'playlist',
					pull: clone_callback !== undefined ? 'clone' : false,
					put: false
				}"
				item-key="path"
				tag="div"
				:clone="clone_callback"
				:sort="false"
			>
				<template #item="{ element }">
					<FileItem
						v-show="!element.hidden"
						:file="element"
						:expand="expand"
						:files="element.children"
						:clone_callback="clone_callback"
						v-model="selection"
						@choose="(file, type) => emit('choose', file, type)"
					/>
				</template>
			</Draggable>
		</div>
	</div>
</template>

<style scoped>
	.file_item_wrapper {
		flex: 1;
		display: flex;

		overflow: visible;

		align-items: baseline;
	}

	.root {
		overflow: auto;
	}

	.file_item_wrapper.indent {
		margin-left: 0.25rem;
	}

	.file_item {
		display: flex;
		flex-direction: column;
	}

	.file_item_wrapper:not(.root) > .file_item {
		flex: 1;
	}

	.file_item > div {
		display: flex;
		flex-direction: column;

		gap: 0.25rem;
		padding: 0.25rem;
	}

	.file_content {
		justify-content: center;

		padding: 0.25rem;

		cursor: pointer;
	}

	.file_content.selectable {
		font-weight: lighter;
	}

	.file_item_wrapper:has(> .file_item > .file_content.selectable) {
		font-weight: lighter;

		background-color: var(--color-item);

		border-radius: 0.25rem;
	}

	.file_item_wrapper:has(> .file_item > .file_content.selectable:hover) {
		background-color: var(--color-item-hover);
	}

	.file_item_wrapper:has(> .file_item > .file_content.selectable.active) {
		background-color: var(--color-active);
	}

	.file_item_wrapper:has(> .file_item > .file_content.selectable.active:hover) {
		background-color: var(--color-active-hover);
	}
</style>

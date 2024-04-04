<script lang="ts">
	export function sort_files(files?: File[]): File[] | undefined {
		return files?.sort((a, b) => {
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
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { ref, watch } from "vue";
	import Draggable from "vuedraggable";

	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { File } from "@server/search_part";

	library.add(fas.faPlus, fas.faMinus);

	const props = defineProps<{
		file?: JGCPSend.ItemFiles["files"][0];
		root?: boolean;
		expand?: boolean;
		files?: JGCPSend.ItemFiles["files"];
		clone_callback?: (arg: JGCPSend.ItemFiles["files"][0]) => ItemProps;
	}>();

	const expanded = ref<boolean>(props.expand ?? false);
	const selection = defineModel<File>();

	watch(
		() => props.expand,
		(expand) => {
			if (expand !== undefined) {
				expanded.value = expand;
			}
		}
	);

	const emit = defineEmits<{
		choose: [file: File, type: "dir" | "file"];
	}>();

	function on_choose(
		file: File,
		type: "dir" | "file" = typeof props.files === "object" ? "dir" : "file"
	) {
		if (type === "dir") {
			expanded.value = !expanded.value;
		} else {
			emit("choose", file, "file");
		}
	}
</script>

<template>
	<div class="file_item_wrapper" :class="{ indent: !root }">
		<div v-if="!root" class="button" @click="expanded = !expanded">
			<FontAwesomeIcon
				v-if="typeof files === 'object'"
				:icon="['fas', expanded ? 'minus' : 'plus']"
			/>
		</div>
		<div class="file_item">
			<span
				v-if="!root"
				class="file_content"
				:class="{ displayable: typeof files !== 'object', active: selection === file }"
				@click="typeof files !== 'object' && file !== undefined ? (selection = file) : ''"
				@dblclick="file ? on_choose(file) : undefined"
			>
				{{ file?.name }}
			</span>
			<Draggable
				:list="sort_files(files?.filter((ele) => typeof ele.children === 'object'))"
				:group="{ name: 'playlist', pull: 'clone', put: false }"
				item-key="path"
				tag="span"
				:clone="clone_callback"
				:sort="false"
			>
				<template #item="{ element }">
					<FileItem
						v-if="typeof files === 'object'"
						v-show="expanded || root"
						:file="element"
						:expand="expand"
						:files="element.children"
						:clone_callback="clone_callback"
						v-model="selection"
						@choose="on_choose"
					/>
				</template>
			</Draggable>
			<Draggable
				:list="sort_files(files?.filter((ele) => typeof ele.children !== 'object'))"
				:group="{ name: 'playlist', pull: 'clone', put: false }"
				item-key="path"
				tag="span"
				:clone="clone_callback"
				:sort="false"
			>
				<template #item="{ element }">
					<FileItem
						v-if="typeof files === 'object'"
						v-show="expanded || root"
						:file="element"
						:files="element.children"
						:clone_callback="clone_callback"
						v-model="selection"
						@choose="on_choose"
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

		align-items: baseline;

		overflow: auto;
	}

	.file_item_wrapper.indent {
		padding-left: 0.25rem;
	}

	.file_item {
		display: flex;
		flex-direction: column;

		gap: 0.125rem;
	}

	.file_content {
		display: inline-block;

		padding: 0.25rem;
	}

	.file_content.displayable {
		cursor: pointer;

		font-weight: lighter;

		background-color: var(--color-item);

		border-radius: 0.25rem;
	}

	.file_content.displayable:hover {
		background-color: var(--color-item-hover);
	}

	.file_content.displayable.active {
		background-color: var(--color-active);
	}

	.file_content.displayable.active:hover {
		background-color: var(--color-active-hover);
	}
</style>

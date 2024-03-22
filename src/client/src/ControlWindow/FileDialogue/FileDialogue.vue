<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { ref } from "vue";
	import Draggable from "vuedraggable";

	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import * as JGCPSend from "@server/JGCPSendMessages";

	library.add(fas.faPlus, fas.faMinus);

	const props = defineProps<{
		file?: JGCPSend.File;
		root?: boolean;
		files?: JGCPSend.File[];
		clone_callback?: (arg: JGCPSend.File) => ItemProps;
	}>();

	const expanded = ref<boolean>(false);

	const emit = defineEmits<{
		selection: [file: JGCPSend.File, type: "dir" | "file"];
	}>();

	function on_selection(
		file: JGCPSend.File,
		type: "dir" | "file" = typeof props.files === "object" ? "dir" : "file"
	) {
		emit("selection", file, type);
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
				:class="{ selectable: typeof files !== 'object' }"
				@dblclick="file ? on_selection(file) : undefined"
			>
				{{ file?.name }}
			</span>

			<Draggable
				:list="files"
				:group="{ name: 'playlist', pull: 'clone', put: 'false' }"
				item-key="path"
				tag="span"
				:clone="clone_callback"
				:sort="false"
			>
				<!-- v-for="[name, file] in Object.entries(media)" -->
				<template #item="{ element }">
					<FileDialogue
						v-if="typeof files === 'object'"
						v-show="expanded || root"
						:file="element"
						:files="element.children"
						:clone_callback="clone_callback"
						@selection="on_selection"
					/>
				</template>
			</Draggable>
		</div>
	</div>
</template>

<style scoped>
	.file_item_wrapper {
		display: flex;

		flex: 1;

		align-items: baseline;
	}

	.file_item_wrapper.indent {
		padding-left: 0.25rem;
	}

	.file_item {
		display: flex;
		flex-direction: column;

		gap: 0.125rem;
	}

	.button {
		border-radius: 0.25rem;

		cursor: pointer;

		margin-right: 0.25rem;
	}

	.button:hover {
		background-color: var(--color-item-hover);
	}

	.file_content {
		display: inline-block;

		padding: 0.25rem;
	}

	.file_content.selectable {
		cursor: pointer;

		font-weight: lighter;

		background-color: var(--color-item);

		border-radius: 0.25rem;
	}

	.file_content.selectable:hover {
		background-color: var(--color-item-hover);
	}
</style>
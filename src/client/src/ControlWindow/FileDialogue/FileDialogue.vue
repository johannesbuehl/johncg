<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { ref } from "vue";

	library.add(fas.faPlus, fas.faMinus);

	export type Files = { [key: string]: Files } | string;

	const props = defineProps<{
		name: string;
		files: Files;
	}>();

	const expanded = ref<boolean>(false);

	const emit = defineEmits<{
		selection: [file: string, type: "dir" | "file"];
	}>();

	function on_selection(
		file?: string,
		type: "dir" | "file" = typeof props.files === "object" ? "dir" : "file"
	) {
		if (file === undefined) {
			file = props.name;
		} else {
			file = props.name + "/" + file;
		}

		emit("selection", file, type);
	}
</script>

<template>
	<div class="file_item_wrapper">
		<span class="button" @click="expanded = !expanded">
			<FontAwesomeIcon
				v-if="typeof files === 'object'"
				:icon="['fas', expanded ? 'minus' : 'plus']"
			/>
		</span>
		<div class="file_item">
			<div
				class="file_content"
				:class="{ selectable: typeof files !== 'object' }"
				@dblclick="on_selection()"
			>
				{{ name }}
			</div>
			<FileDialogue
				v-if="typeof files === 'object'"
				v-show="expanded"
				v-for="[caption, file] in Object.entries(files)"
				:name="caption"
				:files="file"
				@selection="on_selection"
			/>
		</div>
	</div>
</template>

<style scoped>
	.file_item_wrapper {
		padding-left: 1rem;

		display: flex;

		flex: 1;

		align-items: baseline;
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

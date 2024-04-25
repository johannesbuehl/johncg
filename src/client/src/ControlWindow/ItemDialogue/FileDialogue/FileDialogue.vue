<script lang="ts">
	export interface SearchInputDefinition<K> {
		id: K;
		placeholder: string;
		value: string;
	}

	export type SearchInputDefinitions<K> = SearchInputDefinition<K>[];
</script>

<script setup lang="ts">
	import { ref, useSlots, watch, type VNodeRef } from "vue";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import FileItem from "./FileItem.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type { File } from "@server/search_part";

	library.add(fas.faArrowsRotate);

	const props = defineProps<{
		name: string;
		files?: JGCPSend.ItemFiles["files"];
		clone_callback?: (arg: JGCPSend.ItemFiles["files"][0]) => ItemProps;
	}>();

	const emit = defineEmits<{
		choose: [file: File, type: "dir" | "file"];
		refresh_files: [];
		search: [];
	}>();

	const slots = useSlots();

	const search_strings = defineModel<SearchInputDefinition<unknown>[]>("search_strings", {
		required: true
	});

	const selection = defineModel<File | undefined>("selection", { required: true });

	const first_input_ref = ref<HTMLInputElement[]>([]);
	function create_first_input_ref(element: HTMLInputElement, index: number): VNodeRef | undefined {
		if (element !== null && index === 0) {
			first_input_ref.value.push(element);
			return first_input_ref;
		}
	}

	watch(
		() => first_input_ref.value,
		(first_input_ref) => {
			if (first_input_ref.length > 0) {
				first_input_ref[first_input_ref.length - 1].focus();
			}
		},
		{ deep: true }
	);
</script>

<template>
	<div id="element_wrapper">
		<div id="file_dialogue_wrapper">
			<div id="search_wrapper">
				<div id="search_input_wrapper">
					<input
						v-for="({ placeholder }, index) in search_strings"
						class="search_box"
						v-model="search_strings[index].value"
						:ref="create_first_input_ref($el, index)"
						:placeholder="placeholder"
						@input="emit('search')"
					/>
				</div>
				<MenuButton :square="true" @click="emit('refresh_files')">
					<FontAwesomeIcon :icon="['fas', 'arrows-rotate']" />
				</MenuButton>
			</div>
			<div id="selection_wrapper">
				<div class="file_view">
					<div class="header">{{ name }}</div>
					<FileItem
						v-model="selection"
						:files="files"
						:clone_callback="clone_callback"
						:root="true"
						:expand="
							search_strings.reduce((partial_sum, ele) => partial_sum + ele.value.length, 0) > 0
						"
						@choose="(f, t) => (f !== undefined ? emit('choose', f, t) : undefined)"
					/>
					<div class="button_wrapper" v-if="!!slots.buttons">
						<slot name="buttons"></slot>
					</div>
				</div>
			</div>
		</div>
		<slot name="edit"></slot>
	</div>
</template>

<style scoped>
	#element_wrapper {
		flex: 1;
		display: flex;
		gap: 0.25rem;
	}

	#file_dialogue_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: inherit;
	}

	#search_wrapper {
		display: flex;
		padding: 1rem;

		border-radius: 0.25rem;

		column-gap: 1rem;

		background-color: var(--color-container);
	}

	#search_input_wrapper {
		flex: 1;
		display: flex;

		gap: inherit;
	}

	.search_input_wrapper > input:not(:first-child) {
		flex: 1;
	}

	.search_input_wrapper > input:first-child {
		width: 8rem;
	}

	.search_box {
		font-size: 1.5rem;

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);

		flex: 1;
	}

	.search_box:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	.search_box::placeholder {
		color: var(--color-text-disabled);
	}

	.search_box:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	#selection_wrapper {
		display: flex;

		flex: 1;

		gap: 0.25rem;
	}

	.header {
		text-align: center;

		background-color: var(--color-item);

		border-radius: 0.25rem;

		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
		padding-left: 0.75rem;
	}

	.file_view {
		display: flex;
		flex-direction: column;
		flex: 1;

		gap: 0.25rem;

		border-radius: 0.25rem;

		background-color: var(--color-container);
	}

	.button_wrapper {
		display: flex;
	}
</style>

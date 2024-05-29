<script lang="ts">
	export interface SearchInputDefinition<K> {
		id: K;
		placeholder: string;
		value: string;
	}

	export type SearchInputDefinitions<K> = SearchInputDefinition<K>[];
</script>

<script setup lang="ts">
	import { onMounted, reactive, ref, useSlots, watch, type VNodeRef } from "vue";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import FileItem from "./FileItem.vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type { File } from "@server/search_part";

	library.add(fas.faHouse, fas.faChevronRight, fas.faArrowsRotate, fas.faFileCirclePlus);

	const props = defineProps<{
		name: string;
		select_dirs?: boolean;
		files?: JGCPSend.ItemFiles["files"];
		clone_callback?: (arg: JGCPSend.ItemFiles["files"][0]) => ItemProps;
		new_button?: boolean;
	}>();

	const emit = defineEmits<{
		new_file: [];
		choose: [file: File, type: "dir" | "file"];
		refresh_files: [];
		search: [];
	}>();

	const slots = useSlots();

	const search_strings = defineModel<SearchInputDefinition<unknown>[]>("search_strings", {
		required: true
	});

	const rotate_button = ref<boolean>(false);
	const directory_stack = ref<File[]>([]);

	const selection = defineModel<File | undefined>("selection", { required: true });

	const first_input_ref = ref<HTMLInputElement[]>([]);
	function create_first_input_ref(element: HTMLInputElement, index: number): VNodeRef | undefined {
		if (element !== null && index === 0) {
			first_input_ref.value.push(element);
			return first_input_ref;
		}
	}

	onMounted(() => {
		emit("refresh_files");
	});

	watch(
		() => first_input_ref.value,
		(first_input_ref) => {
			if (first_input_ref.length > 0) {
				first_input_ref[first_input_ref.length - 1].focus();
			}
		},
		{ deep: true }
	);

	function on_choose(file: File | undefined, type: "file" | "dir") {
		if (file !== undefined) {
			if (type === "dir") {
				directory_stack.value.push(file);
			}
		}

		file !== undefined ? emit("choose", file, type) : undefined;
	}
</script>

<template>
	<div id="element_wrapper">
		<div id="file_dialogue_wrapper">
			<div id="search_wrapper">
				<MenuButton v-if="new_button" :square="true" @click="emit('new_file')">
					<FontAwesomeIcon :icon="['fas', 'file-circle-plus']" />
				</MenuButton>
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
				<MenuButton
					:class="{ rotate_button: rotate_button }"
					:square="true"
					@click="
						emit('refresh_files');
						rotate_button = true;
					"
					@animationend="rotate_button = false"
				>
					<FontAwesomeIcon :icon="['fas', 'arrows-rotate']" />
				</MenuButton>
			</div>
			<div id="selection_wrapper">
				<div class="file_view">
					<div class="header">{{ name }}</div>
					<div id="directory_stack">
						<MenuButton :square="true" @click="directory_stack = []">
							<FontAwesomeIcon :icon="['fas', 'house']" />
						</MenuButton>
						<template v-for="(dir, dir_index) of directory_stack">
							<FontAwesomeIcon :icon="['fas', 'chevron-right']" />
							<div
								class="directory_stack_dir"
								@click="
									directory_stack.splice(dir_index + 1, directory_stack.length);
									$event.stopPropagation();
									$event.preventDefault();
								"
							>
								{{ dir.name }}
							</div>
						</template>
					</div>
					<FileItem
						v-model="selection"
						:select_dirs="true"
						:files="
							directory_stack.length > 0
								? directory_stack[directory_stack.length - 1].children
								: files
						"
						:clone_callback="clone_callback"
						:root="true"
						@choose="on_choose"
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

	#directory_stack {
		display: flex;

		align-items: center;

		gap: 0.25rem;
	}

	.directory_stack_dir {
		cursor: pointer;

		padding: 0.5rem;

		border-radius: 0.25rem;
		background-color: var(--color-item);
	}

	.directory_stack_dir:hover {
		background-color: var(--color-item-hover);
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

	.rotate_button > svg {
		animation: 0.5s rotate;
	}

	@keyframes rotate {
		from {
			transform: rotate(0);
		}

		to {
			transform: rotate(180deg);
		}
	}
</style>

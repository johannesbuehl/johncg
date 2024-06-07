<script lang="ts">
	export interface SearchInputDefinition<K> {
		id: K;
		placeholder: string;
		value: string;
		size?: number;
	}

	export type SearchInputDefinitions<K> = SearchInputDefinition<K>[];

	export function sort_dirs<K extends keyof ItemFileType>(
		files: ItemFileMapped<K>[]
	): Directory<K>[] {
		return files
			?.filter((fil) => fil.children !== undefined)
			.sort((a, b) => {
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
			}) as Directory<K>[];
	}

	export function sort_files<K extends keyof ItemFileType>(
		files: ItemFileMapped<K>[]
	): ItemFileMapped<K>[] {
		return files
			?.filter((fil) => fil.children === undefined)
			.sort((a, b) => {
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

<script setup lang="ts" generic="T extends keyof ItemFileType">
	import { onMounted, reactive, ref, useSlots, watch, type VNodeRef } from "vue";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import Draggable from "vuedraggable";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type { Directory, ItemFileMapped, ItemFileType } from "@server/search_part";

	library.add(
		fas.faHouse,
		fas.faChevronRight,
		fas.faArrowsRotate,
		fas.faFileCirclePlus,
		fas.faXmark
	);

	const props = defineProps<{
		name: string;
		select_dirs?: boolean;
		files?: JGCPSend.ItemFiles<keyof ItemFileType>["files"];
		thumbnails?: Record<string, string>;
		clone_callback?: (arg: JGCPSend.ItemFiles<keyof ItemFileType>["files"][0]) => ItemProps;
		new_button?: boolean;
		search_disabled?: boolean;
	}>();

	const emit = defineEmits<{
		new_file: [];
		choose: [file: ItemFileMapped<T> | undefined];
		refresh_files: [];
		search: [];
	}>();

	const slots = useSlots();

	const search_strings = defineModel<SearchInputDefinition<unknown>[]>("search_strings", {
		required: true
	});

	const rotate_button = ref<boolean>(false);
	const directory_stack = defineModel<ItemFileMapped<T>[]>("directory_stack", {
		default: () => reactive([])
	});

	const selection = defineModel<ItemFileMapped<T> | undefined>("selection", { required: true });

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

	function get_current_files(): ItemFileMapped<T>[] {
		const files =
			directory_stack.value[directory_stack.value.length - 1]?.children !== undefined
				? directory_stack.value[directory_stack.value.length - 1].children
				: props.files;

		return files as ItemFileMapped<T>[];
	}

	function are_valid_thumbnails(files: ItemFileMapped<T>[] = get_current_files()): boolean {
		if (props.thumbnails !== undefined && Object.values(props.thumbnails).length > 0) {
			return Object.entries(props.thumbnails).every(([path, thumbnail]) => {
				return files.some((ff) => {
					return ff.path === path;
				});
			});
		} else {
			return false;
		}
	}

	function on_choose(file: ItemFileMapped<T>) {
		if (file.children !== undefined) {
			directory_stack.value.push(file);
		}

		emit("choose", file);
	}
</script>

<template>
	<div id="element_wrapper">
		<div id="file_dialogue_wrapper">
			<div class="header">{{ name }}</div>
			<div class="content">
				<div id="search_wrapper" v-if="!search_disabled">
					<MenuButton v-if="new_button" :square="true" @click="emit('new_file')">
						<FontAwesomeIcon :icon="['fas', 'file-circle-plus']" />
					</MenuButton>
					<div id="search_input_wrapper">
						<div
							class="search_input_container"
							v-for="({ placeholder, size }, index) in search_strings"
						>
							<input
								class="search_box"
								v-model="search_strings[index].value"
								:ref="create_first_input_ref($el, index)"
								:placeholder="placeholder"
								:size="size ?? undefined"
								@input="emit('search')"
							/>
							<span class="button_clear_search" @click="search_strings[index].value = ''">
								<FontAwesomeIcon :icon="['fas', 'xmark']" />
							</span>
						</div>
					</div>
				</div>
				<div id="directory_stack">
					<MenuButton
						:square="true"
						@click="
							directory_stack = reactive([]);
							$emit(
								'choose',
								directory_stack.length > 0 ? directory_stack[directory_stack.length - 1] : undefined
							);
							$event.stopPropagation();
							$event.preventDefault();
						"
					>
						<FontAwesomeIcon :icon="['fas', 'house']" />
					</MenuButton>
					<template v-for="(dir, dir_index) of directory_stack">
						<FontAwesomeIcon :icon="['fas', 'chevron-right']" />
						<div
							class="directory_stack_dir"
							@click="
								directory_stack.splice(dir_index + 1, directory_stack.length);
								$emit(
									'choose',
									directory_stack.length > 0
										? directory_stack[directory_stack.length - 1]
										: undefined
								);
								$event.stopPropagation();
								$event.preventDefault();
							"
						>
							{{ dir.name }}
						</div>
					</template>
					<MenuButton
						id="refresh_button"
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
						<div id="file_draggable_wrapper">
							<div>
								<div
									v-for="element of sort_dirs(get_current_files())"
									v-show="!element.hidden"
									class="file_item"
									:class="{
										selectable: element.children === undefined,
										active: element === selection
									}"
									@keydown.enter="
										on_choose(element as Directory<T>);
										$event.stopPropagation();
										$event.preventDefault();
									"
									@dblclick="
										on_choose(element as Directory<T>);
										$event.stopPropagation();
										$event.preventDefault();
									"
									@click="selection = element as Directory<T>"
								>
									{{ element.name }}
								</div>
							</div>
							<template v-if="files !== undefined">
								<Draggable
									v-if="!are_valid_thumbnails()"
									:list="sort_files(get_current_files())"
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
										<div
											v-show="!element.hidden"
											class="file_item"
											:class="{ selectable: true, active: element === selection }"
											@keydown.enter="
												on_choose(element);
												$event.stopPropagation();
												$event.preventDefault();
											"
											@dblclick="
												on_choose(element);
												$event.stopPropagation();
												$event.preventDefault();
											"
											@click="selection = element"
										>
											{{ element.name }}
										</div>
									</template>
								</Draggable>
								<Draggable
									v-else-if="thumbnails !== undefined"
									id="file_thumbnail_wrapper"
									:list="sort_files(get_current_files())"
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
										<div
											v-if="!element.hidden && thumbnails[element.path]"
											class="file_thumbnail selectable"
											:class="{ active: element === selection }"
										>
											<img
												:src="thumbnails[element.path]"
												@keydown.enter="
													on_choose(element);
													$event.stopPropagation();
													$event.preventDefault();
												"
												@dblclick="
													on_choose(element);
													$event.stopPropagation();
													$event.preventDefault();
												"
												@click="selection = element"
											/>
											<div class="file_thumbnail_name">
												{{ element.name }}
											</div>
										</div>
									</template>
								</Draggable>
							</template>
						</div>
						<div class="button_wrapper" v-if="!!slots.buttons">
							<slot name="buttons"></slot>
						</div>
					</div>
					<slot name="edit"></slot>
				</div>
			</div>
		</div>
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
	}

	#search_wrapper {
		display: flex;
		padding: 0.5rem;

		border-radius: 0.25rem;

		column-gap: 1rem;

		background-color: var(--color-container);
	}

	#search_wrapper > .button {
		margin: 0;

		height: 100%;
	}

	#search_input_wrapper {
		flex: 1;
		display: flex;

		gap: inherit;
	}

	.search_input_container {
		font-size: 1.5em;

		flex: 1;
		display: flex;
		gap: 0.5rem;

		align-items: center;

		position: relative;
	}

	.search_box {
		font-size: 1.5rem;

		padding: 0.25rem;
		padding-right: 1.375lh;

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

	.button_clear_search {
		aspect-ratio: 1;

		cursor: pointer;

		color: var(--color-text-disabled);

		font-weight: lighter;

		position: absolute;
		right: 0rem;

		height: 100%;

		display: flex;

		align-items: center;
		justify-content: center;
	}

	#directory_stack {
		background-color: var(--color-container);

		border-radius: 0.25rem;

		display: flex;
		align-items: center;

		gap: 0.5rem;

		padding: 0.5rem;
	}

	#directory_stack > .button {
		margin: 0;
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

	#refresh_button {
		margin-left: auto !important;
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

	.content {
		flex: 1;

		display: flex;
		flex-direction: column;

		gap: 0.25rem;
	}

	.file_view {
		display: flex;
		flex-direction: column;
		flex: 1;

		gap: 0.25rem;

		border-radius: 0.25rem;

		background-color: var(--color-container);
	}

	#file_draggable_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		overflow: auto;

		align-items: baseline;
	}

	#file_draggable_wrapper > div {
		display: flex;

		overflow: visible;
	}

	#file_thumbnail_wrapper {
		flex-wrap: wrap;

		overflow: auto;

		gap: 0.5rem;
		padding: 0.5rem;
	}

	#file_draggable_wrapper > div:not(#file_thumbnail_wrapper) {
		flex-direction: column;

		gap: 0.25rem;
		padding: 0.25rem;
	}

	.file_item {
		cursor: pointer;

		display: flex;
		flex-direction: column;

		justify-content: center;

		padding: 0.25rem;
	}

	.file_item.selectable {
		font-weight: lighter;
	}

	.file_item.selectable {
		font-weight: lighter;

		background-color: var(--color-item);

		border-radius: 0.25rem;
	}

	.file_item.selectable:hover {
		background-color: var(--color-item-hover);
	}

	.file_item.selectable.active {
		background-color: var(--color-active);
	}

	.file_item.selectable.active:hover {
		background-color: var(--color-active-hover);
	}

	.file_thumbnail_name {
		width: 0;
		min-width: 100%;

		padding: 0.25rem;
	}

	.file_thumbnail {
		cursor: pointer;
	}

	.file_thumbnail.selectable {
		font-weight: lighter;

		background-color: var(--color-item);

		border-radius: 0.25rem;
	}

	.file_thumbnail.selectable:hover {
		background-color: var(--color-item-hover);
	}

	.file_thumbnail.selectable.active {
		background-color: var(--color-active);

		outline-color: var(--color-active);
		outline-style: solid;
	}

	.file_thumbnail.selectable.active:hover {
		outline-color: var(--color-active-hover);
		outline-style: solid;
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

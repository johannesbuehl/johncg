<script lang="ts">
	export interface SearchInputDefinition<K, T extends keyof ItemFileMap> {
		id: K;
		placeholder: string;
		value: string;
		size?: number;
		get: (ff: Node<T>) => string;
	}

	export type SearchInputDefinitions<K, T extends keyof ItemFileMap> = SearchInputDefinition<
		K,
		T
	>[];

	export function sort_dirs<K extends keyof ItemFileMap>(files: Node<K>[]): Directory<K>[] {
		const dirs = files.filter((ff) => ff.is_dir) as Directory<K>[];

		return dirs.sort((a, b) => {
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

	export function sort_files<K extends keyof ItemFileMap>(
		files: ItemNodeMapped<K>[]
	): ItemNodeMapped<K>[] {
		return files
			?.filter((fil) => !fil.is_dir)
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

	export function create_directory_stack<K extends keyof ItemFileMap>(
		item_files: Node<K>[],
		path_stack: string[]
	): Directory<K>[] {
		const directory_stack: Directory<K>[] = [];

		while (path_stack.length > 0) {
			const files = (directory_stack[directory_stack.length - 1]?.children ?? item_files).filter(
				(ff) => {
					return ff.is_dir && ff.name.toLowerCase() === path_stack[0].toLowerCase();
				}
			);

			if (files.length === 1 && files[0].is_dir) {
				directory_stack.push(files[0]);

				path_stack.shift();
			} else {
				break;
			}
		}

		return directory_stack;
	}
</script>

<script setup lang="ts" generic="T extends keyof ItemFileMap">
	import { onMounted, reactive, ref, useSlots, watch } from "vue";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { VueDraggableNext as Draggable } from "vue-draggable-next";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import PopUp from "../PopUp.vue";

	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type {
		Directory,
		ItemFileMap,
		ItemFileMapped,
		ItemNodeMapped,
		Node
	} from "@server/search_part";
	import PlaylistItemDummy from "../Playlist/PlaylistItemDummy.vue";

	library.add(
		fas.faHouse,
		fas.faChevronRight,
		fas.faArrowsRotate,
		fas.faFileCirclePlus,
		fas.faXmark,
		fas.faFolderPlus,
		fas.faPlus
	);

	const props = defineProps<{
		name?: string;
		select_dirs?: boolean;
		files: Node<T>[];
		thumbnails?: Record<string, string>;
		clone_callback?: (arg: ItemFileMapped<T>) => ItemProps;
		new_button?: boolean;
		new_directory?: boolean;
		search_disabled?: boolean;
		item_color?: string;
	}>();

	const emit = defineEmits<{
		new_file: [];
		new_directory: [path: string];
		choose: [file: Node<T> | undefined];
		refresh_files: [];
	}>();

	const slots = useSlots();

	const search_strings = defineModel<SearchInputDefinitions<unknown, T>>("search_strings", {
		default: []
	});

	const show_new_directory = ref<boolean>(false);
	const directory_name = ref<string>("");
	const directory_name_input = ref<HTMLInputElement>();
	const rotate_button = ref<boolean>(false);
	const directory_stack = defineModel<Directory<T>[]>("directory_stack", {
		default: () => reactive([])
	});

	const selection = defineModel<Node<T> | undefined>("selection", { required: true });

	const input_refs = ref<HTMLInputElement[]>([]);

	const file_tree = ref<Node<T>[]>();

	onMounted(() => {
		input_refs.value[0]?.focus();
	});

	// rebuild the directory-stack, when new files are there
	watch(
		() => props.files,
		() => {
			if (props.files && directory_stack.value.length > 0) {
				directory_stack.value = create_directory_stack<T>(
					props.files,
					directory_stack.value.slice(-1)[0].path.split(/[/\\]/g)
				);
			}
		},
		{ immediate: true }
	);

	watch(
		() => search_strings.value,
		() => {
			file_tree.value = search_string(get_current_files(true));
		},
		{ deep: true }
	);

	function get_current_files(renew: boolean = false): Node<T>[] {
		let files: Node<T>[] | undefined = undefined;

		if (!renew) {
			files = file_tree.value;
		}

		files ??=
			directory_stack.value.length > 0 ? directory_stack.value.slice(-1)[0].children : props.files;

		return files ?? [];
	}

	function on_choose(file: Node<T>) {
		if (file.is_dir) {
			directory_stack.value.push(file);
		}

		emit("choose", file);
	}

	function on_new_directory() {
		let directory = "";

		if (directory_stack.value.length > 0) {
			directory = directory_stack.value[directory_stack.value.length - 1].path + "/";
		}

		emit("new_directory", directory + directory_name.value);
		show_new_directory.value = false;
	}

	function search_string(files: Node<T>[]): Node<T>[] | undefined {
		// if there are no search-strings, return the default files
		if (search_strings.value.every((search_string) => search_string.value === "")) {
			return undefined;
		}
		const return_files: Node<T>[] = [];

		// check all the given files
		files.forEach((ff) => {
			// if atleast one of the search-strings matches, use the file and all it's children
			if (
				search_strings.value.some((search_string) => {
					// only proceed if the search_box isn't empty
					if (search_string.value !== "") {
						return search_string.get(ff).toLowerCase().includes(search_string.value.toLowerCase());
					} else {
						return false;
					}
				})
			) {
				return_files.push(ff);
			}

			// search the children too
			if (ff.is_dir) {
				const results = search_string(ff.children);

				if (results && results.length > 0) {
					return_files.push(...results);
				}
			}
		});

		return return_files;
	}
</script>

<template>
	<div id="element_wrapper">
		<div id="file_dialogue_wrapper">
			<div class="header" v-if="name !== undefined">
				{{ name }}
			</div>
			<div class="content">
				<div id="search_wrapper" v-if="!search_disabled">
					<MenuButton v-if="new_button" :square="true" @click="emit('new_file')">
						<FontAwesomeIcon :icon="['fas', 'file-circle-plus']" />
					</MenuButton>
					<div id="search_input_wrapper">
						<div
							v-if="search_strings !== undefined"
							v-for="({ placeholder, size }, index) in search_strings"
							:key="index"
							class="search_input_container"
						>
							<input
								class="search_box"
								v-model="search_strings[index].value"
								ref="input_refs"
								:placeholder="placeholder"
								:size="size ?? undefined"
							/>
							<span
								class="button_clear_search"
								@click="search_strings ? (search_strings[index].value = '') : search_strings"
							>
								<FontAwesomeIcon :icon="['fas', 'xmark']" />
							</span>
						</div>
					</div>
				</div>
				<div id="navigation_bar">
					<div v-if="new_directory" id="new_directory_wrapper">
						<MenuButton
							:square="true"
							@click="
								show_new_directory = true;
								directory_name = '';
								$nextTick(() => {
									directory_name_input?.focus();
								});
							"
						>
							<FontAwesomeIcon :icon="['fas', 'folder-plus']" />
						</MenuButton>
					</div>
					<div id="directory_stack">
						<MenuButton
							:square="true"
							@click="
								directory_stack = reactive([]);
								$emit(
									'choose',
									directory_stack.length > 0
										? directory_stack[directory_stack.length - 1]
										: undefined
								);
							"
						>
							<FontAwesomeIcon :icon="['fas', 'house']" />
						</MenuButton>
						<template v-for="(dir, dir_index) of directory_stack" :key="dir_index">
							<FontAwesomeIcon :icon="['fas', 'chevron-right']" />
							<MenuButton
								@click="
									directory_stack.splice(dir_index + 1, directory_stack.length);
									$emit(
										'choose',
										directory_stack.length > 0
											? directory_stack[directory_stack.length - 1]
											: undefined
									);
								"
							>
								{{ dir.name }}
							</MenuButton>
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
				</div>
				<div id="file_view_wrapper">
					<div id="file_view">
						<div id="file_list">
							<div>
								<div
									v-for="(element, element_index) of sort_dirs(get_current_files())"
									:key="element_index"
									class="file_item"
									:class="{
										selectable: !element.is_dir,
										active: element === selection
									}"
									@keydown.enter.prevent="on_choose(element as Directory<T>)"
									@dblclick.prevent="on_choose(element as Directory<T>)"
									@click="selection = element as Directory<T>"
								>
									{{ element.name }}
								</div>
							</div>
							<template v-if="files !== undefined">
								<Draggable
									class="draggable"
									:list="sort_files(get_current_files())"
									tag="div"
									:clone="clone_callback"
									:group="
										clone_callback !== undefined
											? {
													name: 'playlist',
													pull: 'clone',
													put: false
												}
											: undefined
									"
									:sort="false"
									delay-on-touch-only="true"
									delay="250"
								>
									<PlaylistItemDummy
										v-for="(element, element_index) of sort_files(get_current_files())"
										:key="element_index"
										:active="element === selection"
										:color="item_color ?? ''"
										@keydown.enter.prevent="on_choose(element)"
										@dblclick="on_choose(element)"
										@click="selection = element"
									>
										{{ element.name }}
										<span
											class="file_path"
											v-if="search_strings?.some((search_string) => search_string.value !== '')"
										>
											{{
												element.path.slice(
													(directory_stack.slice(-1)?.[0]?.name.length ?? -1) + 1,
													element.path.lastIndexOf(element.name)
												)
											}}{{ element.name }}
										</span>
									</PlaylistItemDummy>
								</Draggable>
							</template>
						</div>
						<Draggable
							v-if="thumbnails !== undefined"
							id="file_thumbnail_wrapper"
							class="draggable"
							:list="sort_files(get_current_files())"
							:group="
								clone_callback !== undefined
									? {
											name: 'playlist',
											pull: 'clone',
											put: false
										}
									: undefined
							"
							tag="div"
							:clone="clone_callback"
							:sort="false"
							delay-on-touch-only="true"
							delay="250"
						>
							<template
								v-for="(element, element_index) of sort_files(get_current_files())"
								:key="element_index"
							>
								<PlaylistItemDummy
									v-show="thumbnails[element.path]"
									:active="element === selection"
									:color="item_color ?? ''"
									@click="selection = element"
									@keydown.enter.prevent="on_choose(element)"
									@dblclick="on_choose(element)"
								>
									<div class="file_thumbnail selectable">
										<img :src="thumbnails[element.path]" />
										<div class="file_thumbnail_name">
											{{ element.name }}
										</div>
									</div>
								</PlaylistItemDummy>
							</template>
						</Draggable>
						<slot name="edit"></slot>>
					</div>
					<div class="button_wrapper" v-if="!!slots.buttons">
						<slot name="buttons" />
					</div>
				</div>
			</div>
		</div>
		<PopUp v-model:active="show_new_directory" title="Create Directory">
			<div id="create_directory_popup">
				<input
					ref="directory_name_input"
					class="search_box"
					v-model="directory_name"
					placeholder="Directory Name"
					@keydown.enter="on_new_directory"
				/>
				<MenuButton :square="true" @click="on_new_directory">
					<FontAwesomeIcon :icon="['fas', 'plus']" />
				</MenuButton>
			</div>
		</PopUp>
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

	#navigation_bar {
		display: flex;

		gap: 0.25rem;
	}

	#new_directory_wrapper {
		background-color: var(--color-container);
		border-radius: 0.25rem;

		display: flex;
		align-items: center;
		justify-content: center;

		aspect-ratio: 1;
		max-height: 100%;
	}

	#directory_stack {
		background-color: var(--color-container);

		border-radius: 0.25rem;

		flex: 1;
		display: flex;
		align-items: center;

		gap: 0.5rem;

		padding: 0.5rem;
	}

	#directory_stack > .button {
		margin: 0;
	}

	#refresh_button {
		margin-left: auto !important;
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

	#file_view_wrapper {
		display: flex;
		flex-direction: column;
		flex: 1;

		gap: 0.25rem;

		border-radius: 0.25rem;
	}

	#file_view {
		flex: 1;
		display: flex;

		gap: 0.25rem;
	}

	#file_list {
		flex: 1;
		display: flex;
		flex-direction: column;

		overflow: auto;

		align-items: baseline;

		border-radius: 0.25rem;

		background-color: var(--color-container);
	}

	#file_list > div {
		display: flex;

		overflow: visible;
	}

	.file_path {
		color: var(--color-text-disabled);

		font: inherit;
	}

	#file_thumbnail_wrapper {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;

		overflow: auto;

		gap: 0.5rem;
		padding: 0.5rem;

		border-radius: inherit;

		background-color: var(--color-container);
	}

	#file_list > div:not(#file_thumbnail_wrapper) {
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

	.file_thumbnail {
		cursor: pointer;

		display: flex;
		flex-direction: column;
	}

	.file_thumbnail.selectable {
		font-weight: lighter;

		border-radius: 0.25rem;
	}

	.file_thumbnail > img {
		display: none;
	}

	.file_thumbnail_name {
		font-weight: lighter;
	}

	#file_thumbnail_wrapper .file_thumbnail_name {
		width: 0;
		min-width: 100%;

		padding: 0.25rem;
	}

	.button_wrapper {
		display: flex;

		border-radius: inherit;

		background-color: var(--color-container);
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

	#create_directory_popup {
		padding: 0.5rem;

		display: flex;
		gap: 0.25rem;

		background-color: var(--color-container);
	}

	#create_directory_popup > input {
		width: 25rem;
	}

	#create_directory_popup > .button {
		margin: 0;
		height: 100%;
	}

	/* don't show playliste-elements in file-dialogue */
	.draggable:deep(.item_color_indicator) {
		display: none !important;
	}

	.draggable#file_thumbnail_wrapper:deep(.playlist_item) {
		padding: 0;
	}

	.draggable#file_thumbnail_wrapper:deep(img) {
		display: unset;
	}
</style>

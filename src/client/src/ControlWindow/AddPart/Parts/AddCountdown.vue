<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/ItemDialogue/FileDialogue/FileDialogue.vue";
	import CountdownEditor from "@/ControlWindow/ItemDialogue/CountdownEditor.vue";

	import type { MediaFile } from "@server/search_part";
	import type { CountdownProps } from "@server/PlaylistItems/Countdown";
	import { CountdownMode, countdown_title_map } from "@server/lib";

	library.add(fas.faPlus, fas.faRepeat);
	const props = defineProps<{
		files: MediaFile[];
	}>();

	const emit = defineEmits<{
		add: [item_props: CountdownProps];
		refresh: [];
	}>();

	const countdown_mode = ref<CountdownMode>(CountdownMode.EndTime);
	const time = ref<string>(new Date(Date.now()).toLocaleTimeString());
	const show_seconds = ref<boolean>(true);
	const position = ref<{ x: number; y: number }>({ x: 50, y: 50 });
	const font_size = ref<number>(20);
	const font_color = ref<string>("#FFFFFF");

	const media_selection = defineModel<MediaFile>({});

	const search_strings = defineModel<SearchInputDefinitions<"name">>("search_strings", {
		default: [{ id: "name", placeholder: "Name", value: "" }]
	});

	const file_tree = defineModel<MediaFile[]>("file_tree");

	onMounted(() => {
		// init
		refresh_search_index();

		init_files();
	});

	watch(
		() => props.files,
		() => {
			init_files();
		}
	);

	function init_files() {
		search_map = create_search_map();

		search_media();
	}

	function add_countdown() {
		const return_props = create_props();

		if (return_props !== undefined) {
			emit("add", return_props);
		}
	}

	function create_props(): CountdownProps | undefined {
		if (media_selection.value !== undefined) {
			let caption = countdown_title_map[countdown_mode.value];

			if (
				countdown_mode.value === CountdownMode.Duration ||
				countdown_mode.value === CountdownMode.EndTime
			) {
				caption += `: ${time.value}`;
			}

			return {
				type: "countdown",
				caption,
				color: "#FF0080",
				media: media_selection.value.path,
				font_size: font_size.value,
				font_color: font_color.value,
				mode: countdown_mode.value,
				position: position.value,
				show_seconds: show_seconds.value,
				time: time.value
			};
		}
	}

	function search_media() {
		file_tree.value = search_string();
	}

	type SearchMapFile = MediaFile & { children?: SearchMapFile[]; search_data?: { name: string } };
	let search_map: SearchMapFile[] = [];
	function create_search_map(files: MediaFile[] | undefined = props.files): SearchMapFile[] {
		const return_map: SearchMapFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
				return_map.push({
					...f,
					search_data: {
						name: f.name.toLowerCase()
					},
					children: f.children !== undefined ? create_search_map(f.children) : undefined
				});
			});
		}

		return return_map;
	}

	function search_string(files: SearchMapFile[] | undefined = search_map): MediaFile[] {
		const return_files: MediaFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
				if (
					search_strings.value.every((search_string) => {
						if (f.search_data !== undefined) {
							if (f.search_data[search_string.id] !== undefined) {
								return f.search_data[search_string.id]?.includes(search_string.value.toLowerCase());
							} else {
								return search_string.value === "";
							}
						} else {
							return true;
						}
					})
				) {
					return_files.push(f);
				} else if (f.children !== undefined) {
					const children = search_string(f.children);

					if (children.length > 0) {
						return_files.push({
							...f,
							children: search_string(f.children)
						});
					}
				}
			});
		}

		return return_files;
	}

	function refresh_search_index() {
		emit("refresh");
	}
</script>

<template>
	<FileDialogue
		:files="file_tree"
		name="Media"
		v-model:selection="media_selection"
		v-model:search_strings="search_strings"
		@choose="add_countdown"
		@search="search_media"
		@refresh_files="refresh_search_index"
	>
		<template v-slot:buttons>
			<MenuButton @click="add_countdown">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Countdown
			</MenuButton>
		</template>
		<template v-slot:edit>
			<CountdownEditor
				v-model:countdown_mode="countdown_mode"
				v-model:font_size="font_size"
				v-model:position="position"
				v-model:show_seconds="show_seconds"
				v-model:time="time"
				v-model:font_color="font_color"
			/>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}
</style>

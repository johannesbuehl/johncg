<script setup lang="ts">
	import { onMounted, ref, toRaw, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import SongPartSelector from "@/ControlWindow/ItemDialogue/SongPartSelector.vue";

	import type { SongFile } from "@server/search_part";
	import type { SongProps } from "@server/PlaylistItems/Song";

	library.add(fas.faPlus);
	const props = defineProps<{
		files: SongFile[];
	}>();

	const emit = defineEmits<{
		add: [item_props: SongProps];
		refresh: [];
		new_song: [];
	}>();

	// currently selected song
	const selection = ref<SongFile>();
	const verse_order = ref<string[]>([]);
	const languages = ref<[number, boolean][]>([]);

	const search_strings = ref<SearchInputDefinitions<keyof SearchMapData>>([
		{ id: "id", placeholder: "Song ID", value: "", size: 5 },
		{ id: "title", placeholder: "Title", value: "" },
		{ id: "text", placeholder: "Text", value: "" }
	]);

	const file_tree = ref<SongFile[]>();

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

	watch(
		() => selection.value,
		(selection) => {
			if (selection?.data !== undefined) {
				verse_order.value = structuredClone(
					toRaw(selection.data.metadata.VerseOrder ?? Object.keys(selection.data.text))
				);
				languages.value = Array(selection.data.metadata.Title?.length)
					.fill([])
					.map((ele, index) => [index, true]);
			}
		}
	);

	function init_files() {
		search_map = create_search_map();

		search_song();
	}

	function add_song(file?: SongFile) {
		if (file !== undefined && file?.children === undefined) {
			emit("add", create_props(file));
		}
	}

	function create_props(file: SongFile): SongProps {
		const props: SongProps = {
			type: "song",
			caption: file.name,
			color: "#0000FF",
			file: file.path
		};

		// if the selected parts differ from the default ones, save them in the playlist
		if (Object.keys(file.data?.text ?? {}).some((val, index) => val !== verse_order.value[index])) {
			props.verse_order = verse_order.value;
		}

		// if not all languages are checked or the order isn't default, add it to the props
		if (languages.value.some(([lang, state], index) => lang !== index && state)) {
			props.languages = languages.value.filter((ele) => ele[1]).map((ele) => ele[0]);
		} else {
			// delete them from the props
			delete props.languages;
		}

		return props;
	}

	function search_song() {
		file_tree.value = search_string();
	}

	type SearchMapData = { id?: string; title?: string; text?: string };
	type SearchMapFile = SongFile & { search_data?: SearchMapData };
	let search_map: SearchMapFile[] = [];
	function create_search_map(files: SongFile[] | undefined = props.files): SearchMapFile[] {
		const return_map: SearchMapFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
				if (f.children !== undefined) {
					return_map.push(...create_search_map(f.children));
				} else {
					return_map.push({
						...f,
						search_data: {
							id: f.data?.metadata.ChurchSongID?.toLowerCase(),
							title: f.data?.metadata.Title?.join("\n").toLowerCase(),
							text: Object.values((f as SongFile).data?.text ?? {})
								.map((p) => p.map((s) => s.map((l) => l.join("\n")).join("\n")).join("\n"))
								.join("\n")
								.toLowerCase()
						}
					});
				}
			});
		}

		return return_map;
	}

	function search_string(files: SearchMapFile[] | undefined = search_map): SongFile[] {
		// if there are no search-strings, return the default files
		if (search_strings.value.every((search_string) => search_string.value === "")) {
			return props.files;
		}

		const return_files: SongFile[] = [];

		if (files !== undefined) {
			files.forEach((f) => {
				if (f.children !== undefined) {
					const children = search_string(f.children);

					if (children.length > 0) {
						return_files.push({
							...f,
							children: search_string(f.children)
						});
					}
				} else {
					if (
						search_strings.value.every((search_string) => {
							if (f.search_data !== undefined && search_string) {
								if (f.search_data[search_string.id] !== undefined) {
									f.hidden = !f.search_data[search_string.id]?.includes(
										search_string.value.toLowerCase()
									);
								} else {
									f.hidden = search_string.value !== "";
								}
							} else {
								f.hidden = false;
							}

							return f.hidden !== true;
						})
					) {
						return_files.push(f);
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
		:clone_callback="(ff) => create_props(ff as SongFile)"
		:new_button="true"
		name="Song"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="add_song"
		@search="search_song"
		@refresh_files="refresh_search_index"
		@new_file="emit('new_song')"
	>
		<template v-slot:buttons>
			<MenuButton @click="add_song(selection)">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Song
			</MenuButton>
		</template>
		<template v-slot:edit>
			<SongPartSelector
				v-model:selected_parts="verse_order"
				v-model:selected_languages="languages"
				:song_data="selection?.data"
			/>
		</template>
	</FileDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}

	:deep(.search_input_container:first-child) {
		/* width: 11ch; */
		flex: none;
	}
</style>

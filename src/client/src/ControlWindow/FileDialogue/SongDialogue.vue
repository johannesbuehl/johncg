<script setup lang="ts">
	import { reactive, ref, toRaw, watch } from "vue";

	import FileDialogue, {
		type SearchInputDefinitions
	} from "@/ControlWindow/FileDialogue/FileDialogue.vue";
	import Globals from "@/Globals";

	import type { Directory, Node, SongFile } from "@server/search_part";
	import type { SongProps } from "@server/PlaylistItems/Song";

	const props = defineProps<{
		select_dirs?: boolean;
		new_button?: boolean;
		hide_header?: boolean;
		new_directory?: boolean;
		create_props?: (file: SongFile) => SongProps;
	}>();

	const emit = defineEmits<{
		choose: [Node<"song"> | undefined];
		new_song: [];
		new_directory: [path: string];
	}>();

	// currently selected song
	const selection = defineModel<SongFile>("selection");

	const directory_stack = defineModel<Directory<"song">[]>("directory_stack", {
		default: () => reactive([])
	});

	const verse_order = ref<string[]>([]);
	const languages = ref<[number, boolean][]>([]);

	const search_strings = ref<SearchInputDefinitions<keyof SearchMapData, "song">>([
		{
			id: "id",
			placeholder: "Song ID",
			value: "",
			size: 5,
			get: (ff) => (ff.is_dir ? "" : (ff.data.metadata.ChurchSongID ?? ""))
		},
		{
			id: "title",
			placeholder: "Title",
			value: "",
			get: (ff) => (ff.is_dir ? "" : ff.data.metadata.Title.join("\n"))
		},
		{
			id: "text",
			placeholder: "Text",
			value: "",
			get: (ff) =>
				ff.is_dir
					? ""
					: Object.values(ff.data.text)
							.flat(3)
							.map((ll) => ll.text)
							.join(" ")
		}
	]);

	type SearchMapData = { id?: string; title?: string; text?: string };

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

	function props_creator(file: SongFile): SongProps {
		if (props.create_props) {
			return props.create_props(file);
		} else {
			const song_props: SongProps = {
				type: "song",
				caption: file.name,
				color: "#0000FF",
				file: file.path
			};

			// if the selected parts differ from the default ones, save them in the playlist
			if (
				Object.keys(file.data?.text ?? {}).some((val, index) => val !== verse_order.value[index])
			) {
				song_props.verse_order = verse_order.value;
			}

			// if not all languages are checked or the order isn't default, add it to the props
			if (languages.value.some(([lang, state], index) => lang !== index && state)) {
				song_props.languages = languages.value.filter((ele) => ele[1]).map((ele) => ele[0]);
			} else {
				// delete them from the props
				delete song_props.languages;
			}

			return song_props;
		}
	}
</script>

<template>
	<FileDialogue
		:files="Globals.get_song_files()"
		:clone_callback="(ff) => props_creator(ff as SongFile)"
		:new_button="new_button"
		:select_dirs="select_dirs"
		:new_directory="new_directory"
		:item_color="Globals.color.song"
		v-model:directory_stack="directory_stack"
		:name="!hide_header ? 'Song' : undefined"
		v-model:selection="selection"
		v-model:search_strings="search_strings"
		@choose="(ff) => emit('choose', ff)"
		@refresh_files="() => Globals.get_song_files(true)"
		@new_file="emit('new_song')"
		@new_directory="(path: string) => emit('new_directory', path)"
	>
		<template v-slot:buttons>
			<slot name="buttons"></slot>
		</template>
		<template v-slot:edit>
			<slot name="edit"></slot>
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

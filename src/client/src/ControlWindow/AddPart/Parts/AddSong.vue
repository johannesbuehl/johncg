<script setup lang="ts">
	import { ref, toRaw, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import SongDialogue from "@/ControlWindow/FileDialogue/SongDialogue.vue";
	import SongPartSelector from "@/ControlWindow/ItemDialogue/SongPartSelector.vue";

	import type { Node, SongFile } from "@server/search_part";
	import type { SongProps } from "@server/PlaylistItems/Song";
	import Globals from "@/Globals";

	library.add(fas.faPlus);

	const emit = defineEmits<{
		add: [item_props: SongProps];
		new_song: [];
	}>();

	// currently selected song
	const selection = ref<SongFile>();
	const verse_order = ref<string[]>([]);
	const languages = ref<[number, boolean][]>([]);

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

	function add_song(file?: Node<SongFile>) {
		if (file !== undefined && !file.is_dir) {
			emit("add", create_props(file));
		}
	}

	function create_props(file: SongFile): SongProps {
		const props: SongProps = {
			type: "song",
			caption: file.name,
			color: Globals.color.song,
			file: file.path
		};

		// only create custom props if the song is selected
		if (file === selection.value) {
			// if the selected parts differ from the default ones, save them in the playlist
			if (file.data?.metadata.VerseOrder?.length !== verse_order.value.length || file.data?.metadata.VerseOrder?.some((val, index) => val !== verse_order.value[index])) {
				props.verse_order = verse_order.value;

				console.warn(file.data.metadata.VerseOrder);
				console.warn(verse_order.value);
			}

			// if not all languages are checked or the order isn't default, add it to the props
			if (languages.value.some(([lang, state], index) => lang !== index || !state)) {
				props.languages = languages.value.filter(([lang, state]) => state).map((ele) => ele[0]);
			}
		}

		return props;
	}
</script>

<template>
	<SongDialogue
		:new_button="true"
		:create_props="create_props"
		v-model:selection="selection"
		@choose="add_song"
		@new_song="emit('new_song')"
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
	</SongDialogue>
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

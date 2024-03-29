<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import BibleSelector, { get_book_from_id } from "./BibleSelector.vue";

	library.add(fas.faPlus);

	import {
		create_bible_citation_string,
		type BibleFile,
		type BibleProps
	} from "@server/PlaylistItems/Bible";

	const props = defineProps<{
		bible?: BibleFile;
		ws: WebSocket;
	}>();

	const emit = defineEmits<{
		add: [bible_props: BibleProps];
	}>();

	const bible_props = defineModel<BibleProps>("item_props", {
		default: {
			type: "bible",
			caption: "",
			color: "#ff0000",
			book_id: "",
			chapters: {}
		}
	});

	function add_item() {
		// set the caption
		bible_props.value.caption = create_bible_citation_string(
			get_book_from_id(props.bible ?? {}, bible_props.value.book_id).name,
			bible_props.value.chapters
		);

		emit("add", bible_props.value);
	}
</script>

<template>
	<BibleSelector v-model:bible_props="bible_props" :ws="ws" :bible="bible">
		<MenuButton icon="plus" text="Add Bible" @click="add_item()" />
	</BibleSelector>
</template>

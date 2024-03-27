<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";

	import BibleSelector from "./BibleSelector.vue";

	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import {
		create_bible_citation_string,
		type BibleFile,
		type BibleProps,
		type Book
	} from "@server/PlaylistItems/Bible";

	const props = defineProps<{
		bible?: BibleFile;
		ws: WebSocket;
		edit?: boolean;
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

	function add_item(book_name: string) {
		// set the caption
		bible_props.value.caption = create_bible_citation_string(book_name, bible_props.value.chapters);

		emit("add", bible_props.value);

		console.debug(bible_props.value.chapters);
	}
</script>

<template>
	<BibleSelector v-model:bible_props="bible_props" :ws="ws" :bible="bible" @add="add_item" />
</template>

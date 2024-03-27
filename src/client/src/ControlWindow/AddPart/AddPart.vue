<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import { ControlWindowState } from "@/Enums";
	import PartRadio from "./PartRadio.vue";
	import AddMedia from "./Parts/AddMedia.vue";
	import AddTemplate from "./Parts/AddTemplate.vue";
	import AddBible from "./Parts/Bible/AddBible.vue";
	import AddSong from "./Parts/Song/AddSong.vue";
	import AddPDF from "./Parts/AddPDF.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { BibleFile } from "@server/PlaylistItems/Bible";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type { SongProps } from "@server/PlaylistItems/Song";

	library.add(
		fas.faMusic,
		fas.faBookBible,
		fas.faFont,
		fas.faImage,
		fas.faFilePdf,
		fas.faClock,
		fas.faMessage
	);

	const props = defineProps<{
		ws: WebSocket;
		search_results?: JGCPSend.SearchResults;
		files: Record<JGCPSend.ItemTree["type"], JGCPSend.File[]>;
		bible?: BibleFile;
		mode: ControlWindowState;
	}>();

	const pick = ref<string>("song");

	const part_types = [
		{ text: "Song", value: "song", icon: "music" },
		{ text: "Psalm", value: "psalm", icon: "book-bible" },
		{ text: "Bible", value: "bible", icon: "book-bible" },
		{ text: "Text", value: "text", icon: "font" },
		{ text: "Media", value: "media", icon: "image" },
		{ text: "Template", value: "template", icon: "music" },
		{ text: "PDF", value: "pdf", icon: "file-pdf" },
		{ text: "Countdown", value: "countdown", icon: "clock" },
		{ text: "Comment", value: "comment", icon: "message" }
	];

	function add_item(item_props: ItemProps) {
		const message: JGCPRecv.AddItem = {
			command: "add_item",
			props: item_props,
			set_active: true
		};

		props.ws.send(JSON.stringify(message));
	}

	function update_item() {
		console.debug("update_item request");
	}
</script>

<template>
	<div class="add_part_wrapper">
		<div class="song_part_selector" v-if="mode === ControlWindowState.Add">
			<PartRadio
				v-for="type in part_types"
				:value="type.value"
				:icon="type.icon"
				:text="type.text"
				v-model="pick"
			/>
		</div>
		<AddSong
			v-if="pick === 'song'"
			:ws="ws"
			:search_results="search_results?.type === 'song' ? search_results : undefined"
			@add="add_item"
			@update="update_item"
		/>
		<AddBible
			v-if="pick === 'bible'"
			:bible="bible"
			:ws="ws"
			@add="add_item"
			@update="update_item"
		/>
		<AddMedia
			v-if="pick === 'media'"
			:files="files[pick]"
			:ws="ws"
			@add="add_item"
			@update="update_item"
		/>
		<AddTemplate
			v-if="pick === 'template'"
			:files="files[pick]"
			:ws="ws"
			@add="add_item"
			@update="update_item"
		/>
		<AddPDF
			v-if="pick === 'pdf'"
			:files="files[pick]"
			:ws="ws"
			@add="add_item"
			@update="update_item"
		/>
	</div>
</template>

<style scoped>
	.add_part_wrapper {
		display: flex;
		flex-direction: column;
		flex: 1;

		gap: 0.25rem;
	}

	.song_part_selector {
		width: 100%;

		display: flex;
		gap: inherit;
	}
</style>

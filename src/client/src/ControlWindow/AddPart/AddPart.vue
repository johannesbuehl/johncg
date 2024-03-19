<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import PartRadio from "./PartRadio.vue";
	import AddSong from "./Parts/AddSong.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import AddMedia from "./Parts/AddMedia.vue";
	import type { File } from "../FileDialogue/FileDialogue.vue";
	import AddTemplate from "./Parts/AddTemplate.vue";

	library.add(fas.faMusic, fas.faBookBible, fas.faFont, fas.faImage, fas.faFilePdf, fas.faClock);

	defineProps<{
		ws: WebSocket;
		search_results?: JGCPSend.SearchResults;
		media: File[];
		templates: File[];
	}>();

	// const emit = defineEmits<{

	// }>();

	const pick = defineModel<string>({ default: "song" });

	const part_types = [
		{ text: "Song", value: "song", icon: "music" },
		{ text: "Psalm", value: "psalm", icon: "book-bible" },
		{ text: "Bible", value: "bible", icon: "book-bible" },
		{ text: "Text", value: "text", icon: "font" },
		{ text: "Media", value: "media", icon: "image" },
		{ text: "Template", value: "template", icon: "music" },
		{ text: "PDF", value: "pdf", icon: "file-pdf" },
		{ text: "Countdown", value: "countdown", icon: "clock" }
	];
</script>

<template>
	<div class="add_part_wrapper">
		<div class="song_part_selector">
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
		/>
		<AddMedia v-if="pick === 'media'" :media="media" :ws="ws" />
		<AddTemplate v-if="pick === 'template'" :templates="templates" :ws="ws" />
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

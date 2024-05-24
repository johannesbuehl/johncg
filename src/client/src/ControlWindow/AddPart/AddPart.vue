<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import { ControlWindowState } from "@/Enums";
	import PartRadio from "./PartRadio.vue";
	import AddMedia from "./Parts/AddMedia.vue";
	import AddTemplate from "./Parts/AddTemplate.vue";
	import AddBible from "./Parts/AddBible.vue";
	import AddSong from "./Parts/AddSong.vue";
	import AddPDF from "./Parts/AddPDF.vue";
	import AddPsalm from "./Parts/AddPsalm.vue";
	import AddCountdown from "./Parts/AddCountdown.vue";
	import AddAMCP from "./Parts/AddAMCP.vue";
	import AddComment from "./Parts/AddComment.vue";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { BibleFile } from "@server/PlaylistItems/Bible";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import AddText from "./Parts/AddText.vue";

	library.add(
		fas.faMusic,
		fas.faBookBible,
		fas.faQuoteLeft,
		fas.faFont,
		fas.faImage,
		fas.faPenRuler,
		fas.faFilePdf,
		fas.faClock,
		fas.faTerminal,
		fas.faMessage
	);

	const props = defineProps<{
		ws: WebSocket;
		files?: Record<JGCPSend.ItemFiles["type"], JGCPSend.ItemFiles["files"]>;
		bible?: BibleFile;
		mode: ControlWindowState;
	}>();

	const pick = ref<ItemProps["type"]>("song");

	const control_window_state = defineModel<ControlWindowState>("control_window_state", {
		required: true
	});

	const part_types: { text: string; value: ItemProps["type"]; icon: string }[] = [
		{ text: "Song", value: "song", icon: "music" },
		{ text: "Psalm", value: "psalm", icon: "book-bible" },
		{ text: "Bible", value: "bible", icon: "quote-left" },
		{ text: "Text", value: "text", icon: "font" },
		{ text: "Media", value: "media", icon: "image" },
		{ text: "Template", value: "template", icon: "pen-ruler" },
		{ text: "PDF", value: "pdf", icon: "file-pdf" },
		{ text: "Countdown", value: "countdown", icon: "clock" },
		{ text: "AMCP", value: "amcp", icon: "terminal" },
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

	function get_files(type: JGCPRecv.GetItemFiles["type"] | "bible") {
		let message: JGCPRecv.Message;

		if (type === "bible") {
			message = {
				command: "get_bible"
			};
		} else {
			message = {
				command: "get_item_files",
				type
			};
		}

		props.ws.send(JSON.stringify(message));
	}
</script>

<template>
	<div class="add_part_wrapper">
		<div class="song_part_selector" v-if="mode === ControlWindowState.Add">
			<PartRadio
				v-for="type in part_types"
				v-model="pick"
				:value="type.value"
				:icon="type.icon"
				:text="type.text"
			/>
		</div>
		<template v-if="files !== undefined">
			<AddSong
				v-if="pick === 'song'"
				:files="files[pick]"
				@add="add_item"
				@refresh="get_files('song')"
				@new_song="control_window_state = ControlWindowState.NewSong"
			/>
			<AddPsalm
				v-else-if="pick === 'psalm'"
				:files="files[pick]"
				@add="add_item"
				@refresh="get_files('psalm')"
				@new_psalm="control_window_state = ControlWindowState.NewPsalm"
			/>
			<AddBible
				v-else-if="pick === 'bible'"
				:bible="bible"
				@add="add_item"
				@refresh="get_files('bible')"
			/>
			<AddText v-else-if="pick === 'text'" @add="add_item" />
			<AddMedia
				v-else-if="pick === 'media'"
				:files="files[pick]"
				@add="add_item"
				@refresh="get_files('media')"
			/>
			<AddTemplate
				v-else-if="pick === 'template'"
				:files="files[pick]"
				@add="add_item"
				@refresh="get_files('template')"
			/>
			<AddPDF
				v-else-if="pick === 'pdf'"
				:files="files[pick]"
				@add="add_item"
				@refresh="get_files('pdf')"
			/>
			<AddCountdown
				v-else-if="pick === 'countdown'"
				:files="files['media']"
				@add="add_item"
				@refresh="get_files('media')"
			/>
			<AddAMCP v-else-if="pick === 'amcp'" @add="add_item" @refresh="get_files('media')" />
			<AddComment v-else-if="pick === 'comment'" @add="add_item" />
		</template>
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

		padding: 0.125rem;
	}
</style>

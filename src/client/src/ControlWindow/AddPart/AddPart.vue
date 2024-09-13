<script setup lang="ts">
	import { onMounted, onUnmounted, ref } from "vue";
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
	import AddText from "./Parts/AddText.vue";
	import Globals from "@/Globals";
	import { stop_event } from "@/App.vue";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";

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

	const pick = ref<ItemProps["type"]>("song");

	onMounted(() => {
		window.addEventListener("keydown", key_part_navigation);
	});

	onUnmounted(() => {
		window.removeEventListener("keydown", key_part_navigation);
	});

	function key_part_navigation(event: KeyboardEvent) {
		// exit on composing
		if (event.isComposing) {
			return;
		}

		let prevent_default = false;

		// execute the navigation-keys only if the slides are visible
		prevent_default = true;

		if (event.ctrlKey && event.code === "Tab") {
			let pick_index = part_types.findIndex((part) => part.value === pick.value);

			if (event.shiftKey) {
				pick_index--;
			} else {
				pick_index++;
			}

			pick.value = part_types[(pick_index + part_types.length) % part_types.length].value;

			if (prevent_default) {
				stop_event(event);
			}
		}
	}

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
		Globals.ws?.send<JCGPRecv.AddItem>({
			command: "add_item",
			props: item_props,
			set_active: true
		});
	}
</script>

<template>
	<div class="add_part_wrapper">
		<div class="song_part_selector">
			<PartRadio
				v-for="type in part_types"
				:key="type.value"
				v-model="pick"
				:value="type.value"
				:icon="type.icon"
				:text="type.text"
			/>
		</div>
		<AddSong
			v-if="pick === 'song'"
			@add="add_item"
			@new_song="Globals.ControlWindowState = ControlWindowState.NewSong"
		/>
		<AddPsalm
			v-else-if="pick === 'psalm'"
			@add="add_item"
			@new_psalm="Globals.ControlWindowState = ControlWindowState.NewPsalm"
		/>
		<AddBible v-else-if="pick === 'bible'" @add="add_item" />
		<AddText v-else-if="pick === 'text'" @add="add_item" />
		<AddMedia v-else-if="pick === 'media'" @add="add_item" />
		<AddTemplate v-else-if="pick === 'template'" @add="add_item" />
		<AddPDF v-else-if="pick === 'pdf'" @add="add_item" />
		<AddCountdown v-else-if="pick === 'countdown'" @add="add_item" />
		<AddAMCP v-else-if="pick === 'amcp'" @add="add_item" />
		<AddComment v-else-if="pick === 'comment'" @add="add_item" />
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

<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import MediaDialogue from "@/ControlWindow/FileDialogue/MediaDialogue.vue";
	import CountdownEditor from "@/ControlWindow/ItemDialogue/CountdownEditor.vue";
	import Globals from "@/Globals";

	import { NodeType, type CasparFile, type Node } from "@server/search_part_types";
	import type { CountdownProps } from "@server/PlaylistItems/Countdown";
	import { CountdownMode, countdown_title_map } from "@server/lib";

	library.add(fas.faPlus, fas.faRepeat);

	const emit = defineEmits<{
		add: [item_props: CountdownProps];
	}>();

	const countdown_mode = ref<CountdownMode>(CountdownMode.EndTime);
	const time = ref<string>(new Date().toLocaleTimeString("de-DE"));
	const show_seconds = ref<boolean>(true);
	const position = ref<{ x: number; y: number }>({ x: 50, y: 50 });
	const font_size = ref<number>(20);
	const font_color = ref<string>("#FFFFFF");

	const media_selection = defineModel<CasparFile>({});

	function add_countdown(file_selection: Node<"media"> | undefined) {
		if (file_selection?.type === NodeType.File) {
			const return_props = create_props();

			if (return_props !== undefined) {
				emit("add", return_props);
			}
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
				color: Globals.color.countdown,
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
</script>

<template>
	<MediaDialogue v-model:selection="media_selection" @choose="add_countdown">
		<template v-slot:buttons>
			<MenuButton @click="add_countdown(media_selection)">
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
	</MediaDialogue>
</template>

<style scoped>
	.button {
		flex: 1;
	}
</style>

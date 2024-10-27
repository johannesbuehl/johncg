<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";

	import CountdownEditor from "../ItemDialogue/CountdownEditor.vue";

	import type { ClientCountdownItem } from "@server/PlaylistItems/Countdown";
	import { CountdownMode } from "@server/lib";

	defineProps<{
		item_index: number;
	}>();

	const countdown_mode = ref<CountdownMode>(CountdownMode.EndTime);
	const time = ref<string>(new Date(Date.now()).toLocaleTimeString());
	const show_seconds = ref<boolean>(true);
	const position = ref<{ x: number; y: number }>({ x: 50, y: 50 });
	const font_size = ref<number>(20);
	const font_color = ref<string>("#FFFFFF");

	const item_props = defineModel<ClientCountdownItem>("item_props", { required: true });

	onMounted(() => {
		countdown_mode.value = item_props.value.mode;
		time.value = item_props.value.time;
		show_seconds.value = item_props.value.show_seconds;
		position.value = item_props.value.position;
		font_size.value = item_props.value.font_size;
		font_color.value = item_props.value.font_color;
	});

	watch(countdown_mode, (countdown_mode) => {
		item_props.value.mode = countdown_mode;
	});

	watch(time, (time) => {
		item_props.value.time = time;
	});

	watch(show_seconds, (show_seconds) => {
		item_props.value.show_seconds = show_seconds;
	});

	watch(position, (position) => {
		item_props.value.position = position;
	});

	watch(font_size, (font_size) => {
		item_props.value.font_size = font_size;
	});

	watch(font_color, (font_color) => {
		item_props.value.font_color = font_color;
	});
</script>

<template>
	<CountdownEditor
		v-model:countdown_mode="countdown_mode"
		v-model:font_size="font_size"
		v-model:font_color="font_color"
		v-model:position="position"
		v-model:show_seconds="show_seconds"
		v-model:time="time"
	/>
</template>

<style scoped></style>

<script setup lang="ts">
	import { onUnmounted, ref, watchEffect } from "vue";

	import CountdownEditor from "../ItemDialogue/CountdownEditor.vue";

	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ClientCountdownItem } from "@server/PlaylistItems/Countdown";
	import { CountdownMode } from "@server/lib";

	const props = defineProps<{
		ws: WebSocket;
		item_index: number;
	}>();

	const countdown_mode = ref<CountdownMode>(CountdownMode.EndTime);
	const time = ref<string>(new Date(Date.now()).toLocaleTimeString());
	const show_seconds = ref<boolean>(true);
	const position = ref<{ x: number; y: number }>({ x: 50, y: 50 });
	const font_size = ref<number>(20);
	const font_color = ref<string>("#FFFFFF");

	const item_props = defineModel<ClientCountdownItem>("item_props", { required: true });

	watchEffect(() => {
		countdown_mode.value = item_props.value.mode;
		time.value = item_props.value.time;
		show_seconds.value = item_props.value.show_seconds;
		position.value = item_props.value.position;
		font_size.value = item_props.value.font_size;
		font_color.value = item_props.value.font_color;
	});

	onUnmounted(() => {
		const message: JGCPRecv.UpdateItem = {
			command: "update_item",
			index: props.item_index,
			props: {
				...item_props.value,
				font_size: font_size.value,
				mode: countdown_mode.value,
				position: position.value,
				show_seconds: show_seconds.value,
				time: time.value
			}
		};

		props.ws.send(JSON.stringify(message));
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

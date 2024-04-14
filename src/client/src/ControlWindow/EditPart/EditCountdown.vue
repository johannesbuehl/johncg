<script setup lang="ts">
	import { onUnmounted, ref, watchEffect } from "vue";

	import CountdownEditor from "../AddPart/Parts/Countdown/CountdownEditor.vue";

	import type * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { CountdownMode, CountdownProps } from "@server/PlaylistItems/Countdown";

	const props = defineProps<{
		ws: WebSocket;
		item_index: number;
	}>();

	const countdown_mode = ref<CountdownMode>("end_time");
	const time = ref<string>(new Date(Date.now()).toLocaleTimeString());
	const show_seconds = ref<boolean>(true);
	const position = ref<{ x: number; y: number }>({ x: 50, y: 50 });
	const font_size = ref<number>(20);

	const item_props = defineModel<CountdownProps>("item_props", { required: true });

	watchEffect(() => {
		countdown_mode.value = item_props.value.mode;
		time.value = item_props.value.time;
		show_seconds.value = item_props.value.show_seconds;
		position.value = item_props.value.position;
		font_size.value = item_props.value.font_size;
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
		v-model:position="position"
		v-model:show_seconds="show_seconds"
		v-model:time="time"
	/>
</template>

<style scoped></style>

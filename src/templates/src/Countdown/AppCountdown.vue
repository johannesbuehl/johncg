<script setup lang="ts">
	import { ref } from "vue";

	import CountdownTemplate from "./CountdownTemplate.vue";

	import type CasparCGGlobalFunctions from "@/CasparCGGlobals";

	import type { CountdownTemplateData } from "@server/PlaylistItems/Countdown";
	import { CountdownMode } from "@server/lib";

	const data = ref<CountdownTemplateData & { mute_transition: boolean }>({
		position: { x: 50, y: 50 },
		font_size: 50,
		font_color: "#ffffff",
		time: "00:00:00",
		show_seconds: true,
		mode: CountdownMode.Stopwatch,
		mute_transition: true
	});
	const visible = ref<boolean>(false);

	// CasparCG-function: transmits data
	function update(s_data: string) {
		// parse the transferred data into json
		try {
			data.value = JSON.parse(s_data) as CountdownTemplateData & {
				mute_transition: boolean;
			};
		} catch (error) {
			if (!(error instanceof SyntaxError)) {
				throw error;
			} else {
				return;
			}
		}
	}

	// CasparCG-function: displays the template
	function play() {
		visible.value = true;
	}

	// CasparCG-function: advances to the next step
	function next() {}

	// CasparCG-function: hide the template
	function stop() {
		visible.value = false;
	}

	(globalThis as unknown as CasparCGGlobalFunctions).update = update;
	(globalThis as unknown as CasparCGGlobalFunctions).play = play;
	(globalThis as unknown as CasparCGGlobalFunctions).stop = stop;
	(globalThis as unknown as CasparCGGlobalFunctions).next = next;
	play();
</script>

<template>
	<CountdownTemplate :data="data" :mute_transition="data.mute_transition" :hidden="!visible" />
</template>

<style scoped></style>

<style>
	body {
		overflow: hidden;

		margin: 0;

		font-size: calc(1600vh / 1080);
	}
</style>

<script setup lang="ts">
	import { ref } from "vue";

	import type { PsalmTemplateData, PsalmTemplateMessage } from "@server/PlaylistItems/Psalm";
	import type CasparCGGlobalFunctions from "@/CasparCGGlobals";
	import PsalmTemplate from "./PsalmTemplate.vue";

	const data = ref<PsalmTemplateData & { mute_transition: boolean }>({
		command: "data",
		mute_transition: true,
		slide: 0,
		data: {
			metadata: {
				caption: "",
				indent: false
			},
			text: []
		}
	});
	const visible = ref<boolean>(false);

	const active_slide = ref<number>(0);

	// CasparCG-function: transmits data
	function update(s_data: string) {
		let recieved_data: PsalmTemplateMessage & { mute_transition: boolean };
		// parse the transferred data into json
		try {
			recieved_data = JSON.parse(s_data) as PsalmTemplateMessage & {
				mute_transition: boolean;
			};
		} catch (error) {
			if (!(error instanceof SyntaxError)) {
				throw error;
			} else {
				return;
			}
		}

		// handle the different message-types
		switch (recieved_data.command) {
			case "jump":
				jump(recieved_data.slide);
				break;
			case "data":
				load_psalm(recieved_data);
				break;
		}
	}

	function load_psalm(recieved_data: PsalmTemplateData & { mute_transition: boolean }) {
		data.value = recieved_data;

		active_slide.value = data.value.slide;
	}

	// CasparCG-function: displays the template
	function play() {
		visible.value = true;
	}

	// CasparCG-function: advances to the next step
	function next() {
		jump(active_slide.value + 1);
	}

	// custom-function (through invoke): jump to an arbitrary slide
	function jump(counter_raw: number) {
		active_slide.value = counter_raw;
	}

	// CasparCG-function: hide the template
	function stop() {
		visible.value = false;
	}

	(globalThis as unknown as CasparCGGlobalFunctions).update = update;
	(globalThis as unknown as CasparCGGlobalFunctions).play = play;
	(globalThis as unknown as CasparCGGlobalFunctions).stop = stop;
	(globalThis as unknown as CasparCGGlobalFunctions).next = next;
</script>

<template>
	<PsalmTemplate
		:data="data"
		:active_slide="active_slide"
		:mute_transition="data.mute_transition"
		:hidden="!visible"
	/>
</template>

<style scoped></style>

<style>
	body {
		overflow: hidden;

		margin: 0;

		font-size: calc(1600vh / 1080);
	}
</style>

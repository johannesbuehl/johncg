<script setup lang="ts">
	import { onMounted, ref } from "vue";

	import SongTemplate from "./SongTemplate.vue";

	import type { SongTemplateData, SongTemplateMessage } from "@server/PlaylistItems/Song";

	const data = ref<SongTemplateData & { mute_transition: boolean }>({
		command: "data",
		mute_transition: true,
		parts: [],
		slide: 0,
		languages: []
	});
	const visible = ref<boolean>(false);

	const active_slide = ref<number>(0);
	let slide_count = 0;

	// CasparCG-function: transmits data
	function update(s_data: string) {
		let recieved_data: SongTemplateMessage & { mute_transition: boolean };
		// parse the transferred data into json
		try {
			recieved_data = JSON.parse(s_data) as SongTemplateMessage & {
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
				load_song(recieved_data);
				break;
		}
	}

	function load_song(recieved_data: SongTemplateData & { mute_transition: boolean }) {
		data.value = recieved_data;

		active_slide.value = data.value.slide;

		slide_count = 0;
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

	(globalThis as any).update = update;
	(globalThis as any).play = play;
	(globalThis as any).stop = stop;
	(globalThis as any).next = next;
	(globalThis as any).jump = jump;
</script>

<template>
	<SongTemplate
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

<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import LowerThirds from "./LowerThirds.vue";

	import type CasparCGGlobalFunctions from "@/CasparCGGlobals";

	import type { BibleJSON } from "@server/PlaylistItems/Bible";

	library.add(fas.faBible);

	const data = ref<BibleJSON & { mute_transition: boolean }>({
		mute_transition: false,
		text: ""
	});
	const visible = ref<boolean>(false);

	// CasparCG-function: transmits data
	function update(s_data: string) {
		// parse the transferred data into json
		try {
			data.value = JSON.parse(s_data) as BibleJSON & {
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

	// CasparCG-function: hide the template
	function stop() {
		visible.value = false;
	}

	(globalThis as unknown as CasparCGGlobalFunctions).update = update;
	(globalThis as unknown as CasparCGGlobalFunctions).play = play;
	(globalThis as unknown as CasparCGGlobalFunctions).stop = stop;
</script>

<template>
	<LowerThirds :text="data.text" icon="bible" :visible="visible" />
</template>

<style scoped></style>

<style>
	body {
		overflow: hidden;

		margin: 0;

		font-size: calc(1600vh / 1080);
	}
</style>

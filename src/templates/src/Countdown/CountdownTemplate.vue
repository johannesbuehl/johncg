<script setup lang="ts">
	import { CountdownMode } from "@server/lib";
	import type { CountdownTemplateData } from "@server/PlaylistItems/Countdown";
	import { ref, watch } from "vue";

	const props = defineProps<{
		data: CountdownTemplateData;

		mute_transition?: boolean;
		hidden?: boolean;
	}>();

	interface Time {
		hours: string;
		minutes: string;
		seconds: string;
	}
	const date_object = ref<Time>({ hours: "", minutes: "", seconds: "" });
	const ready = ref<boolean>(false);
	let start_time: Date = new Date();
	let end_time: Date = new Date();

	setInterval(() => {
		switch (props.data.mode) {
			case CountdownMode.Clock:
				date_object.value = create_time_object(new Date());
				break;
			case CountdownMode.EndTime:
			case CountdownMode.Duration: {
				const remaining_time = end_time.getTime() - Date.now();

				if (Math.sign(remaining_time) > 0) {
					date_object.value = create_utc_time_object(new Date(remaining_time));
				} else {
					date_object.value = { hours: "00", minutes: "00", seconds: "00" };
				}

				break;
			}
			case CountdownMode.Stopwatch:
				date_object.value = create_utc_time_object(new Date(Date.now() - start_time.getTime()));
				break;
		}

		ready.value = true;
	}, 100);

	function create_utc_time_object(dt: Date): Time {
		return {
			hours: dt.getUTCHours().toString().padStart(2, "0"),
			minutes: dt.getUTCMinutes().toString().padStart(2, "0"),
			seconds: dt.getUTCSeconds().toString().padStart(2, "0")
		};
	}

	function create_time_object(dt: Date): Time {
		return {
			hours: dt.getHours().toString().padStart(2, "0"),
			minutes: dt.getMinutes().toString().padStart(2, "0"),
			seconds: dt.getSeconds().toString().padStart(2, "0")
		};
	}

	watch(
		() => props.data.time,
		() => {
			ready.value = false;
			start_time = new Date();

			if (props.data.mode === CountdownMode.Duration || props.data.mode === CountdownMode.EndTime) {
				const date = props.data.time.match(/(?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+)/);

				if (date?.groups) {
					end_time = new Date();

					if (props.data.mode === CountdownMode.Duration) {
						end_time.setHours(
							end_time.getHours() + parseInt(date.groups.hours),
							end_time.getMinutes() + parseInt(date.groups.minutes),
							end_time.getSeconds() + parseInt(date.groups.seconds)
						);
					} else {
						end_time.setHours(
							parseInt(date.groups.hours),
							parseInt(date.groups.minutes),
							parseInt(date.groups.seconds)
						);

						// if the time is already passed, add another day
						if (end_time.getTime() < start_time.getTime()) {
							end_time.setHours(end_time.getHours() + 24);
						}
					}
				}
			}
		},
		{ immediate: true }
	);
</script>

<template>
	<div
		v-show="ready"
		id="time"
		:class="{ hidden, transition: !mute_transition }"
		:style="{
			fontSize: `${data.font_size * 0.25}em`,
			left: `${data.position.x}%`,
			top: `${data.position.y}%`,
			color: data.font_color
		}"
	>
		<span v-if="date_object.hours !== '00'" id="hours"
			><span v-for="cc in date_object.hours" class="time_char">{{ cc }}</span></span
		>
		<span id="minutes"
			><span v-for="cc in date_object.minutes" class="time_char">{{ cc }}</span></span
		>
		<span v-if="data.show_seconds" id="seconds"
			><span v-for="cc in date_object.seconds" class="time_char">{{ cc }}</span></span
		>
	</div>
</template>

<style scoped>
	* {
		box-sizing: border-box;

		font-family: Bahnschrift;
	}

	#time {
		position: absolute;

		transform: translate(-50%, -50%);

		text-wrap: nowrap;

		transition: opacity 0.5s ease;
	}

	#time.hidden {
		opacity: 0;
	}

	.time_char {
		display: inline-flex;

		justify-content: center;

		width: 1ch;
	}

	#hours:after,
	#seconds:before {
		content: ":";
	}
</style>

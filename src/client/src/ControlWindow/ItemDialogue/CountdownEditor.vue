<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import type { CountdownMode } from "@server/PlaylistItems/Countdown";

	library.add(
		fas.faCalendarXmark,
		fas.faHourglassEnd,
		fas.faStopwatch,
		fas.faClock,
		fas.faStopwatch20
	);

	const emit = defineEmits<{}>();

	const countdown_mode = defineModel<CountdownMode>("countdown_mode", { required: true });
	const time = defineModel<string>("time", { required: true });
	const show_seconds = defineModel<boolean>("show_seconds", { required: true });
	const position = defineModel<{ x: number; y: number }>("position", { required: true });
	const font_size = defineModel<number>("font_size", { required: true });
	const font_color = defineModel<string>("font_color", { required: true });

	const modes: Record<CountdownMode, { name: string; icon: string; time_selector?: string }> = {
		end_time: { name: "End Time", time_selector: "Countdown Ending Time", icon: "calendar-xmark" },
		duration: { name: "Duration", time_selector: "Countdown Duration", icon: "hourglass-end" },
		stopwatch: { name: "Stopwatch", icon: "stopwatch" },
		clock: { name: "Clock", icon: "clock" }
	};

	function input_change(event: Event) {
		const target = event.target as HTMLInputElement;

		let value = Number(target.value);

		if (target.max !== "") {
			value = Math.min(value, Number(target.max));
		}

		if (target.min !== "") {
			value = Math.max(value, Number(target.min));
		}

		target.value = value.toString();
	}
</script>

<template>
	<div id="countdown_editor_wrapper">
		<div class="editor_wrapper" id="mode_selector_wrapper">
			<div class="header">Mode</div>
			<div class="input_wrapper">
				<template v-for="[id, { name, icon }] in Object.entries(modes)">
					<input
						type="radio"
						name="countdown_mode"
						v-model="countdown_mode"
						:value="id"
						:id="`countdown_mode_${id}`"
						style="display: none"
					/>
					<label
						tabindex="0"
						:class="{ active: countdown_mode === id }"
						:for="`countdown_mode_${id}`"
					>
						<FontAwesomeIcon :icon="['fas', icon]" />
						{{ name }}
					</label>
				</template>
			</div>
		</div>
		<div class="editor_wrapper" v-show="modes[countdown_mode].time_selector !== undefined">
			<div class="header">{{ modes[countdown_mode].time_selector }}</div>
			<div id="time_input_wrapper">
				<input type="time" v-model="time" step="1" />
			</div>
		</div>
		<div class="editor_wrapper">
			<MenuButton v-model="show_seconds">
				<FontAwesomeIcon :icon="['fas', 'stopwatch-20']" />Show Seconds
			</MenuButton>
		</div>
		<div class="editor_wrapper">
			<div class="header">Position</div>
			<div class="input_wrapper" id="position_input_wrapper">
				<div class="named_input">
					x<input
						type="number"
						min="0"
						max="100"
						v-model="position.x"
						@change="input_change"
					/><span class="unit">%</span>
				</div>
				<div class="named_input">
					y<input
						type="number"
						min="0"
						max="100"
						v-model="position.y"
						@change="input_change"
					/><span class="unit">%</span>
				</div>
			</div>
		</div>
		<div class="editor_wrapper">
			<div class="header">Font</div>
			<div class="input_wrapper">
				<div class="named_input">
					<input type="number" min="0" v-model="font_size" @change="input_change" /><span
						class="unit"
						>pt</span
					>
				</div>
				<input
					id="font_color_picker"
					type="color"
					style="visibility: hidden; position: absolute"
					v-model="font_color"
				/>
				<label id="props_color" for="font_color_picker" :style="{ backgroundColor: font_color }" />
			</div>
		</div>
	</div>
</template>

<style scoped>
	#countdown_editor_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;

		border-radius: 0.25rem;
	}

	.header {
		text-align: center;

		background-color: var(--color-item);

		border-radius: 0.25rem;

		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
	}

	.editor_wrapper {
		background-color: var(--color-container);

		border-radius: inherit;

		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.editor_wrapper:last-child {
		flex: 1;
	}

	.input_wrapper {
		display: flex;
		gap: 0.25rem;

		padding: 0.25rem;
	}

	.input_wrapper > label {
		flex: 1;
		display: flex;
		gap: 0.5rem;

		align-items: center;
		justify-content: center;

		background-color: var(--color-item);

		padding: 0.5rem;

		border-radius: 0.25rem;

		cursor: pointer;
	}

	.input_wrapper > label:hover {
		background-color: var(--color-item-hover);
	}

	.input_wrapper > label.active {
		background-color: var(--color-active);
	}

	.input_wrapper > label.active:hover {
		background-color: var(--color-active-hover);
	}

	#time_input_wrapper {
		padding: 0.25rem;
	}

	input {
		text-align: center;

		font-size: 1.5rem;
		font-weight: lighter;

		background-color: var(--color-item);

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;

		flex: 1;
	}

	input:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	.named_input {
		font-size: 1.5em;

		flex: 1;
		display: flex;
		gap: 0.5rem;

		align-items: center;

		position: relative;
	}

	.named_input > input + .unit {
		font-weight: lighter;

		position: absolute;
		right: 1rem;

		height: 100%;

		display: flex;

		align-items: center;
	}

	input[type="time"]:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	input[type="time"]::placeholder {
		color: var(--color-text-disabled);
	}

	input[type="time"]:focus::after {
		border: none;
	}

	input[type="time"]::-webkit-calendar-picker-indicator {
		filter: invert();
	}

	.named_input > input[type="number"]::-webkit-inner-spin-button {
		display: none;
	}

	#position_input_wrapper {
		gap: 1rem;
	}

	#props_color {
		flex: unset;

		aspect-ratio: 1;

		height: 100%;

		border-radius: 0.25rem;
	}
</style>

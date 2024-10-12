<script setup lang="ts">
	import { onBeforeUpdate } from "vue";

	import type { PsalmTemplateData } from "@server/PlaylistItems/Psalm";

	const props = defineProps<{
		data: PsalmTemplateData;

		active_slide: number;

		mute_transition?: boolean;
		hidden?: boolean;
	}>();

	let block_count = 0;
	/**
	 * retrieves the current indentations level and changes it
	 * @returns current indentation level
	 */
	function get_indent(): boolean {
		return props.data.data.metadata.indent && block_count++ % 2 === 1;
	}
	let slide_number = 0;
	/**
	 * gets and increases the current slide-number
	 * @returns current slide-number
	 */
	function get_inc_slide_number(): number {
		return slide_number++;
	}

	onBeforeUpdate(() => {
		block_count = 0;
		slide_number = 0;
	});
</script>

<template>
	<div id="slide_wrapper" :class="{ hidden, transition: !mute_transition }">
		<div id="title">
			<span>{{ data.data.metadata.caption }}</span>
			<span id="psalm_id">{{ data.data.metadata.id }}</span>
		</div>
		<div
			v-for="(slide, slide_index) of data.data.text"
			:key="slide_index"
			v-show="active_slide === get_inc_slide_number()"
			class="slide"
		>
			<div
				v-for="(block, block_index) of slide"
				:key="block_index"
				class="block"
				:class="{ indent: get_indent() }"
			>
				<div v-for="(line, line_index) of block" :key="line_index">
					{{ line }}
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
	* {
		box-sizing: border-box;

		cursor: pointer;

		user-select: none;
	}

	#slide_wrapper {
		font-size: 4em;

		font-family: Bahnschrift;

		position: absolute;

		left: 13%;
		right: 14%;
		top: 0;
		bottom: 0;
	}

	#slide_wrapper.transition {
		transition: opacity 0.5s linear;
	}

	#slide_wrapper.hidden {
		opacity: 0;
	}

	#title {
		color: white;

		font-size: 1.25em;

		margin-top: 0.375em;

		display: flex;

		gap: 0.5em;
	}

	#psalm_id {
		font-weight: lighter;
	}

	.slide {
		font-size: 0.825em;

		color: black;

		position: absolute;

		top: 14%;
		bottom: 9%;

		display: flex;
		flex-direction: column;

		gap: 0.375em;
	}

	.block.indent {
		margin-left: 2ch;
	}
</style>

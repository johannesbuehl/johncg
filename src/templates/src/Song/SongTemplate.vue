<script setup lang="ts">
	import { nextTick, onBeforeUpdate, onUpdated, ref, watch } from "vue";

	import TextLine from "./TextLine.vue";

	import type { SongTemplateData } from "@server/PlaylistItems/Song";

	const props = defineProps<{
		data: SongTemplateData;

		active_slide: number;

		mute_transition?: boolean;
		hidden?: boolean;
	}>();

	const ready = ref<boolean>(false);

	let slide_count = 0;
	function get_slide_index(): number {
		return slide_count++;
	}

	const lyric_slides = ref<HTMLDivElement[]>();
	const size_dummy = ref<HTMLDivElement>();
	watch(
		() => props.data,
		() => {
			// reset the font-size
			lyric_slides.value?.forEach((slide) => (slide.style.fontSize = ""));
			ready.value = false;

			nextTick(() => {
				let max_width = 0;
				let max_height = 0;

				lyric_slides.value?.forEach((slide) => {
					max_width = Math.max(max_width, slide.clientWidth);
					max_height = Math.max(max_height, slide.clientHeight);
				});

				if (size_dummy.value) {
					const width_ratio = size_dummy.value.clientWidth / max_width;
					const height_ratio = size_dummy.value.clientHeight / max_height;

					lyric_slides.value?.forEach(
						(slide) => (slide.style.fontSize = `${Math.min(width_ratio, height_ratio)}em`)
					);
				}

				ready.value = true;
			});
		},
		{ deep: true, immediate: true, flush: "post" }
	);

	onBeforeUpdate(() => {
		slide_count = 0;
	});
</script>

<template>
	<div id="slide_wrapper" :class="{ ready, hidden, transition: !mute_transition }">
		<template v-for="part of data.parts">
			<div
				v-if="part.type === 'title'"
				class="slide title"
				v-show="ready && get_slide_index() === active_slide"
			>
				<div id="title_container">
					<div
						v-for="(title_index, title_number) of data.languages"
						:class="[`language_${title_number}`]"
					>
						{{ part.title[title_index] }}
					</div>
				</div>
				<div id="song_id">
					{{ part.church_song_id }}
				</div>
			</div>
			<div
				v-else-if="part.type === 'lyric'"
				v-for="(slide, slide_index) of part.slides"
				v-show="!ready || get_slide_index() === active_slide"
				class="slide lyrics"
				ref="lyric_slides"
			>
				<template v-for="(line, line_index) of slide">
					<template v-for="(lang_number, lang_index) in data.languages">
						<template v-for="(lang, lang_line_index) in line">
							<TextLine
								v-if="lang.lang === lang_number"
								class="textline"
								:class="[`language_${lang_index}`]"
								:text="lang.text"
								:chords="data.chords?.[part.part][slide_index][line_index][lang_line_index].chords"
								:transpose_steps="data.transpose_steps"
							/>
						</template>
					</template>
				</template>
			</div>
		</template>
	</div>
	<div class="dummy" ref="size_dummy">
		<!-- <div></div> -->
	</div>
</template>

<style scoped>
	* {
		box-sizing: border-box;

		color: white;
	}

	#slide_wrapper {
		font-size: 8em;

		font-family: Bahnschrift;
	}

	.dummy {
		position: absolute;

		inset: 0;

		cursor: pointer;
	}

	.dummy > div {
		position: absolute;
		inset: 1em;

		background-color: red;
		opacity: 0.5;
	}

	#slide_wrapper:not(.ready) {
		width: fit-content;
	}

	#slide_wrapper:not(.ready) {
		opacity: 0;
	}

	#slide_wrapper.ready {
		position: absolute;
		inset: 0;
	}

	#slide_wrapper.ready > .slide {
		height: 100%;
		width: 100%;

		transition: opacity 0.5s linear;
		opacity: 1;
	}

	#slide_wrapper.ready.transition {
		transition: opacity 0.5s linear;
	}

	#slide_wrapper.hidden > .slide {
		opacity: 0;
	}

	.slide {
		padding: 1em;
	}

	.slide > * {
		text-shadow: calc(1em / 16) calc(1em / 16) calc(1em / 8) black;

		overflow: visible;
	}

	.slide.title {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.title {
		font-family: "Bahnschrift Condensed";
	}

	#title_container > .language_1,
	#title_container > .language_2 #title_container > .language_3 {
		color: hsl(0 0% 62.5%);

		font-style: italic;
		font-size: 0.625em;
	}

	#song_id {
		font-size: 0.75em;
		font-weight: 100;
	}

	.slide.lyrics {
		display: flex;
		flex-direction: column;

		align-items: center;
		justify-content: center;
	}

	.textline.language_1,
	.textline.language_2,
	.textline.language_3 {
		color: hsl(0 0% 62.5%);
		font-size: 0.625em;
		font-style: italic;
	}
</style>

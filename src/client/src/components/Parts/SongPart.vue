<script setup lang="ts">
import ItemSlide from "./ItemSlide.vue";

import type { ActiveItemSlide } from "../../../../server/Playlist";
import type { SongPartClient } from "../../../../server/PlaylistItems/Song";
import type { Template } from "../../../../server/PlaylistItems/PlaylistItem";

const props = defineProps<{
	slide?: SongPartClient;
	media?: string;
	template?: Template;
	aspect_ratio: string;
	active_item_slide?: ActiveItemSlide;
	scroll?: boolean;
}>();

defineEmits<{
	select_slide: [slide: number];
}>();

interface CasparCGTemplate extends Window {
	update: (data_string: string) => void;
	play: () => void;
	stop: () => void;
	next: () => void;
}

interface JohnCGSongTemplate extends CasparCGTemplate {
	jump: (slide: number) => void;
}

function template_loaded(template_object: HTMLObjectElement, index: number) {
	const contentWindows: JohnCGSongTemplate = template_object.contentWindow as JohnCGSongTemplate;

	contentWindows.update(JSON.stringify({ ...props.template?.data, mute_transition: true }));
	contentWindows.jump(index); // add slide_index
	contentWindows.play();
}
</script>

<template>
	<div class="slide_part">
		<div
			class="header"
			:class="{
				active:
					(active_item_slide?.slide ?? 0) >= (slide?.start_index ?? 0) &&
					(active_item_slide?.slide ?? 0) < (slide?.start_index ?? 0) + (slide?.slides ?? 0)
			}"
			@click="$emit('select_slide', slide?.start_index ?? 0)"
		>
			{{ slide?.part }}
		</div>
		<div class="slides_wrapper">
			<ItemSlide
				v-for="_index in slide?.slides"
				:key="(slide?.start_index ?? 0) + _index - 1"
				:media="media"
				:template="template"
				:aspect_ratio="aspect_ratio"
				:active="(slide?.start_index ?? 0) + _index - 1 === active_item_slide?.slide"
				:scroll="scroll"
				@template_load="template_loaded($event, (slide?.start_index ?? 0) + _index - 1)"
				@click="$emit('select_slide', (slide?.start_index ?? 0) + _index - 1)"
			/>
		</div>
	</div>
</template>

<style scoped>
.slide_part {
	border-radius: inherit;
	overflow: visible;

	display: inline-block;
}

.header {
	background-color: var(--color-item);
	font-weight: bold;

	border-radius: inherit;
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;

	padding: 0.5rem;
	padding-left: 0.75rem;

	cursor: pointer;
}

.header:hover {
	background-color: var(--color-item-hover);
}

.header.active {
	background-color: var(--color-active);
}

.slides_wrapper {
	display: flex;
	flex-wrap: wrap;

	align-items: center;

	/* padding: 0.125rem;
	gap: 0.25rem; */
}
</style>

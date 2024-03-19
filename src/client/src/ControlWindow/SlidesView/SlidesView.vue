<script setup lang="ts">
	import * as JGCPSend from "@server/JGCPSendMessages";
	import type { ActiveItemSlide } from "@server/Playlist";

	import SongPart from "./Parts/SongPart.vue";
	import CountdownPart from "./Parts/CountdownPart.vue";
	import MediaPart from "./Parts/MediaPart.vue";
	import PDFPart from "./Parts/PDFPart.vue";
	import TemplatePart from "./Parts/TemplatePart.vue";

	const props = defineProps<{
		slides?: JGCPSend.ItemSlides;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	defineEmits<{
		select_slide: [slide: number];
	}>();

	const aspect_ratio: string = (
		(props.slides?.resolution.width ?? 1920) / (props.slides?.resolution.height ?? 1080)
	).toString();
</script>

<template>
	<div class="slides_view_container" v-if="slides?.type === 'song'">
		<SongPart
			v-for="slide of slides?.slides"
			:key="`${slides.item}-${slide.start_index}`"
			:slide="slide"
			:media="slides.media"
			:template="slides.template"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			:scroll="scroll"
			@select_slide="$emit('select_slide', $event)"
		/>
	</div>
	<div class="slides_view_container" v-if="slides?.type === 'countdown'">
		<CountdownPart
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			@select_slide="$emit('select_slide', $event)"
		/>
	</div>
	<div class="slides_view_container" v-if="slides?.type === 'media'">
		<MediaPart
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			@select_slide="$emit('select_slide', $event)"
		/>
	</div>
	<div class="slides_view_container" v-if="slides?.type === 'template'">
		<TemplatePart
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			@select_slide="$emit('select_slide', $event)"
		/>
	</div>
	<div class="slides_view_container" v-if="slides?.type === 'pdf'">
		<PDFPart
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			@select_slide="$emit('select_slide', $event)"
		/>
	</div>
</template>

<style scoped>
	.slides_view_container {
		background-color: var(--color-container);

		border-radius: 0.25rem;

		overflow: auto;

		flex: 1;

		/* display: flex;
	flex-wrap: wrap;
	align-content: flex-start;
	gap: 0.5rem; */
	}
</style>

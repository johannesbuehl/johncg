<script setup lang="ts">
	import type * as JCGPSend from "@server/JCGPSendMessages";
	import type { ActiveItemSlide } from "@server/Playlist";

	import SongPart from "./Parts/SongPart.vue";
	import CountdownPart from "./Parts/CountdownPart.vue";
	import MediaPart from "./Parts/MediaPart.vue";
	import PDFPart from "./Parts/PDFPart.vue";
	import TemplatePart from "./Parts/TemplatePart.vue";
	import PsalmPart from "./Parts/PsalmPart.vue";

	const props = defineProps<{
		slides?: JCGPSend.ItemSlides;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		select_slide: [slide: number];
	}>();

	const aspect_ratio: string = (
		(props.slides?.resolution.width ?? 1920) / (props.slides?.resolution.height ?? 1080)
	).toString();
</script>

<template>
	<div class="slides_view_container" v-if="slides?.type !== undefined">
		<SongPart
			v-if="slides?.type === 'song'"
			:slides="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			:scroll="scroll"
			@select_slide="emit('select_slide', $event)"
		/>
		<PsalmPart
			v-if="slides.type === 'psalm'"
			:slides="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			:scroll="scroll"
			@select_slide="emit('select_slide', $event)"
		/>
		<CountdownPart
			v-if="slides?.type === 'countdown'"
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			@select_slide="emit('select_slide', $event)"
		/>
		<MediaPart
			v-if="slides?.type === 'media'"
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			@select_slide="emit('select_slide', $event)"
		/>
		<TemplatePart
			v-if="slides?.type === 'template' || slides?.type === 'bible'"
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			@select_slide="emit('select_slide', $event)"
		/>
		<PDFPart
			v-if="slides?.type === 'pdf'"
			:slide="slides"
			:aspect_ratio="aspect_ratio"
			:active_item_slide="slides.item === active_item_slide?.item ? active_item_slide : undefined"
			:scroll="scroll"
			@select_slide="emit('select_slide', $event)"
		/>
	</div>
</template>

<style scoped>
	.slides_view_container {
		background-color: var(--color-container);

		border-radius: 0.25rem;

		overflow: auto;

		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;

		gap: 0.25rem;
	}
</style>

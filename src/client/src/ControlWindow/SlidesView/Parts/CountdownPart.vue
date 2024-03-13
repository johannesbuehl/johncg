<script setup lang="ts">
	import ItemSlide from "./ItemSlide.vue";

	import type { ActiveItemSlide } from "@server/Playlist";
	import type { CountdownSlides } from "@server/JGCPSendMessages";

	const props = defineProps<{
		slide?: CountdownSlides;
		aspect_ratio: string;
		active_item_slide?: ActiveItemSlide;
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

	function template_loaded(template_object: HTMLObjectElement) {
		const contentWindows: CasparCGTemplate = template_object.contentWindow as CasparCGTemplate;

		contentWindows.update(JSON.stringify({ ...props.slide?.template.data, mute_transition: true }));
		contentWindows.play();
	}
</script>

<template>
	<div class="slide_part">
		<div
			class="header"
			:class="{ active: 0 === active_item_slide?.slide }"
			@click="$emit('select_slide', 0)"
		>
			{{ slide?.title }}
		</div>
		<div class="slides_wrapper">
			<ItemSlide
				:media="slide?.media_b64"
				:template="slide?.template"
				:aspect_ratio="aspect_ratio"
				:active="0 === active_item_slide?.slide"
				@template_load="template_loaded"
				@click="$emit('select_slide', 0)"
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

		padding: 0.5rem;
		gap: 0.25rem;
	}
</style>

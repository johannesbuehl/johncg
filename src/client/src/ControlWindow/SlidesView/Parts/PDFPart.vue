<script setup lang="ts">
	import ItemSlide from "./ItemSlide.vue";

	import type { ActiveItemSlide } from "@server/Playlist";
	import type { ClientPDFSlides } from "@server/PlaylistItems/PDF";

	defineProps<{
		slide?: ClientPDFSlides;
		aspect_ratio: string;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
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
		const contentWindow: JohnCGSongTemplate = template_object.contentWindow as JohnCGSongTemplate;

		contentWindow.jump(index); // add slide_index
		contentWindow.play();
	}
</script>

<template>
	<div class="slide_part">
		<div
			class="header"
			:class="{ active: active_item_slide?.item !== undefined }"
			@click="emit('select_slide', 0)"
		>
			{{ slide?.title }}
		</div>
		<div class="slides_wrapper">
			<ItemSlide
				v-for="(_media, index) in slide?.slides"
				:key="index"
				:media="_media"
				:aspect_ratio="aspect_ratio"
				:active="index === active_item_slide?.slide"
				:scroll="scroll"
				@onLoaded="template_loaded($event, index)"
				@click="emit('select_slide', index)"
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

		transition: background-color 0.25s ease;
	}

	.header:hover {
		background-color: var(--color-item-hover);
	}

	.header.active {
		background-color: var(--color-active);
	}

	.slides_wrapper {
		padding: 0.25rem;

		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
</style>

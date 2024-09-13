<script setup lang="ts">
	import type { ActiveItemSlide } from "@server/Playlist";
	import type { ClientPsalmSlides } from "@server/PlaylistItems/Psalm";
	import ItemSlideWrapper from "./ItemSlideWrapper.vue";
	import PsalmTemplate from "@templates/Psalm/PsalmTemplate.vue";

	// const props =
	defineProps<{
		slides: ClientPsalmSlides;
		aspect_ratio: string;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		select_slide: [slide: number];
	}>();

	// interface CasparCGTemplate extends Window {
	// 	update: (data_string: string) => void;
	// 	play: () => void;
	// 	stop: () => void;
	// 	next: () => void;
	// }

	// interface JohnCGSongTemplate extends CasparCGTemplate {
	// 	jump: (slide: number) => void;
	// }

	// function template_loaded(template_object: HTMLObjectElement, index: number) {
	// 	const contentWindow: JohnCGSongTemplate = template_object.contentWindow as JohnCGSongTemplate;

	// 	contentWindow.update(JSON.stringify({ ...props.slides.template.data, mute_transition: true }));
	// 	contentWindow.jump(index);
	// 	contentWindow.play();
	// }
</script>

<template>
	<div class="slide_part">
		<div
			class="header"
			:class="{ active: active_item_slide?.item !== undefined }"
			@click="emit('select_slide', 0)"
		>
			{{ slides?.title }}
		</div>
		<div class="slides_wrapper">
			<ItemSlideWrapper
				v-for="(_media, index) in slides.template.data.data?.text"
				:key="index"
				:media="slides.media"
				:aspect_ratio="aspect_ratio"
				:active="index === active_item_slide?.slide"
				:scroll="scroll"
				@click="emit('select_slide', index)"
			>
				<PsalmTemplate :data="slides.template.data" :active_slide="index" :mute_transition="true" />
			</ItemSlideWrapper>
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
		display: flex;
		flex-wrap: wrap;

		align-items: center;

		padding: 0.5rem;
		gap: 0.25rem;
	}
</style>

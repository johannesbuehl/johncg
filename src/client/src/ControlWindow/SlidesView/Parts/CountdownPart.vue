<script setup lang="ts">
	import type { ClientCountdownSlides } from "@server/PlaylistItems/Countdown";

	import type { ActiveItemSlide } from "@server/Playlist";
	import CountdownTemplate from "@templates/Countdown/CountdownTemplate.vue";
	import ItemSlideWrapper from "./ItemSlideWrapper.vue";

	// const props =
	defineProps<{
		slide?: ClientCountdownSlides;
		aspect_ratio: string;
		active_item_slide?: ActiveItemSlide;
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

	// function template_loaded(template_object: HTMLObjectElement) {
	// 	const contentWindow: CasparCGTemplate = template_object.contentWindow as CasparCGTemplate;

	// 	contentWindow.update(JSON.stringify({ ...props.slide?.template.data, mute_transition: true }));
	// 	contentWindow.play();
	// }
</script>

<template>
	<div class="slide_part">
		<div
			class="header"
			:class="{ active: 0 === active_item_slide?.slide }"
			@click="emit('select_slide', 0)"
		>
			{{ slide?.title }}
		</div>
		<div class="slides_wrapper">
			<ItemSlideWrapper
				v-if="slide !== undefined"
				:media="slide.media"
				:aspect_ratio="aspect_ratio"
				:active="0 === active_item_slide?.slide"
				@click="emit('select_slide', 0)"
			>
				<CountdownTemplate :data="slide.template.data" :mute_transition="true" />
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

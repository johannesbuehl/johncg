<script setup lang="ts">
	import { faInfo } from "@fortawesome/free-solid-svg-icons";

	import type { ClientTextSlides } from "@server/PlaylistItems/Text";
	import LowerThirds from "@templates/LowerThirds/LowerThirds.vue";

	import ItemSlideWrapper from "./ItemSlideWrapper.vue";
	import Globals from "@/Globals";

	defineProps<{
		slides: ClientTextSlides;
		aspect_ratio: string;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		select_slide: [slide: number];
	}>();
</script>

<template>
	<div class="slide_part">
		<div
			class="header"
			:class="{ active: Globals.active_item_slide?.item !== undefined }"
			@click="emit('select_slide', 0)"
		>
			{{ slides?.title }}
		</div>
		<div class="slides_wrapper">
			<ItemSlideWrapper
				:media="slides.media"
				:aspect_ratio="aspect_ratio"
				:active="Globals.is_active_slide(0)"
				:scroll="scroll"
				@click="emit('select_slide', 0)"
			>
				<LowerThirds :text="slides.template.data.text" :icon="faInfo" :visible="true" />
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

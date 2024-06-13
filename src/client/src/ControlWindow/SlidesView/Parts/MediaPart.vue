<script setup lang="ts">
	import type { ClientMediaProps } from "@server/PlaylistItems/Media";
	import ItemSlide from "./ItemSlide.vue";

	import type { ActiveItemSlide } from "@server/Playlist";

	defineProps<{
		slide?: ClientMediaProps;
		aspect_ratio: string;
		active_item_slide?: ActiveItemSlide;
	}>();

	const emit = defineEmits<{
		select_slide: [slide: number];
	}>();
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
			<ItemSlide
				:media="slide?.media"
				:aspect_ratio="aspect_ratio"
				:active="0 === active_item_slide?.slide"
				@click="emit('select_slide', 0)"
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
		display: flex;
		flex-wrap: wrap;

		align-items: center;

		padding: 0.5rem;
		gap: 0.25rem;
	}
</style>

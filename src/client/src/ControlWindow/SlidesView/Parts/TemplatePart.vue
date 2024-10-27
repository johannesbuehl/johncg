<script setup lang="ts">
	import ItemSlideWrapper from "./ItemSlideWrapper.vue";

	import type * as JCGPSend from "@server/JCGPSendMessages";

	import Globals from "@/Globals";

	defineProps<{
		slides: JCGPSend.ItemSlides & { type: "template" | "bible" | "text" };
		aspect_ratio: string;
	}>();

	const emit = defineEmits<{
		select_slide: [slide: number];
	}>();
</script>

<template>
	<div class="slide_part">
		<div
			class="header"
			:class="{ active: 0 === Globals.active_item_slide?.slide }"
			@click="emit('select_slide', 0)"
		>
			{{ slides?.title }}
		</div>
		<div class="slides_wrapper">
			<ItemSlideWrapper
				:aspect_ratio="aspect_ratio"
				:active="Globals.is_active_slide(0)"
				@click="emit('select_slide', 0)"
			>
				<div id="placeholder-text">
					<div id="template-name">
						{{ slides.template.template.toUpperCase() }}
					</div>
					<div id="template-data">
						{{ slides.template.data }}
					</div>
				</div>
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

	#placeholder-text {
		font-family: monospace;

		font-size: 8em;
		text-align: center;

		height: 100%;
		display: flex;
		gap: 0.25em;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	#template-name {
		font-weight: bold;

		overflow: visible;
	}

	#template-data {
		font-size: 0.75em;
	}
</style>

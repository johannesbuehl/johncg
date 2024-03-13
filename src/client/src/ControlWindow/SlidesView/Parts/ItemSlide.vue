<script setup lang="ts">
	import { watch, ref, onMounted } from "vue";

	import type { Template } from "@server/PlaylistItems/PlaylistItem";

	const props = defineProps<{
		media?: string;
		template?: Template;
		aspect_ratio: string;
		active?: boolean;
		scroll?: boolean;
	}>();

	const slide = ref<HTMLDivElement>();

	watch(
		() => [props.active, props.scroll],
		() => {
			scroll_into_view();
		}
	);

	onMounted(() => {
		scroll_into_view();
	});

	function scroll_into_view() {
		if (props.active && props.scroll) {
			slide.value?.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}

	defineEmits<{
		template_load: [template_object: HTMLObjectElement];
	}>();
</script>

<template>
	<div ref="slide" class="slide_wrapper">
		<img
			class="media"
			:src="media"
			:style="{ 'aspect-ratio': aspect_ratio, opacity: media ? 'unset' : '0' }"
		/>
		<object
			v-if="template"
			class="template"
			:data="`Templates/${template?.template}.html`"
			@load="$emit('template_load', $event.target as HTMLObjectElement)"
		/>
		<div class="slide" :class="{ active }" />
	</div>
</template>

<style scoped>
	.slide_wrapper {
		position: relative;

		border: 0.0625rem solid transparent;
		border-radius: 0.125rem;

		overflow: visible;

		margin: 0.0625rem;
	}

	.media {
		height: 12rem;

		display: block;

		margin: 0.0625rem;
	}

	.template {
		position: absolute;
		top: 0;
		left: 0;

		width: 100%;
		height: 100%;
	}

	.slide {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		cursor: pointer;

		border: 0.0625rem solid white;
		border-radius: 0.125rem;
	}

	.slide:hover {
		border-width: 0.125rem;
		border-radius: 0.1875rem;

		margin: -0.0625rem; /* difference in border width between selected and non-selected */

		z-index: 20;
	}

	.slide.active {
		border-color: red;
		border-width: 0.125rem;
		border-radius: 0.1875rem;

		z-index: 10;

		margin: -0.0625rem; /* difference in border width between selected and non-selected */
	}

	.slide.active:hover {
		border-width: 0.25rem;
		border-radius: 0.3125rem;

		margin: -0.1875rem; /* difference in border width between selected and non-selected */
	}
</style>

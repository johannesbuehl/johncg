<script lang="ts">
	export interface CasparCGTemplate extends Window {
		update: (data_string: string) => void;
		play: () => void;
		stop: () => void;
		next: () => void;
	}
</script>

<script setup lang="ts">
	import { watch, ref, onMounted } from "vue";

	const props = defineProps<{
		media?: string;
		aspect_ratio: string;
		active?: boolean;
		scroll?: boolean;
	}>();

	const slide = ref<HTMLDivElement>();

	const is_color = ref<boolean>(true);

	watch(
		() => props.media,
		() => {
			is_color.value = !!props.media?.match(/^#(?:(?:[\dA-Fa-f]{2}){3,4})$/);
		},
		{ immediate: true }
	);

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
</script>

<template>
	<div
		ref="slide"
		class="slide_wrapper"
		:class="{ active }"
		:style="{ fontSize: `${(16 * 12) / 1080}rem` }"
	>
		<img
			class="media"
			:src="media"
			:style="{
				aspectRatio: aspect_ratio,
				opacity: is_color || media === undefined ? '0' : 'unset',
				backgroundColor: is_color ? media : 'transparent'
			}"
			@error="($event.target as HTMLDivElement).style.opacity = '0'"
		/>
		<div class="template">
			<slot></slot>
		</div>
	</div>
</template>

<style scoped>
	.slide_wrapper {
		position: relative;

		outline: 0.0625rem solid white;

		border-radius: 0.125rem;

		overflow: visible;

		z-index: 10;

		transition: outline 0.25s ease;
	}

	.media {
		height: 12rem;

		display: block;
	}

	:slotted(*) {
		position: absolute;
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
	}

	.slide_wrapper:hover {
		outline-width: 0.125rem;
	}

	.slide_wrapper.active {
		outline: 0.125rem solid red;
	}

	.slide_wrapper.active:hover {
		outline-width: 0.25rem;
	}
</style>

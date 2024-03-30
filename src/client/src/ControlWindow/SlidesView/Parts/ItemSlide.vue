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

	import type { Template } from "@server/PlaylistItems/PlaylistItem";

	const props = defineProps<{
		media?: string;
		template?: Template;
		aspect_ratio: string;
		active?: boolean;
		scroll?: boolean;
	}>();

	const slide = ref<HTMLDivElement>();
	const template_ref = ref<HTMLObjectElement>();

	const is_color = props.media?.match(/^#(?:(?:[\dA-Fa-f]{2}){3,4})$/);

	watch(
		() => [props.active, props.scroll],
		() => {
			scroll_into_view();
		}
	);

	watch(
		() => props.template?.data,
		(data) => {
			if (template_ref.value !== undefined) {
				const contentWindow: CasparCGTemplate = template_ref.value
					.contentWindow as CasparCGTemplate;

				contentWindow.update(JSON.stringify({ ...data, mute_transition: true }));

				emit("template_load", template_ref.value);
			}
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

	const emit = defineEmits<{
		template_load: [template_object: HTMLObjectElement];
	}>();
</script>

<template>
	<div ref="slide" class="slide_wrapper" :class="{ active }">
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
		<object
			v-if="template"
			ref="template_ref"
			class="template"
			:data="`Templates/${template?.template}.html`"
			@load="emit('template_load', $event.target as HTMLObjectElement)"
		/>
		<div class="slide" />
	</div>
</template>

<style scoped>
	.slide_wrapper {
		position: relative;

		outline: 0.0625rem solid white;

		border-radius: 0.125rem;

		overflow: visible;

		z-index: 10;
	}

	.media {
		height: 12rem;

		display: block;
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

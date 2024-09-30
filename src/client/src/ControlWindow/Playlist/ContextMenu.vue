<script setup lang="ts">
	import { stop_event } from "@/App.vue";
	import { onMounted, onUnmounted } from "vue";

	// const props =
	defineProps<{
		position: {
			x: number;
			y: number;
		};
	}>();

	const emit = defineEmits<{
		close: [];
	}>();

	onMounted(() => {
		addEventListener("click", on_click_event);
		addEventListener("contextmenu", on_click_event);
	});

	onUnmounted(() => {
		removeEventListener("click", on_click_event);
		removeEventListener("contextmenu", on_click_event);
	});

	function on_click_event(event: MouseEvent) {
		emit("close");

		stop_event(event);
	}
</script>

<template>
	<div class="context_menu_wrapper" :style="{ top: position.y + 'px', left: position.x + 'px' }">
		<slot />
	</div>
</template>

<style scoped>
	.context_menu_wrapper {
		position: fixed;

		background-color: var(--color-page-background);

		display: flex;
		flex-direction: column;

		padding: 0.25rem;
		gap: 0.25rem;

		border-radius: 0.25rem;

		z-index: 9999;
	}

	:slotted(*) {
		padding: 0.25rem;

		cursor: pointer;

		border-radius: inherit;
	}

	:slotted(*:not(svg)) {
		background-color: var(--color-item);
	}

	:slotted(*:not(svg)):hover {
		background-color: var(--color-item-hover);
	}
</style>

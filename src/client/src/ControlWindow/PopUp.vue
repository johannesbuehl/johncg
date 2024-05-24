<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	library.add(fas.faXmark);

	const props = defineProps<{
		title: string;
		maximize?: boolean;
	}>();

	const emit = defineEmits<{}>();

	const active = defineModel<boolean>("active", { required: true });

	document.addEventListener("keydown", (event) => {
		if (event.code === "Escape" && active.value === true) {
			active.value = false;

			event.preventDefault();
			event.stopPropagation();
		}
	});
</script>

<template>
	<Transition>
		<div id="popup_wrapper" v-if="active" @click.self="active = false">
			<div id="popup_window" :class="{ maximize }">
				<div id="header">
					{{ title }}<FontAwesomeIcon :icon="['fas', 'xmark']" @click="active = false" />
				</div>
				<div id="popup_window_content">
					<slot></slot>
				</div>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
	.v-enter-active,
	.v-leave-active {
		transition: opacity 0.25s ease;
	}

	.v-enter-from,
	.v-leave-to {
		opacity: 0;
	}

	#popup_wrapper {
		position: absolute;

		inset: 0;

		z-index: 9999;

		backdrop-filter: blur(0.5rem) brightness(75%);

		display: flex;

		justify-content: center;
		align-items: center;
	}

	#popup_window {
		max-height: 95vh;
		max-width: 95vw;

		border-radius: 0.25rem;

		background-color: var(--color-container);

		display: flex;
		flex-direction: column;
	}

	#popup_window.maximize {
		height: 95vh;
		width: 95vw;
	}

	#header {
		padding: 0.5rem;

		background-color: var(--color-active);

		display: flex;
		justify-content: space-between;

		overflow: visible;
	}

	#header > svg {
		margin-left: 1rem;
		cursor: pointer;

		right: 0;
	}

	#popup_window_content {
		margin: 0.25rem;

		display: flex;
		flex: 1;
	}
</style>

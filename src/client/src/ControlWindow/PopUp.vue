<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	library.add(fas.faXmark);
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	const props = defineProps<{
		title: string;
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
		<div id="popup_wrapper" v-if="active">
			<div id="popup_window">
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
		border-radius: 0.25rem;

		background-color: var(--color-container);
	}

	#header {
		padding: 0.5rem;

		background-color: var(--color-active);

		display: flex;
		justify-content: space-between;
	}

	#header > svg {
		margin-left: 1rem;
		cursor: pointer;

		right: 0;
	}

	#popup_window_content {
		margin: 0.25rem;
	}
</style>

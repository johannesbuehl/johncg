<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	// const props =
	defineProps<{
		text: string;
		icon: string;
		visible: boolean;
	}>();
</script>

<template>
	<Transition name="slide-in" :duration="10000">
		<div v-if="visible" id="main">
			<div id="icon">
				<FontAwesomeIcon :icon="['fas', icon]" />
			</div>
			<div id="text_wrapper">
				<div id="text">
					{{ text }}
				</div>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
	#main {
		--slide-time: 0.3s;
		--roll--delay: 0.5s;
		--roll-time: 0.5s;

		font-size: 4em;

		position: absolute;

		bottom: 0;
		left: 0;

		padding-left: 1em;
		padding-bottom: 0.5em;

		display: flex;

		align-items: center;

		font-family: Bahnschrift;
	}

	/* sliding */
	.slide-in-enter-active,
	.slide-in-leave-active {
		transform: translate(0, 0);

		transition: transform var(--slide-time) cubic-bezier(0.2, 0, 0.39, 0);
	}

	.slide-in-leave-active {
		transition-delay: calc(var(--roll-time) + var(--roll--delay));
	}

	.slide-in-enter-from,
	.slide-in-leave-to {
		transform: translate(0, 100%);
	}

	/* rolling */
	.slide-in-enter-active #text_wrapper,
	.slide-in-leave-active #text_wrapper {
		transition: clip-path var(--roll-time) ease-out;

		clip-path: polygon(0 0, 0 100%, 100% 100%, 100% 0);
	}

	.slide-in-enter-active #text_wrapper {
		transition-delay: calc(var(--slide-time) + var(--roll--delay));
	}

	.slide-in-enter-from #text_wrapper,
	.slide-in-leave-to #text_wrapper {
		clip-path: polygon(0 0, 0 100%, 0 100%, 0 0);
	}

	#icon {
		font-size: 1.5em;

		width: 1em;

		background-color: white;

		padding: 0.375em;

		border-radius: 50%;

		z-index: 10;

		display: flex;
	}

	#icon > svg {
		aspect-ratio: 1;
	}

	#text_wrapper {
		overflow: hidden;

		background-color: white;

		border-radius: 0.5rem;

		transform: translate(-1.5em, 0);
	}

	#text {
		padding: 0.25em;
		padding-left: 1.5em;

		white-space: pre-wrap;
	}
</style>

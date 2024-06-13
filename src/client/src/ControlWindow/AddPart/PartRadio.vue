<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	defineProps<{
		text: string;
		value: string;
		icon: string;
	}>();

	const pick = defineModel<string>({ required: true });
</script>

<template>
	<input type="radio" :id="value" :value="value" v-model="pick" />
	<label
		tabindex="0"
		class="add_part_radio"
		:class="{ active: pick === value }"
		:for="value"
		@keydown.enter.prevent="pick = value"
	>
		<FontAwesomeIcon :icon="['fas', icon]" />
		{{ text }}
	</label>
</template>

<style scoped>
	input[type="radio"] {
		display: none;
	}

	.add_part_radio {
		background-color: var(--color-item);

		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;

		padding: 1rem;

		border-radius: 0.25rem;

		cursor: pointer;

		flex: 1;

		text-align: center;

		transition: background-color 0.25s ease;
	}

	.add_part_radio:hover {
		background-color: var(--color-item-hover);
	}

	.add_part_radio.active {
		background-color: var(--color-active);
	}

	.add_part_radio.active:hover {
		background-color: var(--color-active-hover);
	}
</style>

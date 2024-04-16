<script setup lang="ts">
	import { onMounted, ref } from "vue";

	const emit = defineEmits<{
		update: [];
	}>();

	const first_input = ref<HTMLInputElement>();

	const command_active = defineModel<string>("command_active", { required: true });
	const command_inactive = defineModel<string>("command_inactive", { required: true });

	onMounted(() => {
		first_input.value?.focus();
	});
</script>
<template>
	<div id="inputs_wrapper">
		Selection
		<input
			ref="first_input"
			class="input_box"
			v-model="command_active"
			placeholder="Command"
			@keydown="
				$event.stopPropagation();
				emit('update');
			"
		/>
		Deselection
		<input
			class="input_box"
			v-model="command_inactive"
			placeholder="Command"
			@keydown="
				$event.stopPropagation();
				emit('update');
			"
		/>
		<slot></slot>
	</div>
</template>

<style scoped>
	#inputs_wrapper {
		display: grid;
		grid-template-columns: auto 100%;
		row-gap: 0.25rem;
		column-gap: 0.5rem;
		align-items: center;

		font-size: 1.25em;
		font-weight: lighter;

		background-color: var(--color-container);

		padding: 0.25rem;

		border-radius: 0.25rem;
	}

	.input_box {
		font-size: 1.5rem;

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);

		flex: 1;
	}

	.input_box:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	.input_box::placeholder {
		color: var(--color-text-disabled);
	}

	.input_box:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}
</style>

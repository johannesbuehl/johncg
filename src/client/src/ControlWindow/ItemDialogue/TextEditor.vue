<script setup lang="ts">
	import { onMounted, ref } from "vue";

	const emit = defineEmits<{
		update: [];
	}>();

	const input = ref<HTMLInputElement>();

	const command_active = defineModel<string>("text", { required: true });

	onMounted(() => {
		input.value?.focus();
	});
</script>
<template>
	<div id="component_wrapper">
		<div id="inputs_wrapper">
			<textarea
				ref="input"
				class="text_box"
				v-model="command_active"
				placeholder="Text"
				@keydown="emit('update')"
			/>
		</div>
		<div id="slot_buttons">
			<slot></slot>
		</div>
	</div>
</template>

<style scoped>
	#component_wrapper {
		display: flex;
		flex-direction: column;
		flex: 1;

		gap: inherit;
	}

	#inputs_wrapper {
		display: flex;
		flex: 1;

		background-color: var(--color-container);
		border-radius: 0.25rem;

		padding: 0.25rem;
	}

	.text_box {
		font-size: 1.5rem;

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);

		display: flex;
		flex: 1;

		resize: none;
	}

	.text_box:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	.text_box::placeholder {
		color: var(--color-text-disabled);
	}

	.text_box:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	#slot_buttons {
		background-color: var(--color-container);
		border-radius: 0.25rem;
	}
</style>

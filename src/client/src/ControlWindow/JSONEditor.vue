<script setup lang="ts">
	import JsonEditorPlugin from "vue3-ts-jsoneditor";

	const content = defineModel<object>({
		required: true
	});

	const emit = defineEmits<{
		update: [];
	}>();
</script>

<template>
	<JsonEditorPlugin
		v-model:json="content"
		:indentation="'\t'"
		:tab-size="4"
		:read-only="false"
		:navigation-bar="false"
		:dark-theme="true"
		:full-width-button="false"
		@update:json="emit('update')"
	/>
</template>

<style scoped>
	.vue-ts-json-editor {
		display: flex;
		flex: 1;

		border-radius: 0.25rem;
	}
</style>

<style>
	.vue-ts-json-editor * {
		overflow: visible;

		--jse-theme-color: var(--color-container);
		--jse-theme-color-highlight: var(--color-item-hover);

		--jse-background-color: var(--color-container);
		--jse-panel-background: var(--color-container);
		--jse-panel-border: 0.125rem solid var(--color-item);

		--jse-key-color: var(--color-text);
		--jse-delimiter-color: var(--color-text-disabled);

		--jse-context-menu-color: var(--color-text);
		--jse-context-menu-background: var(--color-container);
		--jse-context-menu-separator-color: var(--color-item-hover);

		--jse-button-primary-background: var(--color-item);
	}

	.jse-value:not(.jse-boolean) {
		padding-left: 0 !important;
	}

	.jse-separator {
		margin-right: 0.5rem;
	}

	.jse-contents,
	.jse-table-mode-welcome {
		border: none !important;
	}

	.jse-contextmenu > * > .jse-tip {
		display: none !important;
	}

	.jse-menu {
		align-items: center !important;
	}

	.jse-menu > .jse-separator {
		height: 100%;
	}

	.jse-button {
		padding: 1rem !important;
	}

	.jse-button.jse-group-button {
		color: var(--color-text) !important;

		background-color: var(--color-item) !important;

		border-color: transparent !important;
		border-radius: 0.25rem !important;

		margin-inline: 0.125rem !important;
	}

	.jse-button.jse-group-button.jse-selected {
		background-color: var(--color-active) !important;
	}
</style>

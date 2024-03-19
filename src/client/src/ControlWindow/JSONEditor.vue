<script setup lang="ts">
	import { JSONEditor, type JSONContent } from "vanilla-jsoneditor";
	import { onMounted, onUnmounted, ref, watch } from "vue";

	import "vanilla-jsoneditor/themes/jse-theme-dark.css";

	const props = defineProps<{}>();

	const content = defineModel<JSONContent>({
		required: true
	});

	let editor: JSONEditor;

	const editor_ref = ref<HTMLDivElement>();

	onMounted(() => {
		editor = new JSONEditor({
			target: editor_ref.value as HTMLDivElement,
			props: {
				content: content.value ?? { json: {} },
				indentation: "\t",
				tabSize: 4,
				readOnly: false,
				navigationBar: false
			}
		});
		console.log("create editor", editor);
	});

	watch(props, (new_props) => {
		editor.updateProps(new_props);
	});

	onUnmounted(() => {
		editor.destroy();
	});
</script>

<template>
	<div class="svelte-jsoneditor-vue jse-theme-dark" ref="editor_ref"></div>
</template>

<style scoped>
	.svelte-jsoneditor-vue {
		display: flex;
		flex: 1;
	}
</style>

<style>
	.cm-content *:focus {
		border: none !important;
	}

	.svelte-jsoneditor-vue * {
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

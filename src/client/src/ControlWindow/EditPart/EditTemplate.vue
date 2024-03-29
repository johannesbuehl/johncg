<script setup lang="ts">
	import { ref, watch } from "vue";

	import JSONEditor from "@/ControlWindow/JSONEditor.vue";

	import type { TemplateProps } from "@server/PlaylistItems/Template";

	const emit = defineEmits<{
		update: [];
	}>();

	const item_props = defineModel<TemplateProps>("item_props", { required: true });
	const template_data = ref<object>(item_props.value.template.data ?? {});

	watch(
		() => item_props.value.template.data,
		(data) => {
			if (data !== undefined) {
				template_data.value = data;
			}
		}
	);

	function on_update() {
		item_props.value.template.data =
			Object.keys(template_data.value).length > 0 ? template_data.value : undefined;

		emit("update");
	}
</script>

<template>
	<JSONEditor v-model="template_data" @update="on_update" />
</template>

<style scoped></style>

<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";

	import JSONEditor from "@/ControlWindow/JSONEditor.vue";

	import type { ClientTemplateItem } from "@server/PlaylistItems/Template";

	defineProps<{
		item_index: number;
	}>();

	const item_props = defineModel<ClientTemplateItem>("item_props", { required: true });
	const template_data = ref<object>(item_props.value.template.data ?? {});

	onMounted(() => {
		if (item_props.value.template.data !== undefined) {
			template_data.value = item_props.value.template.data;
		}
	});

	watch(template_data, () => {
		update();
	});

	function update() {
		item_props.value.template.data =
			Object.keys(template_data.value).length > 0 ? template_data.value : undefined;
	}
</script>

<template>
	<JSONEditor v-model="template_data" @update="update" />
</template>

<style scoped></style>

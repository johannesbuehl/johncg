<script setup lang="ts">
	import { onUnmounted, ref, watch } from "vue";

	import JSONEditor from "@/ControlWindow/JSONEditor.vue";

	import type { ClientTemplateItem } from "@server/PlaylistItems/Template";
	import type * as JGCPRecv from "@server/JGCPReceiveMessages";

	const props = defineProps<{
		ws: WebSocket;
		item_index: number;
	}>();

	const item_props = defineModel<ClientTemplateItem>("item_props", { required: true });
	const template_data = ref<object>(item_props.value.template.data ?? {});

	watch(
		() => item_props.value.template.data,
		(data) => {
			if (data !== undefined) {
				template_data.value = data;
			}
		}
	);

	function update() {
		item_props.value.template.data =
			Object.keys(template_data.value).length > 0 ? template_data.value : undefined;
	}

	onUnmounted(() => {
		const message: JGCPRecv.UpdateItem = {
			command: "update_item",
			index: props.item_index,
			props: item_props.value
		};

		props.ws.send(JSON.stringify(message));
	});
</script>

<template>
	<JSONEditor v-model="template_data" @update="update" />
</template>

<style scoped></style>

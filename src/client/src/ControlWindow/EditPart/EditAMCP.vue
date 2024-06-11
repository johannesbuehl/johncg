<script setup lang="ts">
	import { onUnmounted, ref, watch } from "vue";

	import AMCPInput from "../ItemDialogue/AMCPInput.vue";

	import type * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ClientAMCPItem } from "@server/PlaylistItems/AMCP";
	import Globals from "@/Globals";

	const props = defineProps<{
		item_index: number;
	}>();

	const set_active_command = ref<string>("");
	const set_inactive_command = ref<string>("");

	const item_props = defineModel<ClientAMCPItem>("item_props", { required: true });

	watch(
		() => item_props.value.commands,
		(data) => {
			set_active_command.value = data.set_active ?? "";
			set_inactive_command.value = data.set_inactive ?? "";
		},
		{ deep: true, immediate: true }
	);

	onUnmounted(() => {
		item_props.value.commands.set_active =
			set_active_command.value.length > 0 ? set_active_command.value : undefined;
		item_props.value.commands.set_inactive =
			set_inactive_command.value.length > 0 ? set_inactive_command.value : undefined;

		Globals.ws?.send<JCGPRecv.UpdateItem>({
			command: "update_item",
			index: props.item_index,
			props: item_props.value
		});
	});
</script>

<template>
	<AMCPInput
		v-model:command_active="set_active_command"
		v-model:command_inactive="set_inactive_command"
	/>
</template>

<style scoped></style>

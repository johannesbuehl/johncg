<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";

	import AMCPInput from "../ItemDialogue/AMCPInput.vue";

	import type { ClientAMCPItem } from "@server/PlaylistItems/AMCP";

	defineProps<{
		item_index: number;
	}>();

	const set_active_command = ref<string>("");
	const set_inactive_command = ref<string>("");

	const item_props = defineModel<ClientAMCPItem>("item_props", { required: true });

	onMounted(() => {
		set_active_command.value = item_props.value.commands.set_active ?? "";
		set_inactive_command.value = item_props.value.commands.set_inactive ?? "";
	});

	watch(
		[set_active_command, set_inactive_command],
		([set_active_command, set_inactive_command]) => {
			item_props.value.commands = {
				set_active: set_active_command.length > 0 ? set_active_command : undefined,
				set_inactive: set_inactive_command.length > 0 ? set_inactive_command : undefined
			};
		}
	);
</script>

<template>
	<AMCPInput
		v-model:command_active="set_active_command"
		v-model:command_inactive="set_inactive_command"
	/>
</template>

<style scoped></style>

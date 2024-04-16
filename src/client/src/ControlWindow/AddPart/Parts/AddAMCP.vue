<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { onMounted, ref } from "vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import type { AMCPProps } from "@server/PlaylistItems/AMCP";
	import AMCPInput from "@/ControlWindow/ItemDialogue/AMCPInput.vue";

	library.add(fas.faPlus);

	const set_active_command = ref<string>("");
	const set_inactive_command = ref<string>("");

	const emit = defineEmits<{
		add: [item_props: AMCPProps];
		refresh: [];
	}>();

	function add_comment() {
		emit("add", {
			type: "amcp",
			caption: "AMCP-Command",
			color: "#FF00FF",
			commands: {
				set_active: set_active_command.value.length > 0 ? set_active_command.value : undefined,
				set_inactive: set_inactive_command.value.length > 0 ? set_inactive_command.value : undefined
			}
		});
	}
</script>

<template>
	<AMCPInput
		v-model:command_active="set_active_command"
		v-model:command_inactive="set_inactive_command"
	>
		<MenuButton @click="add_comment">
			<FontAwesomeIcon :icon="['fas', 'plus']" />Add AMCP-Command
		</MenuButton>
	</AMCPInput>
</template>

<style scoped></style>

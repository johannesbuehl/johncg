<script setup lang="ts">
	import { ref } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import MediaDialogue from "@/ControlWindow/FileDialogue/MediaDialogue.vue";

	import type { MediaProps } from "@server/PlaylistItems/Media";
	import type { CasparFile, Node } from "@server/search_part";
	import Globals from "@/Globals";

	library.add(fas.faPlus, fas.faRepeat);

	const emit = defineEmits<{
		add: [item_props: MediaProps];
	}>();

	const selection = defineModel<CasparFile>({});
	const loop = ref<boolean>(false);

	function add_media(file: Node<"media"> | undefined) {
		if (file !== undefined && !file.is_dir) {
			emit("add", create_props(file));
		}
	}

	function create_props(file: CasparFile): MediaProps {
		return {
			type: "media",
			caption: file.name,
			color: Globals.color.media,
			media: file.path,
			loop: loop.value
		};
	}
</script>

<template>
	<MediaDialogue :create_props_callback="create_props" @choose="add_media">
		<template v-slot:buttons>
			<MenuButton @click="loop = !loop" :active="loop">
				<FontAwesomeIcon :icon="['fas', 'repeat']" />Loop
			</MenuButton>
			<MenuButton @click="add_media(selection)">
				<FontAwesomeIcon :icon="['fas', 'plus']" />Add Media
			</MenuButton>
		</template>
	</MediaDialogue>
</template>

<style scoped>
	.button:not(:first-child) {
		flex: 1;
	}
</style>

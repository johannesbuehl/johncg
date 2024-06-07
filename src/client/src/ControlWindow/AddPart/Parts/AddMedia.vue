<script setup lang="ts">
	import { onMounted, ref, watch } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import MediaDialogue from "@/ControlWindow/FileDialogue/MediaDialogue.vue";

	import type { MediaProps } from "@server/PlaylistItems/Media";
	import type { MediaFile } from "@server/search_part";

	library.add(fas.faPlus, fas.faRepeat);
	const props = defineProps<{
		files: MediaFile[];
		thumbnails: Record<string, string>;
	}>();

	const emit = defineEmits<{
		add: [item_props: MediaProps];
		refresh: [];
	}>();

	const selection = defineModel<MediaFile>({});
	const loop = ref<boolean>(false);

	function add_media(file: MediaFile | undefined) {
		if (file && file.children === undefined) {
			emit("add", create_props(file));
		}
	}

	// function create_props(file: ItemFile): MediaProps {
	function create_props(file: MediaFile): MediaProps {
		return {
			type: "media",
			caption: file.name,
			color: "#00FF00",
			media: file.path,
			loop: loop.value
		};
	}
</script>

<template>
	<MediaDialogue :files="files" :thumbnails="thumbnails" :create_props_callback="create_props">
		<template v-slot:buttons>
			<MenuButton @click="loop = !loop" :active="loop">
				<FontAwesomeIcon :icon="['fas', 'repeat']" />Loop
			</MenuButton>
			<MenuButton
				@click="
					selection !== undefined && selection.children === undefined
						? add_media(selection)
						: undefined
				"
			>
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

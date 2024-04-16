<script setup lang="ts">
	import EditSong from "./EditSong.vue";
	import EditBible from "./EditBible.vue";
	import EditTemplate from "./EditTemplate.vue";
	import EditCountdown from "./EditCountdown.vue";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type { BibleFile } from "@server/PlaylistItems/Bible";
	import type { ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";
	import EditAMCP from "./EditAMCP.vue";

	defineProps<{
		ws: WebSocket;
		files?: Record<JGCPSend.ItemFiles["type"], JGCPSend.ItemFiles["files"]>;
		item_index: number | null;
		bible?: BibleFile;
	}>();

	const item_props = defineModel<ClientPlaylistItem | undefined>("item_props", { required: true });
</script>

<template>
	<div id="edit_item_wrapper" v-if="item_index !== null">
		<div v-if="item_props?.type !== undefined" id="item_editor_general">
			<input
				id="color_picker"
				type="color"
				style="visibility: hidden; position: absolute"
				v-model="item_props.color"
			/>
			<label id="props_color" for="color_picker" :style="{ backgroundColor: item_props.color }" />
			<input
				id="props_caption"
				type="text"
				v-model="item_props.caption"
				placeholder="Item Caption"
			/>
		</div>
		<EditSong
			v-if="item_props?.type === 'song'"
			:key="`${item_index}_song`"
			v-model:item_props="item_props"
			:ws="ws"
			:song_file="files?.song"
			:item_index="item_index"
		/>
		<EditBible
			v-else-if="item_props?.type === 'bible'"
			:key="`${item_index}_bible`"
			v-model:item_props="item_props"
			:ws="ws"
			:bible="bible"
			:item_index="item_index"
		/>
		<EditTemplate
			v-else-if="item_props?.type === 'template'"
			:key="`${item_index}_template`"
			v-model:item_props="item_props"
			:ws="ws"
			:item_index="item_index"
		/>
		<EditCountdown
			v-else-if="item_props?.type === 'countdown'"
			:key="`${item_index}_countdown`"
			v-model:item_props="item_props"
			:ws="ws"
			:item_index="item_index"
		/>
		<EditAMCP
			v-else-if="item_props?.type === 'amcp'"
			:key="`${item_index}_amcp`"
			v-model:item_props="item_props"
			:ws="ws"
			:item_index="item_index"
		/>
		<div v-if="item_props?.type === undefined" id="edit_part_placeholder">
			Select an item in the playlist for editing
		</div>
	</div>
</template>

<style scoped>
	#edit_item_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: 0.25rem;
	}

	#item_editor_general {
		background-color: var(--color-container);

		display: flex;
		gap: 0.5rem;

		border-radius: 0.25rem;

		padding: 0.25rem;

		align-items: center;
	}

	#props_color {
		aspect-ratio: 1;

		height: 100%;

		display: flex;

		justify-content: center;
		align-items: center;

		border-radius: 0.25rem;
	}

	#props_caption {
		flex: 1;

		font-size: 1.5rem;

		padding: 0.25rem;

		font-weight: lighter;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);
	}

	#props_caption:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	#props_caption::placeholder {
		color: var(--color-text-disabled);
	}

	#props_caption:focus {
		font-weight: unset;

		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}

	#edit_part_placeholder {
		background-color: var(--color-container);

		padding: 0.25rem;

		border-radius: 0.25rem;

		flex: 1;
	}
</style>

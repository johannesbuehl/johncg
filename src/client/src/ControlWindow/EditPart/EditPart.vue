<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";

	import EditSong from "./EditSong.vue";
	import EditBible from "./EditBible.vue";
	import EditTemplate from "./EditTemplate.vue";
	import EditCountdown from "./EditCountdown.vue";
	import EditAMCP from "./EditAMCP.vue";
	import EditText from "./EditText.vue";
	import MenuButton from "../MenuBar/MenuButton.vue";

	import type * as JGCPSend from "@server/JGCPSendMessages";
	import type { BibleFile } from "@server/PlaylistItems/Bible";
	import type { ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";
	import EditDummy from "./EditDummy.vue";

	library.add(fas.faPen);

	const props = defineProps<{
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
			<MenuButton v-if="['song', 'psalm'].includes(item_props.type)">
				<FontAwesomeIcon :icon="['fas', 'pen']" />Edit
				{{ item_props.type === "song" ? "Song" : item_props.type === "psalm" ? "Psalm" : null }}
			</MenuButton>
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
		<EditText
			v-else-if="item_props?.type === 'text'"
			:key="`${item_index}_text`"
			v-model:item_props="item_props"
			:ws="ws"
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
		<div v-else-if="item_props?.type === undefined" id="edit_part_placeholder">
			Select an item in the playlist for editing
		</div>
		<EditDummy
			v-else
			:key="`${item_index}_dummy`"
			v-model:item_props="item_props"
			:ws="ws"
			:item_index="item_index"
		/>
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

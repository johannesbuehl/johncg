<script setup lang="ts">
	import { watch } from "vue";

	import EditSong from "./EditSong.vue";
	import EditBible from "./EditBible.vue";

	import * as JGCPSend from "@server/JGCPSendMessages";
	import * as JGCPRecv from "@server/JGCPReceiveMessages";
	import type { ItemProps } from "@server/PlaylistItems/PlaylistItem";
	import type { BibleFile } from "@server/PlaylistItems/Bible";
	import EditTemplate from "./EditTemplate.vue";

	const props = defineProps<{
		ws: WebSocket;
		search_results?: JGCPSend.ItemFile;
		item_index: number;
		bible?: BibleFile;
	}>();

	const item_props = defineModel<ItemProps | undefined>("item_props", { required: true });

	function update_item() {
		if (item_props.value !== undefined) {
			const message: JGCPRecv.UpdateItem = {
				command: "update_item",
				props: item_props.value,
				index: props.item_index
			};

			props.ws.send(JSON.stringify(message));
		}
	}

	let input_debounce_timeout_id: NodeJS.Timeout | undefined = undefined;
	watch(
		() => item_props.value?.caption,
		(new_caption) => {
			if (new_caption !== undefined && item_props.value !== undefined) {
				clearTimeout(input_debounce_timeout_id);

				input_debounce_timeout_id = setTimeout(() => {
					const message: JGCPRecv.UpdateItem = {
						command: "update_item",
						props: { ...item_props.value!, caption: new_caption },
						index: props.item_index
					};

					props.ws.send(JSON.stringify(message));
				}, 500);
			}
		}
	);
</script>

<template>
	<div id="edit_item_wrapper">
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
			v-model:item_props="item_props"
			:ws="ws"
			:song_data="search_results"
			@update="update_item"
		/>
		<EditBible
			v-else-if="item_props?.type === 'bible'"
			v-model:item_props="item_props"
			:ws="ws"
			:bible="bible"
			@update="update_item"
		/>
		<EditTemplate
			v-else-if="item_props?.type === 'template'"
			v-model:item_props="item_props"
			@update="update_item"
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
		display: block;

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

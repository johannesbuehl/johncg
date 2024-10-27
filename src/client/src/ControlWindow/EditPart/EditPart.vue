<script setup lang="ts">
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { onMounted, onUnmounted, ref } from "vue";

	import EditSong from "./EditSong.vue";
	import EditBible from "./EditBible.vue";
	import EditTemplate from "./EditTemplate.vue";
	import EditCountdown from "./EditCountdown.vue";
	import EditAMCP from "./EditAMCP.vue";
	import EditText from "./EditText.vue";
	import MenuButton from "../MenuBar/MenuButton.vue";
	import { ControlWindowState } from "@/Enums";
	import type { ItemData } from "@/App.vue";
	import Globals from "@/Globals";

	import * as JCGPRecv from "@server/JCGPReceiveMessages";
	import type { ClientPlaylistItem } from "@server/PlaylistItems/PlaylistItem";
	import type { ItemFileMap, ItemNodeMapped, SongFile } from "@server/search_part_types";

	library.add(fas.faPen);

	// const props =
	const props = defineProps<{
		files?: { [key in keyof ItemFileMap]: ItemNodeMapped<key>[] };
		item_index: number | null;
		item_data: ItemData;
		item_props?: ClientPlaylistItem;
	}>();

	const edit_item_props = ref<ClientPlaylistItem>();

	onMounted(() => {
		if (props.item_props !== undefined) {
			edit_item_props.value = JSON.parse(JSON.stringify(props.item_props));
		}
	});

	onUnmounted(() => {
		if (
			Globals.selected_item.value !== null &&
			edit_item_props.value !== undefined &&
			props.item_index !== null
		) {
			console.debug("orig", JSON.stringify(props.item_props));
			console.debug("edit", JSON.stringify(edit_item_props.value));

			// if the props are changed, send an update
			if (JSON.stringify(props.item_props) !== JSON.stringify(edit_item_props.value)) {
				Globals.ws?.send<JCGPRecv.UpdateItem>({
					command: "update_item",
					index: props.item_index,
					props: edit_item_props.value
				});
			}
		}
	});

	function edit_file() {
		switch (edit_item_props.value?.type) {
			case "song":
				Globals.ControlWindowState = ControlWindowState.EditSong;
				break;
			case "psalm":
				Globals.ControlWindowState = ControlWindowState.EditPsalm;
				break;
			default:
				return;
		}

		Globals.ws?.send<JCGPRecv.GetItemData>({
			command: "get_item_data",
			type: edit_item_props.value.type,
			file: edit_item_props.value.file
		});
	}
</script>

<template>
	<div id="edit_item_wrapper" v-if="item_index !== null">
		<div v-if="edit_item_props?.type !== undefined" id="item_editor_general">
			<input
				id="color_picker"
				type="color"
				style="visibility: hidden; position: absolute"
				v-model="edit_item_props.color"
			/>
			<label
				id="props_color"
				for="color_picker"
				:style="{ backgroundColor: edit_item_props.color }"
			/>
			<input
				id="props_caption"
				type="text"
				v-model="edit_item_props.caption"
				placeholder="Item Caption"
			/>
			<MenuButton
				v-if="edit_item_props.type === 'song' || edit_item_props.type === 'psalm'"
				@click="edit_file"
			>
				<FontAwesomeIcon :icon="['fas', 'pen']" />Edit
				{{ edit_item_props.type === "song" ? "Song" : "Psalm" }}-File
			</MenuButton>
		</div>
		<EditSong
			v-if="edit_item_props?.type === 'song'"
			:key="`${item_index}_song`"
			v-model:item_props="edit_item_props"
			:song_data="(item_data.song as SongFile | undefined)?.data"
			:item_index="item_index"
		/>
		<EditBible
			v-else-if="edit_item_props?.type === 'bible'"
			:key="`${item_index}_bible`"
			v-model:item_props="edit_item_props"
			:item_index="item_index"
		/>
		<EditText
			v-else-if="edit_item_props?.type === 'text'"
			:key="`${item_index}_text`"
			v-model:item_props="edit_item_props"
			:item_index="item_index"
		/>
		<EditTemplate
			v-else-if="edit_item_props?.type === 'template'"
			:key="`${item_index}_template`"
			v-model:item_props="edit_item_props"
			:item_index="item_index"
		/>
		<EditCountdown
			v-else-if="edit_item_props?.type === 'countdown'"
			:key="`${item_index}_countdown`"
			v-model:item_props="edit_item_props"
			:item_index="item_index"
		/>
		<EditAMCP
			v-else-if="edit_item_props?.type === 'amcp'"
			:key="`${item_index}_amcp`"
			v-model:item_props="edit_item_props"
			:item_index="item_index"
		/>
		<div v-else-if="edit_item_props?.type === undefined" id="edit_part_placeholder">
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

<script setup lang="ts">
	import { ref, type VNodeRef } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import Draggable from "vuedraggable";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import type { SongData } from "@server/search_part";

	library.add(fas.faAdd, fas.faTrash, fas.faArrowsRotate, fas.faPlus);

	defineProps<{
		song_data?: SongData;
	}>();

	// currently selected song
	const selected_available_song_part = ref<number>();
	const selected_song_part = ref<number>();

	const selected_parts = defineModel<string[]>("selected_parts", { required: true });

	let song_parts_list: HTMLDivElement[] = [];
	function list_ref(el: HTMLDivElement) {
		if (el) {
			song_parts_list.push(el);
		}
	}

	function create_song_part_type(part_name: string): string {
		return part_name.split(" ", 1)[0].toLowerCase();
	}

	function add_song_part(name: string) {
		selected_parts.value.push(name);
	}

	function delete_song_part(event: KeyboardEvent, index?: number) {
		event.stopPropagation();
		event.preventDefault();

		if (index !== undefined) {
			selected_parts.value.splice(index, 1);

			if (selected_song_part.value !== undefined) {
				if (selected_song_part.value === selected_parts.value.length) {
					selected_song_part.value--;
				}

				song_parts_list[selected_song_part.value]?.focus();
			}
		}
	}
</script>

<template>
	<template v-if="song_data !== undefined">
		<div id="result_text_wrapper">
			<div class="header">Text</div>
			<div id="result_text">
				<div class="song_part" v-for="[part_name, part] in Object.entries(song_data.text ?? {})">
					<div :class="[create_song_part_type(part_name)]">{{ part_name }}</div>
					<div class="song_slides_wrapper">
						<div v-for="slide in part">
							<div v-for="line in slide">
								<div class="song_language_line" v-for="lang in line">
									{{ lang }}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div id="song_parts_wrapper">
			<div>
				<div class="header">Available parts</div>
				<Draggable
					class="parts_container"
					:list="song_data.parts.available"
					:group="{ name: 'song_part', pull: 'clone', put: 'false' }"
					item-key="key"
					tag="span"
					:sort="false"
				>
					<template #item="{ element, index }">
						<div
							tabindex="0"
							class="song_part_name"
							:class="{
								[create_song_part_type(element)]: true,
								active: selected_available_song_part === index
							}"
							:key="`${element}_${index}`"
							@click="
								selected_available_song_part = index;
								$event.stopPropagation();
								$event.preventDefault();
							"
							@keydown.enter="
								selected_available_song_part = index;
								$event.stopPropagation();
								$event.preventDefault();
							"
						>
							{{ element }}
						</div>
					</template>
				</Draggable>
				<MenuButton
					icon="add"
					text=""
					@click="
						selected_available_song_part !== undefined
							? add_song_part(song_data.parts.available[selected_available_song_part])
							: undefined
					"
				/>
			</div>
			<div>
				<div class="header">Selected parts</div>
				<Draggable
					class="parts_container"
					v-model="selected_parts"
					:group="{ name: 'song_part', pull: false, put: true }"
					item-key="key"
					animation="150"
					easing="cubic-bezier(1, 0, 0, 1)"
					ghostClass="dragged_ghost"
					fallbackClass="dragged"
				>
					<template #item="{ element, index }">
						<div
							tabindex="0"
							class="song_part_name"
							:ref="list_ref as unknown as VNodeRef"
							:class="{
								[create_song_part_type(element)]: true,
								active: selected_song_part === index
							}"
							:key="`${element}_${index}`"
							@click="
								selected_song_part = index;
								$event.stopPropagation();
								$event.preventDefault();
							"
							@keydown.enter="
								selected_song_part = index;
								$event.stopPropagation();
								$event.preventDefault();
							"
							@keydown.delete="delete_song_part($event, index)"
							@keydown.up="
								selected_song_part !== undefined && selected_song_part > 0
									? selected_song_part--
									: undefined
							"
							@keydown.down="
								selected_song_part !== undefined && selected_song_part < song_parts_list.length
									? selected_song_part++
									: undefined
							"
						>
							{{ element }}
						</div>
					</template>
				</Draggable>
				<MenuButton icon="trash" text="" @click="delete_song_part($event, selected_song_part)" />
			</div>
		</div>
	</template>
</template>

<style scoped>
	#result_text_wrapper,
	#song_parts_wrapper {
		flex: 1;

		border-radius: 0.25rem;

		background-color: var(--color-container);

		gap: inherit;
	}

	.header {
		text-align: center;

		background-color: var(--color-item);

		border-radius: 0.25rem;

		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
		padding-left: 0.75rem;
	}

	.results_list {
		overflow: auto;

		flex: 1;

		display: flex;
		flex-direction: column;

		gap: inherit;

		padding: 0.25rem;
		padding-top: 0;
	}

	#song_results {
		display: flex;
		flex-direction: column;
	}

	#result_text_wrapper {
		display: flex;
		flex-direction: column;
	}

	#result_text {
		display: flex;
		flex-direction: column;
		flex: 1;

		row-gap: 0.5rem;

		padding: 1rem;

		overflow: auto;
	}

	.song_part {
		overflow: visible;

		border-radius: 0.25rem;
	}

	.song_part:hover {
		background-color: var(--color-item);
	}

	.song_slides_wrapper {
		display: flex;
		flex-direction: column;

		gap: 1rem;
	}

	.song_language_line {
		font-weight: lighter;
	}

	.song_language_line:not(:first-child) {
		color: var(--color-text-disabled);
		font-style: italic;
	}

	#song_parts_wrapper {
		display: flex;

		background-color: unset;
	}

	#song_parts_wrapper > * {
		background-color: var(--color-container);

		flex: 1;
		display: flex;
		flex-direction: column;

		gap: 0.25rem;
	}

	.parts_container {
		padding: 0.25rem;
		padding-top: 0;

		display: flex;
		flex-direction: column;

		gap: 0.25rem;

		flex: 1;

		overflow: auto;
	}

	.song_part_name {
		background-color: var(--color-item);

		border-radius: 0.25rem;

		padding: 0.25rem;

		cursor: pointer;

		overflow: visible;
	}

	.song_part_name:hover {
		background-color: var(--color-item-hover);
	}

	.song_part_name.active {
		background-color: var(--color-active);
	}

	.title,
	.intro {
		color: hsl(0, 100%, 50%);
	}

	.vers,
	.verse,
	.strophe {
		color: hsl(23, 100%, 50%);
	}

	.pre-refrain,
	.pre-chorus {
		color: hsl(46, 100%, 50%);
	}

	.chorus,
	.refrain {
		color: hsl(69, 100%, 50%);
	}

	.pre-bridge {
		color: hsl(92, 100%, 50%);
	}

	.bridge {
		color: hsl(184, 100%, 50%);
	}

	.instrumental,
	.interlude,
	.zwischenspiel,
	.solo {
		color: hsl(207, 100%, 50%);
	}

	.pre-coda {
		color: hsl(276, 100%, 50%);
	}

	.coda,
	.ending,
	.outro {
		color: hsl(299, 100%, 50%);
	}

	.misc,
	.part,
	.teil,
	.unbekannt,
	.unknown,
	.unbenannt {
		color: hsl(345, 100%, 50%);
	}
</style>

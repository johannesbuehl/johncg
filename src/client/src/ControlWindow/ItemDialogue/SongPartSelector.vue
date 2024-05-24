<script lang="ts">
	export function create_song_part_type(part_name: string): string {
		return part_name.split(" ", 1)[0].toLowerCase();
	}

	export function get_song_part_color(part_name: string): string | undefined {
		const color_map: Record<string, string> = {
			title: "hsl(0, 100%, 50%)",
			intro: "hsl(0, 100%, 50%)",
			vers: "hsl(23, 100%, 50%)",
			verse: "hsl(23, 100%, 50%)",
			strophe: "hsl(23, 100%, 50%)",
			"pre-refrain": "hsl(46, 100%, 50%)",
			"pre-chorus": "hsl(46, 100%, 50%)",
			chorus: "hsl(69, 100%, 50%)",
			refrain: "hsl(69, 100%, 50%)",
			"pre-bridge": "hsl(92, 100%, 50%)",
			bridge: "hsl(184, 100%, 50%)",
			instrumental: "hsl(207, 100%, 50%)",
			interlude: "hsl(207, 100%, 50%)",
			zwischenspiel: "hsl(207, 100%, 50%)",
			solo: "hsl(207, 100%, 50%)",
			"pre-coda": "hsl(276, 100%, 50%)",
			coda: "hsl(299, 100%, 50%)",
			ending: "hsl(299, 100%, 50%)",
			outro: "hsl(299, 100%, 50%)",
			misc: "hsl(345, 100%, 50%)",
			part: "hsl(345, 100%, 50%)",
			teil: "hsl(345, 100%, 50%)",
			unbekannt: "hsl(345, 100%, 50%)",
			unknown: "hsl(345, 100%, 50%)",
			unbenannt: "hsl(345, 100%, 50%)"
		};

		return color_map[create_song_part_type(part_name)];
	}
</script>

<script setup lang="ts">
	import { ref, type Ref, type VNodeRef } from "vue";
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import Draggable from "vuedraggable";

	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";

	import type { SongFile } from "@server/search_part";
	import type { SongPart } from "@server/PlaylistItems/SongFile/SongFile";

	library.add(fas.faAdd, fas.faTrash, fas.faPlus, fas.faXmark, fas.faCheck);

	defineProps<{
		song_file?: SongFile;
	}>();

	// currently selected song
	const selected_available_song_part = ref<number>();
	const selected_song_part = ref<number>();

	const selected_languages = defineModel<[number, boolean][]>("selected_languages", {
		required: true
	});
	const selected_parts = defineModel<string[]>("selected_parts", { required: true });

	let song_parts_list: Ref<HTMLDivElement>[] = [];
	function list_ref(el: HTMLDivElement): VNodeRef | undefined {
		if (el) {
			const re = ref(el);
			song_parts_list.push(re);

			return re;
		}
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

				song_parts_list[selected_song_part.value].value.focus();
			}
		}
	}

	function on_clone(part: [string, SongPart]): string {
		return part[0];
	}

	function language_toggle(index: number) {
		// if the current state is "active" (gets disabled) and it is the only one active, don't toggle
		if (
			!selected_languages.value[index][1] ||
			selected_languages.value.filter((ele, ii) => index !== ii).some((ele) => ele[1])
		) {
			selected_languages.value[index][1] = !selected_languages.value[index][1];
		}
	}

	function get_language_lines(line: string[]): string[] {
		const ret_lines: string[] = [];

		selected_languages.value.forEach(([index, state]) => {
			if (state) {
				ret_lines.push(line[index]);
			}
		});

		return ret_lines;
	}
</script>

<template>
	<template v-if="song_file?.data !== undefined">
		<div id="song_editor_wrapper">
			<div
				v-if="song_file.data.title !== undefined && selected_languages.length > 1"
				id="language_selector"
			>
				<div class="header">Languages</div>
				<Draggable
					id="language_wrapper"
					v-model="selected_languages"
					item-key="id"
					animation="150"
					easing="cubic-bezier(1, 0, 0, 1)"
					ghostClass="dragged_ghost"
					fallbackClass="dragged"
				>
					<template #item="{ element: [language_index, state], index }">
						<div :class="{ active: state }" :id="language_index" @click="language_toggle(index)">
							<FontAwesomeIcon
								class="language_selected_icon"
								:icon="['fas', state ? 'check' : 'xmark']"
							/>
							{{ song_file.data.title[language_index] }}
						</div>
					</template>
				</Draggable>
			</div>
			<div id="part_selector_wrapper">
				<div id="result_text_wrapper">
					<div class="header">Text</div>
					<Draggable
						id="result_text"
						item-key="key"
						tag="span"
						:list="Object.entries(song_file.data.text ?? {})"
						:group="{ name: 'song_part', pull: 'clone', put: false }"
						:clone="on_clone"
						:sort="false"
					>
						<template #item="{ element: [part_name, part], index }">
							<div
								class="song_part"
								:class="{ active: selected_available_song_part === index }"
								@click="selected_available_song_part = index"
							>
								<div class="song_part_header" :style="{ color: get_song_part_color(part_name) }">
									{{ part_name }}
								</div>
								<div class="song_slides_wrapper">
									<div v-for="slide in part">
										<div v-for="line in slide">
											<div class="song_language_line" v-for="lang in get_language_lines(line)">
												{{ lang }}
											</div>
										</div>
									</div>
								</div>
							</div>
						</template>
					</Draggable>
					<MenuButton
						@click="
							selected_available_song_part !== undefined && song_file?.data !== undefined
								? add_song_part(song_file.data.parts.available[selected_available_song_part])
								: undefined
						"
					>
						<FontAwesomeIcon :icon="['fas', 'plus']" />Add Part
					</MenuButton>
				</div>
				<div id="song_parts_wrapper">
					<div class="header">Selected parts</div>
					<Draggable
						class="parts_container"
						v-model="selected_parts"
						:group="{ name: 'song_part', pull: false, put: true }"
						item-key="key"
						animation="150"
						easing="cubic-bezier(1, 0, 0, 1)"
						ghost-class="dragging"
					>
						<template #item="{ element, index }">
							<div
								tabindex="0"
								class="song_part_name"
								:ref="list_ref"
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
					<MenuButton @click="delete_song_part($event, selected_song_part)">
						<FontAwesomeIcon :icon="['fas', 'trash']" />Delete Part
					</MenuButton>
				</div>
			</div>
		</div>
	</template>
</template>

<style scoped>
	#song_editor_wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;

		gap: 0.25rem;
	}

	#language_selector {
		border-radius: 0.25rem;

		background-color: var(--color-container);
	}

	#language_wrapper {
		padding: 0.5rem;

		display: flex;

		gap: 0.25rem;
	}

	#language_wrapper > div {
		background-color: var(--color-item);

		padding: 0.5rem;

		border-radius: 0.25rem;

		cursor: pointer;
	}

	#language_wrapper > div:hover {
		background-color: var(--color-item-hover);
	}

	.language_selected_icon {
		aspect-ratio: 1;
	}

	#part_selector_wrapper {
		flex: 1;
		display: flex;

		gap: inherit;
	}

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
	}

	#result_text_wrapper {
		display: flex;
		flex-direction: column;
	}

	#result_text {
		display: flex;
		flex-direction: column;
		flex: 1;

		gap: inherit;

		overflow: auto;

		overflow-x: hidden;
	}

	.song_part {
		overflow: visible;

		border-radius: 0.25rem;

		padding: 0.5rem;

		background-color: var(--color-item);
	}

	.song_part:hover {
		background-color: var(--color-item-hover);

		cursor: pointer;
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
		background-color: var(--color-container);

		flex: 1;
		display: flex;
		flex-direction: column;

		gap: inherit;
	}

	.parts_container {
		display: flex;
		flex-direction: column;

		gap: inherit;

		flex: 1;

		overflow: auto;
	}

	.song_part_name,
	.dragging > .song_part_header {
		background-color: var(--color-item);

		border-radius: 0.25rem;

		padding: 0.25rem;
		padding-inline-start: 0.5rem;

		cursor: pointer;

		overflow: visible;
	}

	.song_part_name:hover {
		background-color: var(--color-item-hover);
	}

	.active {
		background-color: var(--color-active) !important;
	}

	.active:hover {
		background-color: var(--color-active-hover) !important;
	}

	.dragging.song_part {
		padding: 0;
	}

	.dragging > .song_slides_wrapper {
		display: none;
	}

	.dragging > .song_part_header {
		background-color: var(--color-item-hover);
	}
</style>

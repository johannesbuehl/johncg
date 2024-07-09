<script setup lang="ts">
	import { onBeforeUpdate, watch } from "vue";

	import ItemSlideWrapper from "./ItemSlideWrapper.vue";

	import SongTemplate from "@templates/Song/SongTemplate.vue";

	import type { ActiveItemSlide } from "@server/Playlist";
	import type { SongTemplateData } from "@server/PlaylistItems/Song";
	import type { ClientSongSlides } from "@server/PlaylistItems/Song";

	const props = defineProps<{
		slides: ClientSongSlides;
		aspect_ratio: string;
		active_item_slide?: ActiveItemSlide;
		scroll?: boolean;
	}>();

	const emit = defineEmits<{
		select_slide: [slide: number];
	}>();

	interface CasparCGTemplate extends Window {
		update: (data_string: string) => void;
		play: () => void;
		stop: () => void;
		next: () => void;
	}

	interface JohnCGSongTemplate extends CasparCGTemplate {
		jump: (slide: number) => void;
	}

	watch(
		props.slides.template.data,
		(data) => {
			create_part_slide_map(data);
		},
		{ deep: true }
	);

	// create a part-to-slide-map
	let part_slide_map: number[][] = [];
	create_part_slide_map();
	function create_part_slide_map(data: SongTemplateData = props.slides.template.data) {
		part_slide_map = [];
		let slide_counter = 0;

		data.parts.forEach((part) => {
			switch (part.type) {
				case "title":
					part_slide_map.push([slide_counter++]);
					break;
				case "lyric":
					part_slide_map.push(
						Array.from(Array(part.slides.length).keys()).map((ele) => ele + slide_counter)
					);
					slide_counter += part.slides.length;
					break;
			}
		});
	}

	function is_active(part: number, part_slide?: number): boolean {
		create_part_slide_map();

		if (props.active_item_slide !== undefined && props.active_item_slide.slide !== null) {
			if (part_slide !== undefined) {
				return props.active_item_slide?.slide === part_slide_map[part][part_slide];
			} else {
				if (typeof props.active_item_slide?.slide === "number") {
					return part_slide_map[part].includes(props.active_item_slide.slide);
				} else {
					return false;
				}
			}
		} else {
			return false;
		}
	}

	let slide_count = 0;
	function get_slide_index(): number {
		return slide_count++;
	}

	onBeforeUpdate(() => {
		slide_count = 0;
	});
</script>

<template>
	<template v-for="(part, part_index) in slides.template?.data.parts">
		<div class="slides_wrapper" v-if="part.type === 'title'">
			<div
				class="header"
				:class="{
					active: is_active(part_index)
				}"
				@click="emit('select_slide', part_slide_map[part_index][0])"
			>
				{{ slides.title }}
			</div>
			<div class="thumbnails">
				<ItemSlideWrapper
					:media="slides.media"
					:aspect_ratio="aspect_ratio"
					:active="is_active(part_index, 0)"
					:scroll="scroll"
					@click="emit('select_slide', part_slide_map[part_index][0])"
				>
					<SongTemplate
						:data="slides.template.data"
						:active_slide="get_slide_index()"
						:mute_transition="true"
					/>
				</ItemSlideWrapper>
			</div>
		</div>
		<div class="slides_wrapper" v-if="part.type === 'lyric'">
			<div
				class="header"
				:class="{
					active: is_active(part_index)
				}"
				@click="emit('select_slide', part_slide_map[part_index][0])"
			>
				{{ part.part }}
			</div>
			<div class="thumbnails">
				<ItemSlideWrapper
					v-for="(_, slide_index) in part?.slides"
					:media="slides.media"
					:aspect_ratio="aspect_ratio"
					:active="is_active(part_index, slide_index)"
					:scroll="scroll"
					@click="emit('select_slide', part_slide_map[part_index][slide_index])"
				>
					<SongTemplate
						:data="slides.template.data"
						:active_slide="get_slide_index()"
						:mute_transition="true"
					/>
				</ItemSlideWrapper>
			</div>
		</div>
	</template>
</template>

<style scoped>
	.slides_wrapper {
		border-radius: inherit;
	}

	.header {
		background-color: var(--color-item);

		border-radius: inherit;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;

		padding: 0.5rem;
		padding-left: 0.75rem;

		cursor: pointer;

		text-wrap: nowrap;
		width: min-content;
		min-width: 100%;

		max-width: 0;

		transition: background-color 0.25s ease;
	}

	.header:hover {
		background-color: var(--color-item-hover);
	}

	.header.active {
		background-color: var(--color-active);
	}

	.thumbnails {
		padding: 0.25rem;

		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
</style>

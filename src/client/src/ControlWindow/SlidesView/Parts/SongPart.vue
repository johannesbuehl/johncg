<script setup lang="ts">
	import ItemSlide from "./ItemSlide.vue";

	import type { ActiveItemSlide } from "@server/Playlist";
	import type { SongTemplateData } from "@server/PlaylistItems/Song";
	import type { ClientSongSlides } from "@server/PlaylistItems/Song";
	import { watch } from "vue";

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

		if (props.active_item_slide !== undefined) {
			if (part_slide !== undefined) {
				return props.active_item_slide?.slide === part_slide_map[part][part_slide];
			} else {
				return part_slide_map[part].includes(props.active_item_slide?.slide);
			}
		} else {
			return false;
		}
	}

	function template_loaded(template_object: HTMLObjectElement, index: number) {
		const contentWindow: JohnCGSongTemplate = template_object.contentWindow as JohnCGSongTemplate;

		contentWindow.update(JSON.stringify({ ...props.slides.template?.data, mute_transition: true }));
		contentWindow.jump(index);
		contentWindow.play();
	}
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
				{{ slides.caption }}
			</div>
			<div class="thumbnails">
				<ItemSlide
					:key="`${JSON.stringify(slides.template)}_${part_index}_${0}`"
					:media="slides.media"
					:template="slides.template"
					:aspect_ratio="aspect_ratio"
					:active="is_active(part_index, 0)"
					:scroll="scroll"
					@template_load="template_loaded($event, part_slide_map[part_index][0])"
					@click="emit('select_slide', part_slide_map[part_index][0])"
				/>
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
				<ItemSlide
					v-for="(_, slide_index) in part?.slides"
					:key="`${JSON.stringify(slides.template)}_${part_index}_${slide_index}`"
					:media="slides.media"
					:template="slides.template"
					:aspect_ratio="aspect_ratio"
					:active="is_active(part_index, slide_index)"
					:scroll="scroll"
					@template_load="template_loaded($event, part_slide_map[part_index][slide_index])"
					@click="emit('select_slide', part_slide_map[part_index][slide_index])"
				/>
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

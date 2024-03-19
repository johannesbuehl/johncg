<script setup lang="ts">
	import FileDialogue, { type Files } from "./FileDialogue/FileDialogue.vue";

	// const props = defineProps<{

	// }>();

	// const emit = defineEmits<{

	// }>();

	const files: Files = {
		a: "a.jcg",
		b: "b.jcg",
		c: "c.jcg",
		d: {
			e: "e.jcg",
			f: {
				g: "g.jcg"
			}
		}
	};
</script>

<template>
	<div class="playlist_file_wrapper">
		<div id="file_structure_container">
			<FileDialogue
				v-for="[caption, file] in Object.entries(files)"
				:name="caption"
				:files="file"
			/>
		</div>
	</div>
</template>

<style scoped>
	.playlist_file_wrapper {
		display: flex;
		flex-direction: column;

		flex: 1;

		gap: 0.25rem;
	}

	.playlist_file_wrapper > div {
		border-radius: 0.25rem;

		background-color: var(--color-container);
	}

	#file_structure_container {
		flex: 1;
	}
</style>

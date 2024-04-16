<script setup lang="ts">
	import { library } from "@fortawesome/fontawesome-svg-core";
	import * as fas from "@fortawesome/free-solid-svg-icons";
	import { onMounted, ref } from "vue";
	import MenuButton from "@/ControlWindow/MenuBar/MenuButton.vue";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

	import type { CommentProps } from "@server/PlaylistItems/Comment";

	library.add(fas.faPlus);

	const input = ref<HTMLInputElement>();
	const text_input = ref<string>();

	onMounted(() => {
		input.value?.focus();
	});

	const emit = defineEmits<{
		add: [item_props: CommentProps];
		refresh: [];
	}>();

	function add_comment() {
		if (text_input.value !== undefined && text_input.value.length > 0) {
			emit("add", {
				type: "comment",
				caption: text_input.value,
				color: "#FF8000"
			});
		}
	}
</script>

<template>
	<div id="comment_input_wrapper">
		<input
			ref="input"
			class="search_box"
			v-model="text_input"
			placeholder="Name"
			@keydown.enter="add_comment"
		/>
		<MenuButton @click="add_comment">
			<FontAwesomeIcon :icon="['fas', 'plus']" />Add Comment
		</MenuButton>
	</div>
</template>

<style scoped>
	#comment_input_wrapper {
		display: flex;

		background-color: var(--color-container);

		padding: 0.25rem;

		border-radius: 0.25rem;
	}

	.search_box {
		font-size: 1.5rem;

		padding: 0.25rem;

		color: var(--text-color);
		border-color: transparent;
		border-style: solid;
		border-radius: 0.25rem;
		background-color: var(--color-item);

		flex: 1;
	}

	.search_box:hover {
		border-color: var(--color-item-hover);

		box-shadow: none;
	}

	.search_box::placeholder {
		color: var(--color-text-disabled);
	}

	.search_box:focus {
		border-color: var(--color-active);
		background-color: var(--color-page-background);

		outline: none;
	}
</style>

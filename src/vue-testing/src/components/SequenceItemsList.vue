<script setup lang="ts">
import SequenceItem from './SequenceItem.vue';

import * as JGCPSend from "../../../server/JGCPSendMessages"
import type { ActiveItemSlide } from "../../../server/Sequence";

const props = defineProps<{
	sequence?: JGCPSend.Sequence;
	selected?: number;
	active_item_slide?: ActiveItemSlide;
	scroll?: boolean;
}>();

const emit = defineEmits<{
	selection: [item: number];
}>()

emit("selection", props.sequence?.metadata.item ?? 0);
</script>

<template>
	<div class="wrapper">
		<div class="header">Sequence</div>
		<div>
			<SequenceItem
				v-for="(sequence_item, index) in sequence?.sequence_items"
				:key="index"
				:caption="sequence_item.Caption"
				:color="sequence_item.Color"
				:selectable="sequence_item.selectable"
				:selected="selected === index"
				:active="active_item_slide?.item === index"
				:scroll="scroll"
				@click="$emit('selection', index)"
			/>
		</div>
	</div>
</template>

<style scoped>
.wrapper {
	width: 24rem;

	border-radius: 0.25rem;

	overflow: auto;

	background-color: var(--color-container);
}

.header {
	text-align: center;

	background-color: var(--color-item);

	font-weight: bold;

	border-radius: inherit;

	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;

	padding: 0.5rem;
	padding-left: 0.75rem;
}
</style>
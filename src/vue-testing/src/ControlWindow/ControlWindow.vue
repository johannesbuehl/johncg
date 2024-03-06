<script setup lang="ts">
import SequenceItemsList from '@/components/SequenceItemsList.vue';
import SlidesView from "@/components/SlidesView.vue";
import MenuBar from "@/components/MenuBar.vue";

import * as JGCPSend from "../../../server/JGCPSendMessages";
import * as JGCPRecv from "../../../server/JGCPReceiveMessages";
import type { ActiveItemSlide } from '../../../server/Sequence';

const props = defineProps<{
	ws: WebSocket;
	client_id: string;
	server_state: JGCPSend.State;
	sequence?: JGCPSend.Sequence;
	slides?: JGCPSend.ItemSlides;
	active_item_slide?: ActiveItemSlide;
	selected: number;
}>();

defineEmits<{
	select_item: [item: number];
	select_slide: [slide: number];
}>();

// send navigate-request over teh websocket
function navigate(type: JGCPRecv.NavigateType, steps: number) {
	const message: JGCPRecv.Navigate = {
		command: 'navigate',
		type,
		steps,
		client_id: props.client_id
	};

	props.ws.send(JSON.stringify(message));
}

// send visibility changes over the websocket
function visibility(state: boolean) {
	const message: JGCPRecv.SetVisibility = {
		command: 'set_visibility',
		visibility: state,
		client_id: props.client_id
	};

	props.ws.send(JSON.stringify(message));
}
</script>

<template>
	<MenuBar class="menu_bar" :ws="ws" @navigate="navigate" @set_visibility="visibility" :visibility="server_state?.visibility ?? false" />
	<div id="MenuBar_wrapper">
		<SequenceItemsList
			v-if="sequence !== undefined"
			:sequence="sequence"
			:selected="selected"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			@selection="$emit('select_item', $event)"
		/>
		<SlidesView
			v-if="slides !== undefined"
			:slides="slides"
			:active_item_slide="active_item_slide"
			:scroll="client_id === server_state.client_id"
			@select_slide="$emit('select_slide', $event)"
		/>
	</div>
</template>

<style scoped>
#MenuBar_wrapper {
	display: flex;
	flex: 1;

	column-gap: 0.25rem;
}
</style>
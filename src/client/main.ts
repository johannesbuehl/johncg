import MessageLog from "./message_box.js";

import { ItemPartClient } from "../server/SequenceItems/SongFile";
import { ClientItemSlides } from "../server/SequenceItems/SequenceItem";

import * as JGCPSend from "../server/JGCPSendMessages";
import * as JGCPRecv from "../server/JGCPReceiveMessages.js";
import { ActiveItemSlide } from "../server/Sequence.js";

const config = {
	websocket: {
		port: 8765
	}
};

const msg_log = new MessageLog(document.querySelector("#error_container"));

function open_sequence(e: Event) {
	const file = (<HTMLInputElement>e.target).files[0];
	const reader = new FileReader();

	reader.onload = function(e) {
		const message: JGCPRecv.OpenSequence = {
			command: "open_sequence",
			sequence: e.target?.result as string
		};

		ws.send(JSON.stringify(message));
	};

	reader.readAsText(file);
}
document.querySelector("#input_open_sequence")?.addEventListener("change", open_sequence);

function navigate(type: JGCPRecv.NavigateType, steps: -1 | 1) {
	const command: JGCPRecv.Navigate = {
		command: "navigate",
		type,
		steps,
		client_id: client_id
	};

	ws.send(JSON.stringify((command)));
}
document.querySelector("#navigate_item_prev")?.addEventListener("click", () => { navigate("item", -1); });
document.querySelector("#navigate_item_next")?.addEventListener("click", () => { navigate("item", 1); });
document.querySelector("#navigate_slide_prev")?.addEventListener("click", () => { navigate("slide", -1); });
document.querySelector("#navigate_slide_next")?.addEventListener("click", () => { navigate("slide", 1); });

function button_visibility(visibility: boolean) {
	const message: JGCPRecv.SetVisibility = {
		command: "set_visibility",
		visibility,
		client_id: client_id
	};

	ws.send(JSON.stringify(message));
}
document.querySelector("#set_visibility_hide")?.addEventListener("click", () => { button_visibility(false); });
document.querySelector("#set_visibility_show")?.addEventListener("click", () => { button_visibility(true); });

document.querySelector("#show_error_log")?.addEventListener("click", () => msg_log.error("foobar"));

function display_items(data: JGCPSend.Sequence) {
	const div_sequence_items = document.querySelector("#sequence_items");

	// initialize
	init();

	for (const item of data.sequence_items) {
		const div_sequence_item_container = document.createElement("div");
		div_sequence_item_container.classList.add("sequence_item_container");
		div_sequence_item_container.dataset.item_number = item.item.toString();

		// if the item is selectable, give it the class and add the onclick-event
		if (item.selectable) {
			div_sequence_item_container.classList.add("selectable");
			
			div_sequence_item_container.addEventListener("click", function() {
				request_item_slides(Number(this.dataset.item_number));
			});
		}

		const div_sequence_item_color_indicator = document.createElement("div");
		div_sequence_item_color_indicator.classList.add("item_color_indicator");
		div_sequence_item_color_indicator.style.backgroundColor = item.Color;

		div_sequence_item_container.append(div_sequence_item_color_indicator);

		const div_sequence_item = document.createElement("div");
		div_sequence_item.classList.add("sequence_item");
		
		// if it's a  Countdown-Object, insert the time
		if (item.type === "Countdown") {
			div_sequence_item.innerText = item.Caption.replace("%s", item.Time);
		} else {
			div_sequence_item.innerText = item.Caption;
		}

		div_sequence_item_container.append(div_sequence_item);
		div_sequence_items?.append(div_sequence_item_container);
	}

	// display the visibility state
	display_visibility_state(data.metadata.visibility);
}

function request_item_slides(item: number) {
	if (item !== selected_item_number) {
		selected_item_number = item;
		
		// clear the current slides
		const slides_view_container = document.querySelector("#slides_view_container");
		if (slides_view_container !== null) {
			slides_view_container.innerHTML = "";
		}

		// clear the selected item
		document.querySelector(".sequence_item_container.selected")?.classList.remove("selected");
	
		const command: JGCPRecv.RequestItemSlides = {
			command: "request_item_slides",
			item: item,
			client_id: client_id
		};

		ws.send(JSON.stringify(command));
	}
}

function display_item_slides(data: JGCPSend.ItemSlides) {
	const div_slides_view_container = document.querySelector("#slides_view_container");

	// select the sequence-item
	select_item(data.item);

	// create the individual arrays for parallel processing
	let part_arrays: HTMLDivElement[] = [];

	switch (data.type) {
		case "Song":
			part_arrays = create_song_slides(data as JGCPSend.SongSlides);
			break;
		case "Countdown":
			part_arrays = create_image_countdown_slides(data as JGCPSend.CountdownSlides);
			break;
		case "Image":
			part_arrays = create_image_countdown_slides(data as JGCPSend.ImageSlides);
			break;
		case "CommandComment":
			part_arrays = create_template_slides(data as JGCPSend.CommandCommentSlides);
			break;
		default:
			console.error(`'${data.type}' is not supported`);
	}

	part_arrays.forEach((slide_part) => {
		div_slides_view_container?.append(slide_part);
	});

	set_active_slide(data.client_id === client_id);
}

function create_song_slides(data: JGCPSend.SongSlides): HTMLDivElement[] {
	let slide_counter: number = 0;

	// create the individual arrays for parallel processing
	const part_arrays_prototype: [number, ItemPartClient][] = [];

	data.slides.forEach((part) => {
		part_arrays_prototype.push([slide_counter, part]);

		slide_counter += part.slides;
	});

	const part_arrays = part_arrays_prototype.map(([slides_start, part]) => {
		// create the container for the part
		const div_slide_part = document.createElement("div");
		div_slide_part.classList.add("slide_part");

		// create the header of the part and append it to the part-container
		const div_slide_part_header = document.createElement("div");
		div_slide_part_header.classList.add("header");
		div_slide_part.append(div_slide_part_header);

		// create the slides-view and append it to the part container
		const div_slides_view = document.createElement("div");
		div_slides_view.classList.add("slides_view");
		div_slide_part.append(div_slides_view);

		switch (part.type) {
			case "title": {
				div_slide_part_header.innerText = data.title;
			} break;
			case "lyric": {
				div_slide_part_header.innerText = part.part;
			} break;
		}

		const object_iter_array_proto = [...Array(part.slides).keys()];

		const object_iter_array = object_iter_array_proto.map((ii) => { 
			return {
				index: ii,
				slide: create_slide_object(data, slides_start + ii)
			};
		});

		object_iter_array.forEach((obj) => {
			div_slides_view.append(obj.slide);
		});

		return div_slide_part;
	});

	return part_arrays;
}

function create_image_countdown_slides(data: JGCPSend.CountdownSlides | JGCPSend.ImageSlides): HTMLDivElement[] {
	// create the container for the part
	const div_slide_part = document.createElement("div");
	div_slide_part.classList.add("slide_part");

	// create the header of the part and append it to the part-container
	const div_slide_part_header = document.createElement("div");
	div_slide_part_header.classList.add("header");
	div_slide_part.append(div_slide_part_header);

	// create the slides-view and append it to the part container
	const div_slides_view = document.createElement("div");
	div_slides_view.classList.add("slides_view");
	div_slide_part.append(div_slides_view);

	div_slide_part_header.innerText = data.title;

	const obj = create_slide_object(data, 0);

	div_slides_view.append(obj);

	return [div_slide_part];
}

function create_template_slides(data: JGCPSend.CommandCommentSlides): HTMLDivElement[] {
	// create the container for the part
	const div_slide_part = document.createElement("div");
	div_slide_part.classList.add("slide_part");

	// create the header of the part and append it to the part-container
	const div_slide_part_header = document.createElement("div");
	div_slide_part_header.classList.add("header");
	div_slide_part.append(div_slide_part_header);

	// create the slides-view and append it to the part container
	const div_slides_view = document.createElement("div");
	div_slides_view.classList.add("slides_view");
	div_slide_part.append(div_slides_view);

	div_slide_part_header.innerText = data.title;

	const obj = create_slide_object(data, 0);

	div_slides_view.append(obj);

	return [div_slide_part];
}

function create_slide_object(data: ClientItemSlides, number: number) {
	const div_slide_container = document.createElement("div");
	div_slide_container.classList.add("slide_container");
	
	const slide_object = document.createElement("object");

	const template_data: object & { template?: { template: string, data: object } } = data.slides_template;

	switch (data.type) {
		case "Song":
			slide_object.data = "Templates/JohnCG/Song.html";
			break;
		case "Countdown":
			slide_object.data = "Templates/JohnCG/Countdown.html";
			break;
		case "CommandComment":
			slide_object.data = `Templates/${data.slides_template.template.template}.html`;
			break;
	}

	slide_object.style.backgroundImage = `url("${data.slides_template.background_image?.replace(/\\/g, "\\\\") ?? ""}")`;

	slide_object.classList.add("slide");
	
	div_slide_container.append(slide_object);
	
	slide_object.dataset.slide_number = number.toString();
	
	// register click event
	div_slide_container.addEventListener("click", () => {
		request_item_slide_select(
			Number(document.querySelector<HTMLDivElement>("div.sequence_item_container.selected")?.dataset.item_number),
			number
		);
	});

	slide_object.addEventListener("load", () => {
		slide_object.contentWindow?.update(JSON.stringify({ ...template_data?.template.data, mute_transition: true }));

		switch (data.type) {
			case "Song":
				slide_object.contentWindow?.jump(number.toString());
				break;
		}

		slide_object.contentWindow?.play();
	});

	const catcher = document.createElement("div");

	div_slide_container.append(catcher);
	
	return div_slide_container;
}

function select_item(item: number) {
	// store the selected item
	selected_item_number = item;

	// remove the selected class from the previous item
	const prev_selected_sequence_item = document.querySelector(".sequence_item_container.selected");
	if (prev_selected_sequence_item !== null) {
		prev_selected_sequence_item.classList.remove("selected");
	}

	// add the selected class to the current item
	const selected_sequence_item = document.querySelector(`[data-item_number='${selected_item_number}']`);
	selected_sequence_item?.classList.add("selected");
}

function request_item_slide_select(item: number, slide: number) {
	const message: JGCPRecv.SelectItemSlide = {
		command: "select_item_slide",
		item: item,
		slide: slide,
		client_id: client_id
	};

	ws.send(JSON.stringify(message));
}	

function set_active_slide(scroll: boolean = false) {
	// deselect the previous active slide
	const selected_slide = document.querySelector(".slide.active");
	if (selected_slide !== null) {
		selected_slide.classList.remove("active");
	}
	const selected_header = document.querySelector(".slide_part > .header.active");
	if (selected_header !== null) {
		selected_header.classList.remove("active");
	}

	const selected_item = document.querySelector<HTMLDivElement>("div.sequence_item_container.selected");
	if (selected_item !== null) {
		// if the currently displayed and selected sequence item is the active one, select the active slide
		if (Number(selected_item.dataset.item_number) === active_item_slide.item) {
			// remove the selected class from the previous item
			const prev_selected_item_slide = document.querySelector(".slide.active");
			if (prev_selected_item_slide !== null) {
				prev_selected_item_slide.classList.remove("active");
			}
		
			// add the selected class to the current slide
			const selected_item_slide = document.querySelector(`[data-slide_number='${active_item_slide.slide}']`);
			selected_item_slide?.classList.add("active");

			selected_item_slide?.parentElement?.parentElement?.parentElement?.querySelector(".header")?.classList.add("active");
			
			// if we requested this, scroll there
			if (scroll) {
				selected_item_slide?.parentElement?.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		}
	}
}

function set_active_item_slide(data: ActiveItemSlide, message_client_id: string) {
	// store the data
	active_item_slide = data;

	// decide wether to jump there
	const jump = message_client_id === client_id || message_client_id === undefined;

	// remove the "active" class from the previous sequence-item and add it to the new one
	const prev_selected_item = document.querySelector(".sequence_item_container.active");
	if (prev_selected_item !== null) {
		prev_selected_item.classList.remove("active");
	}
	document.querySelector<HTMLDivElement>(`div.sequence_item_container[data-item_number='${active_item_slide.item}']`)?.classList.add("active");

	if (jump && active_item_slide.item !== selected_item_number) {
		request_item_slides(active_item_slide.item);
	} else {
		set_active_slide(jump);
	}
}

function display_visibility_state(state: boolean) {
	const button_hide = document.querySelector("#set_visibility_hide");
	const button_show = document.querySelector("#set_visibility_show");

	if (state) {
		button_hide?.classList.remove("active");
		button_show?.classList.add("active");
	} else {
		button_hide?.classList.add("active");
		button_show?.classList.remove("active");
	}
}

function display_state_change(data: JGCPSend.State) {
	const key_map = {
		active_item_slide: set_active_item_slide,
		visibility: display_visibility_state
	};

	Object.entries(data).forEach(([key, value]) => {
		if (key in key_map) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			key_map[key as keyof typeof key_map](value, data.client_id);
		}
	});
}

function random_4_hex() {
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function blank_screen(state: boolean) {
	const blank_div = document.querySelector<HTMLDivElement>("div#blank");
	if (blank_div !== null) {
		blank_div.style.display = state ? "unset" : "none";
	}
}

function init() {
	selected_item_number = null;

	// remove all sequence_items
	const sequence_items = document.querySelector("#sequence_items");
	if (sequence_items !== null) {
		sequence_items.innerHTML = "";
	}

	// remove all item-slides
	const slides_view_container = document.querySelector("#slides_view_container");
	if (slides_view_container !== null) {
		slides_view_container.innerHTML = "";
	}

	// remove the visibility-selection
	document.querySelector("[id^=set_visibility_].active")?.classList.remove("active");
}

const client_id = `${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;
let selected_item_number: number;

function ws_connect() {
	const url = new URL(document.URL);

	const ws_url = `ws://${url.hostname}:${config.websocket.port}`;

	ws = new WebSocket(ws_url, "JGCP");
	
	ws.addEventListener("open", () => {
		// unblank the screen
		blank_screen(false);
	});
	
	ws.addEventListener("message", (event: MessageEvent) => {
		const data: JGCPSend.Message = JSON.parse(event.data as string) as JGCPSend.Message;

		const command_parser_map = {
			sequence_items: display_items,
			item_slides: display_item_slides,
			state: display_state_change,
			clear: init,
			response: (response: JGCPSend.Response) => {
				switch (Number(response.code.toString()[0])) {
					case 4:
						msg_log.error(response.message);
						break;
					default:
						msg_log.debug(response.message);
				}
			}
		};
	
		command_parser_map[data.command](data as never);
	
	});
	
	ws.addEventListener("ping", () => {
	});
	
	ws.addEventListener("error", (event: ErrorEvent) => {
		msg_log.error(`Server connection encountered error '${event.message}'. Closing socket`);
	
		ws.close();
	});
	
	ws.addEventListener("close", () => {
		console.log("No connection to server. Retrying in 1s");

		// blank the screen because there is no connection
		blank_screen(true);
	
		setTimeout(() => {
			ws_connect();
			
		}, 1000);
	});
}

let ws: WebSocket;
ws_connect();

let active_item_slide = {
	item: 0,
	slide: 0
};

document.addEventListener("keydown", (event) => {
	// exit on composing
	if (event.isComposing || event.keyCode === 229) {
		return;
	}

	if (!event.repeat) {
		switch (event.code) {
			case "PageUp":
			case "ArrowLeft":
				navigate("slide", -1);
				break;
			case "PageDown":
			case "ArrowRight":
				navigate("slide", 1);
				break;
			case "ArrowUp":
				navigate("item", -1);
				break;
			case "ArrowDown":
				navigate("item", 1);
				break;
			default:
				console.debug(event.code);
				break;
		}
	}
});
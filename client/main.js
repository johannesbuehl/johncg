const config = {
	websocket: {
		host: "localhost",
		port: 8765
	}
};

function open_sequence(e) {
	let file = e.target.files[0];
	let reader = new FileReader();

	reader.onload = function(e) {
		let rawData = e.target.result;

		ws.send(JSON.stringify({
			command: "open-sequence",
			sequence: rawData
		}));
	}

	reader.readAsText(file);
}
document.querySelector("#input_open_sequence").addEventListener("change", open_sequence)

function button_navigate(type, direction) {
	ws.send(JSON.stringify({
		command: "navigate",
		type,
		direction,
		clientID
	}));
}
document.querySelector("#navigate_item_prev").addEventListener("click", () => { button_navigate("item", "prev") });
document.querySelector("#navigate_slide_prev").addEventListener("click", () => { button_navigate("slide", "prev") });
document.querySelector("#navigate_slide_next").addEventListener("click", () => { button_navigate("slide", "next") });
document.querySelector("#navigate_item_next").addEventListener("click", () => { button_navigate("item", "next") });

function button_visibility(state) {
	ws.send(JSON.stringify({
		command: "set-display",
		state,
		clientID
	}));
}
document.querySelector("#set_visibility_hide").addEventListener("click", () => { button_visibility(false) });
document.querySelector("#set_visibility_show").addEventListener("click", () => { button_visibility(true) });

function display_items(data) {
	const div_sequence_items = document.querySelector("#sequence_items");

	// initialize
	init();

	for (let item of data.sequence_items) {
		const div_sequence_item_container = document.createElement("div");
		div_sequence_item_container.classList.add("sequence_item_container");
		div_sequence_item_container.dataset.item_number = item.item;

		const div_sequence_item_color_indicator = document.createElement("div");
		div_sequence_item_color_indicator.classList.add("item_color_indicator");
		div_sequence_item_color_indicator.style.backgroundColor = item.color;

		div_sequence_item_container.append(div_sequence_item_color_indicator);

		const div_sequence_item = document.createElement("div");
		div_sequence_item.classList.add("sequence_item");
		div_sequence_item.innerText = item.caption;

		div_sequence_item_container.onclick = function() {
			request_item_slides(Number(this.dataset.item_number));
		};

		div_sequence_item_container.append(div_sequence_item);
		div_sequence_items.append(div_sequence_item_container);
	}

	// display the visibility state
	display_visibility_state(data.metadata.visibility);
}

function request_item_slides(item) {
	if (item !== selected_item_number) {
		selected_item_number = item;
		
		// clear the current slides
		document.querySelector("#slides_view_container").innerHTML = "";

		// clear the selected item
		document.querySelector(".sequence_item_container.selected")?.classList.remove("selected");
	
		ws.send(JSON.stringify({
			command: "request-item-slides",
			item: item,
			clientID
		}));
	}
}

function display_item_slides(data) {
	const div_slides_view_container = document.querySelector("#slides_view_container");

	// select the sequence-item
	select_item(data.metadata.item);

	let slide_counter = 0;

	for (let part of data.slides) {
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
				div_slide_part_header.innerText = data.metadata.title;
			} break;
			case "lyric": {
				div_slide_part_header.innerText = part.part;
			} break;
		}

		for (let ii = 0; ii < part.slides; ii++) {
			div_slides_view.append(create_slide_iframe(data, slide_counter));

			slide_counter++;
		}

		// add the song-part to the slide-container
		div_slides_view_container.append(div_slide_part);
	}

	set_active_slide(data.clientID === clientID);
}

function create_slide_iframe(data, number) {
	const div_slide_container = document.createElement("div");
	div_slide_container.classList.add("slide_container");

	const slide_iframe = document.createElement("iframe");
	slide_iframe.src = "song.html";
	slide_iframe.classList.add("slide");

	div_slide_container.append(slide_iframe);

	slide_iframe.dataset.slide_number = number;

	slide_iframe.addEventListener("load", () => {
		slide_iframe.contentWindow.rescale_to_parent_resolution(document.querySelector("body").clientWidth);

		slide_iframe.contentWindow.update(JSON.stringify(data.slides_template));
		slide_iframe.contentWindow.jump(number);
		slide_iframe.contentWindow.play();

		// register click event
		slide_iframe.contentWindow.addEventListener("click", () => {
			request_item_slide_select(
				Number(document.querySelector(".sequence_item_container.selected").dataset.item_number),
				number
			);
		})
	});

	return div_slide_container;
}

function select_item(item) {
	// store the selected item
	selected_item_number = item;

	// remove the selected class from the previous item
	const prev_selected_sequence_item = document.querySelector(".sequence_item_container.selected");
	if (prev_selected_sequence_item !== null) {
		prev_selected_sequence_item.classList.remove("selected");
	}

	// add the selected class to the current item
	const selected_sequence_item = document.querySelector(`[data-item_number='${selected_item_number}']`);
	selected_sequence_item.classList.add("selected");
}

function request_item_slide_select(item, slide) {
	ws.send(JSON.stringify({
		command: "select-item-slide",
		item: item,
		slide: slide,
		clientID
	}));
}

function set_active_slide(scroll = false) {
	// deselect the previous active slide
	const selected_slide = document.querySelector(".slide.active");
	if (selected_slide !== null) {
		selected_slide.classList.remove("active");
	}
	const selected_header = document.querySelector(".slide_part > .header.active");
	if (selected_header !== null) {
		selected_header.classList.remove("active");
	}

	const selected_item = document.querySelector(".sequence_item_container.selected");
	if (selected_item !== null) {
		// if the currently displayed and selected sequence item is the active one, select the active slide
		if (selected_item.dataset.item_number == active_item_slide.item) {
			// remove the selected class from the previous item
			const prev_selected_item_slide = document.querySelector(".slide.active");
			if (prev_selected_item_slide !== null) {
				prev_selected_item_slide.classList.remove("active");
			}
		
			// add the selected class to the current slide
			const selected_item_slide = document.querySelector(`[data-slide_number='${active_item_slide.slide}']`);
			selected_item_slide.classList.add("active");

			selected_item_slide.parentElement.parentElement.parentElement.querySelector(".header").classList.add("active");
			
			// if we requested this, scroll there
			if (scroll) {
				selected_item_slide.parentElement.scrollIntoView({ behavior: "smooth", block: "nearest"});
			}
		}
	}
}

function set_active_item_slide(data, message_clientID) {
	// store the data
	active_item_slide = data;

	// decide wether to jump there
	const jump = message_clientID === clientID || message_clientID === undefined;

	// remove the "active" class from the previous sequence-item and add it to the new one
	const prev_selected_item = document.querySelector(".sequence_item_container.active");
	if (prev_selected_item !== null) {
		prev_selected_item.classList.remove("active");
	}
	document.querySelector(`.sequence_item_container[data-item_number='${active_item_slide.item}']`).classList.add("active");

	if (jump && active_item_slide.item !== selected_item_number) {
		request_item_slides(active_item_slide.item);
	} else {
		set_active_slide(jump);
	}
}

function display_visibility_state(state) {
	const button_hide = document.querySelector("#set_visibility_hide");
	const button_show = document.querySelector("#set_visibility_show");

	if (state) {
		button_hide.classList.remove("selected");
		button_show.classList.add("selected");
	} else {
		button_hide.classList.add("selected");
		button_show.classList.remove("selected");
	}
}

function display_state_change(data) {
	const key_map = {
		itemSlideSelection: set_active_item_slide,
		visibility: display_visibility_state
	};

	Object.entries(data).forEach(([key, value]) => {
		if (Object.keys(key_map).includes(key)) {
			key_map[key](value, data.clientID);
		}
	});
}

function random_4_hex() {
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function blank_screen(state) {
	document.querySelector("#blank").style.display = state ? "unset" : "none";
}

function init() {
	selected_item_number = null;

	// remove all sequence-items
	document.querySelector("#sequence_items").innerHTML = "";

	// remove all item-slides
	document.querySelector("#slides_view_container").innerHTML = "";
}

const clientID = `${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;
let selected_item_number;

function ws_connect() {
	const ws_url = `ws://${config.websocket.host}:${config.websocket.port}`;

	ws = new WebSocket(ws_url, "JGCP");
	
	ws.addEventListener("open", () => {
		// unblank the screen
		blank_screen(false);
	});
	
	ws.addEventListener("message", (event) => {
		const data = JSON.parse(event.data);
	
		if (data.command !== "response") {
			console.log(data);
		}

		const command_parser_map = {
			"sequence-items": display_items,
			"item-slides": display_item_slides,
			state: display_state_change,
			clear: init,
			response: (response) => {
				switch (Number(response.code.toString()[0])) {
					case 4:
						console.error(response);
						break;
					default:
						console.debug(response);
				}
			}
		};
	
		command_parser_map[data.command](data);
	
	});
	
	ws.addEventListener("ping", () => {
	});
	
	ws.addEventListener("error", (event) => {
		console.error(`Server connection encountered error '${event.message}'. Closing socket`);
	
		ws.close();
	});
	
	
	
	ws.addEventListener("close", async () => {
		console.error("No connection to server. Retrying in 1s");

		// blank the screen because there is no connection
		blank_screen(true);
	
		setTimeout(() => {
			ws_connect();
			
		}, 1000);
	})
}

let ws;
ws_connect();

let active_item_slide = {
	item: 0,
	slide: 0
};
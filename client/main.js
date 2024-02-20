const config = {
	websocket: {
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

function button_navigate(type, steps) {
	ws.send(JSON.stringify({
		command: "navigate",
		type,
		steps,
		clientID
	}));
}
document.querySelector("#navigate_item_prev").addEventListener("click", () => { button_navigate("item", -1) });
document.querySelector("#navigate_item_next").addEventListener("click", () => { button_navigate("item", 1) });
document.querySelector("#navigate_slide_prev").addEventListener("click", () => { button_navigate("slide", -1) });
document.querySelector("#navigate_slide_next").addEventListener("click", () => { button_navigate("slide", 1) });

function button_visibility(visibility) {
	ws.send(JSON.stringify({
		command: "set-visibility",
		visibility,
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
		div_sequence_item_container.dataset.item_number = item.Item;

		const div_sequence_item_color_indicator = document.createElement("div");
		div_sequence_item_color_indicator.classList.add("item_color_indicator");
		div_sequence_item_color_indicator.style.backgroundColor = item.Color;

		div_sequence_item_container.append(div_sequence_item_color_indicator);

		const div_sequence_item = document.createElement("div");
		div_sequence_item.classList.add("sequence_item");
		
		// if it's a  Countdown-Object, insert the time
		if (item.Type === "Countdown") {
			div_sequence_item.innerText = item.Caption.replace("%s", item.Time);
		} else {
			div_sequence_item.innerText = item.Caption;
		}

		div_sequence_item_container.onclick = function() {
			request_item_slides(Number(this.dataset.item_number));
		};

		div_sequence_item_container.append(div_sequence_item);
		div_sequence_items.append(div_sequence_item_container);
	}

	// display the visibility state
	display_visibility_state(data.visibility);
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
	select_item(data.item);

	// create the individual arrays for parallel processing
	let part_arrays = [];

	switch (data.Type) {
		case "Song":
			part_arrays = create_song_slides(data);
			break;
		case "Countdown":
			part_arrays = create_countdown_slides(data);
			break;
		default:
			console.error(`'${data.Type}' is not supported`)
	}

	part_arrays.forEach((slide_part) => {
		div_slides_view_container.append(slide_part);
	});

	set_active_slide(data.clientID === clientID);
}

function create_song_slides(data) {
	let slide_counter = 0;

	// create the individual arrays for parallel processing
	let part_arrays = [];

	data.slides.forEach((part) => {
		part_arrays.push([slide_counter, part]);

		slide_counter += part.slides;
	});

	part_arrays = part_arrays.map(([slides_start, part]) => {
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

		let iframe_iter_array = [...Array(part.slides).keys()];

		iframe_iter_array = iframe_iter_array.map((ii) => { 
			return {
				index: ii,
				slide: create_slide_iframe(data, slides_start + ii)
			};
		});

		iframe_iter_array.forEach((iframe) => {
			div_slides_view.append(iframe.slide);
		});

		return div_slide_part;
	});

	return part_arrays;
}

function create_countdown_slides(data) {
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

	const iframe = create_slide_iframe(data, 0);

	div_slides_view.append(iframe);

	return [div_slide_part];
}

function create_slide_iframe(data, number) {
	const div_slide_container = document.createElement("div");
	div_slide_container.classList.add("slide_container");
	
	const slide_iframe = document.createElement("iframe");

	switch (data.Type) {
		case "Song":
			slide_iframe.src = "Templates/Song.html";
			break;
		case "Countdown":
			slide_iframe.src = "Templates/Countdown.html"
			break;
	}

	slide_iframe.classList.add("slide");
	
	div_slide_container.append(slide_iframe);
	
	slide_iframe.dataset.slide_number = number;
	
	slide_iframe.addEventListener("load", () => {
		slide_iframe.contentWindow.update(JSON.stringify(data.slides_template));

		switch (data.Type) {
			case "Song":
				slide_iframe.contentWindow.jump(number);
				break;
		}

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
		button_hide.classList.remove("active");
		button_show.classList.add("active");
	} else {
		button_hide.classList.add("active");
		button_show.classList.remove("active");
	}
}

function display_state_change(data) {
	const key_map = {
		activeItemSlide: set_active_item_slide,
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

	// remove the visibility-selection
	document.querySelector("[id^=set_visibility_].active")?.classList.remove("active");
}

const clientID = `${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;
let selected_item_number;

function ws_connect() {
	const url = new URL(document.URL);

	const ws_url = `ws://${url.hostname}:${config.websocket.port}`;

	ws = new WebSocket(ws_url, "JGCP");
	
	ws.addEventListener("open", () => {
		// unblank the screen
		blank_screen(false);
	});
	
	ws.addEventListener("message", (event) => {
		const data = JSON.parse(event.data);
	
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
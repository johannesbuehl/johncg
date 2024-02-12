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
			data: rawData
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

	for (let o_item of data.data.sequence_items) {
		const div_sequence_item = document.createElement("div");
		div_sequence_item.classList.add("sequence_item");
		div_sequence_item.innerText = o_item.Caption;
		div_sequence_item.dataset.item_number = o_item.item;

		div_sequence_item.onclick = function() {
			request_item_slides(Number(this.dataset.item_number));
		};

		div_sequence_items.append(div_sequence_item);
	}
}

function request_item_slides(item) {
	if (item !== selected_item_number) {
		selected_item_number = item;
		
		// clear the current slides
		document.querySelector("#slides_view_container").innerHTML = "";
	
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
	select_item(data.data.metadata.item);

	let slide_counter = 0;

	for (let o_part of data.data.slides) {
		// create the container for the part
		const div_slide_part = document.createElement("div");
		div_slide_part.classList.add("slide_part");

		// create the header of the part and append it to the part-container
		const div_slide_part_header = document.createElement("div");
		div_slide_part_header.classList.add("header");
		div_slide_part_header.innerText = o_part.type;
		div_slide_part.append(div_slide_part_header);

		// create the slides-view and append it to the part container
		const div_slides_view = document.createElement("div");
		div_slides_view.classList.add("slides_view");
		div_slide_part.append(div_slides_view);

		// add all the slides to the slides_view
		for (let slide of o_part.slides) {
			const div_slide_container = document.createElement("div");
			div_slide_container.classList.add("slide_container");
			div_slides_view.append(div_slide_container);

			const div_slide = document.createElement("div");
			div_slide.classList.add("slide");
			div_slide.style.backgroundImage = `url("${data.data.metadata.BackgroundImage.replace(/\\/g, "\\\\")}")`;
			div_slide.dataset.slide_number = slide_counter;
			div_slide_container.append(div_slide);

			div_slide.onclick = function() {
				request_item_slide_select(
					Number(document.querySelector(".sequence_item.selected").dataset.item_number),
					Number(this.dataset.slide_number)
				);
			};

			// add the individual lyric-lines to the slide
			for (let line of slide) {
				const div_lyric_line = document.createElement("div");
				div_lyric_line.classList.add("lyric_line");
				div_lyric_line.innerText = line;
				div_slide.append(div_lyric_line);
			}

			slide_counter++;
		}
		// add the song-part to the slide-container
		div_slides_view_container.append(div_slide_part);
		
		// resize the lyrics-text to fit the slide
		// get the highest width
		let max_width = 0;

		const div_lyrics_lines = document.querySelectorAll("div.lyric_line");

		// get the width of the individual slides and store the biggest one
		// for (let ii = 0; ii < i_slide_count; ii++) {
		for (let div_lyric_line of div_lyrics_lines) {
			let current_width = div_lyric_line.clientWidth;

			max_width = Math.max(current_width, max_width);
		}

		// get the width of the container
		const current_container_width = document.querySelector("div.slide").clientWidth;

		// change the font size by the size difference ratio
		div_lyrics_lines.forEach((div_lyric_line) => {
			div_lyric_line.style.fontSize = `${current_container_width / max_width}em`;
		});
	}

	set_active_slide(data.clientID === clientID);
}

function select_item(item) {
	// store the selected item
	selected_item_number = item;

	// remove the selected class from the previous item
	const prev_selected_sequence_item = document.querySelector(".sequence_item.selected");
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

	const selected_item = document.querySelector(".sequence_item.selected");
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

function set_active_item_slide(data) {
	// store the data
	active_item_slide = data.data;

	// decide wether to jump there
	const jump = data.clientID === clientID || data.clientID === undefined;

	// remove the "active" class from the previous sequence-item and add it to the new one
	const prev_selected_item = document.querySelector(".sequence_item.active");
	if (prev_selected_item !== null) {
		prev_selected_item.classList.remove("active");
	}
	document.querySelector(`.sequence_item[data-item_number='${data.data.item}']`).classList.add("active");

	if (jump && active_item_slide.item !== selected_item_number) {
		request_item_slides(active_item_slide.item);
	} else {
		set_active_slide(jump);
	}
}

function random_4_hex() {
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function init() {
	selected_item_number = null;

	// remove all sequence-items
	document.querySelector("#sequence_items").innerHTML = "";

	// remove all item-slides
	document.querySelector("#slides_view_container").innerHTML = "";
}

const clientID = `${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;

let ws = new WebSocket(`ws://${config.websocket.host}:${config.websocket.port}`, "JGCP");

let active_item_slide = {
	item: 0,
	slide: 0
};

let selected_item_number;

ws.addEventListener("open", () => {
});

ws.addEventListener("message", (event) => {
	const o_data = JSON.parse(event.data);

	if (o_data.command !== "response")
		console.log(event);


	const o_command_parser_map = {
		"sequence-items": display_items,
		"item-slides": display_item_slides,
		"set-active-item-slide": set_active_item_slide,
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

	o_command_parser_map[o_data.command](o_data);

});

ws.addEventListener("ping", () => {
});

init();

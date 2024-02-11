function file_select_change(data) {
	let file = data.files[0];
	let reader = new FileReader();
	reader.loadend = function() {
	}
	reader.onload = function(e) {
		let rawData = e.target.result;

		let s_send_data = JSON.stringify({command: "open-sequence", data: rawData});

		ws.send(s_send_data);
	}
	reader.readAsText(file);
}

function button_navigate(type, direction) {
	ws.send(JSON.stringify({
		command: "navigate",
		type,
		direction
	}));
}

function button_display(state) {
	ws.send(JSON.stringify({
		command: "display",
		state
	}));
}

function load_sequence(o_data) {
	const div_sequence_items = document.getElementById("sequence_items");

	// clear sequence-items
	div_sequence_items.innerHTML = "";

	for (let o_item of o_data.data.sequence_items) {
		const div_sequence_item = document.createElement("div");
		div_sequence_item.classList.add("sequence_item");
		div_sequence_item.innerText = o_item.Caption;
		div_sequence_item.dataset.item_number = o_item.item;

		div_sequence_item.onclick = function() {
			request_sequence_item_select(this.dataset.item_number);
		};

		div_sequence_items.append(div_sequence_item);
	}

	select_item(o_data.data.item);
}

function request_sequence_item_select(i_id) {
	ws.send(JSON.stringify({
		command: "sequence-item-select",
		item: Number(i_id),
		slide: 0
	}));
}

function load_item_slides(o_data) {
	const div_slides_view_container = document.getElementById("slides_view_container");

	// clear sequence-items
	div_slides_view_container.innerHTML = "";

	select_item(o_data.data.metadata.item);

	let i_slide_counter = 0;

	for (let o_part of o_data.data.slides) {
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
			div_slide.style.backgroundImage = `url("${o_data.data.metadata.BackgroundImage.replace(/\\/g, "\\\\")}")`;
			div_slide.dataset.slide_number = i_slide_counter;
			div_slide_container.append(div_slide);

			div_slide.onclick = function() {
				request_item_slide_select(this.dataset.slide_number);
			};

			// add the individual lyric-lines to the slide
			for (let s_line of slide) {
				const div_lyric_line = document.createElement("div");
				div_lyric_line.classList.add("lyric_line");
				div_lyric_line.innerText = s_line;
				div_slide.append(div_lyric_line);
			}

			i_slide_counter++;
		}
		// add the song-part to the slide-container
		div_slides_view_container.append(div_slide_part);

	}

	// resize the lyrics-text to fit the slide
	// get the highest width
	let i_max_width = 0;

	const a_div_lyrics_lines = document.querySelectorAll("div.lyric_line");

	// get the width of the individual slides and store the biggest one
	// for (let ii = 0; ii < i_slide_count; ii++) {
	for (let div_lyric_line of a_div_lyrics_lines) {
		let i_current_width = div_lyric_line.clientWidth;

		i_max_width = Math.max(i_current_width, i_max_width);
	}

	// get the width of the container
	const c_i_current_container_width = document.querySelector("div.slide").clientWidth;

	// change the font size by the size difference ratio
	a_div_lyrics_lines.forEach((div_lyric_line) => {
		div_lyric_line.style.fontSize = `${c_i_current_container_width / i_max_width}em`;
	});

	// select_slide(o_data.data.metadata.slide);
}

function select_item(i_item) {
	// remove the selected class from the previous item
	const prev_selected_sequence_item = document.querySelector(".selected[data-item_number]");
	if (prev_selected_sequence_item !== null) {
		prev_selected_sequence_item.classList.remove("selected");
	}

	// add the selected class to the current item
	const selected_sequence_item = document.querySelector(`[data-item_number='${i_item}']`);
	selected_sequence_item.classList.add("selected");
}

function request_item_slide_select(i_id) {
	ws.send(JSON.stringify({
		command: "item-slide-select",
		slide: Number(i_id)
	}));
}

function set_active_slide(o_data) {
	select_slide(o_data.data.slide);
}

function select_slide(i_slide) {
	// remove the selected class from the previous item
	const prev_selected_item_slide = document.querySelector(".selected[data-slide_number]");
	if (prev_selected_item_slide !== null) {
		prev_selected_item_slide.classList.remove("selected");
	}

	// add the selected class to the current item
	const selected_sequence_item = document.querySelector(`[data-slide_number='${i_slide}']`);
	selected_sequence_item.classList.add("selected");
}

ws = new WebSocket(`ws://${config.websocket.host}:${config.websocket.port}`, "JGCP");

ws.addEventListener("open", (event) => {
});

ws.addEventListener("message", (event) => {
	const o_data = JSON.parse(event.data);

	const o_command_parser_map = {
		sequence: load_sequence,
		item: load_item_slides,
		"set-active-slide": set_active_slide,
		response: console.debug
	};

	o_command_parser_map[o_data.command](o_data);

});

ws.addEventListener("ping", (event) => {
});
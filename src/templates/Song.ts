import { SongTemplateData } from "../server/PlaylistItems/Song";
import { ItemPart } from "../server/PlaylistItems/SongFile/SongFile";

let data: SongTemplateData & { mute_transition: boolean };

let active_slide = 0;
let slide_count = 0;

// CasparCG-function: transmits data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function update(s_data: string) {
	// parse the transferred data into json
	try {
		data = JSON.parse(s_data) as SongTemplateData & {
			mute_transition: boolean;
		};
	} catch (error) {
		if (!(error instanceof SyntaxError)) {
			throw error;
		} else {
			return;
		}
	}

	// get the div for the display and storage
	const div_container = document.querySelector<HTMLDivElement>("div#container");
	const div_storage = document.querySelector<HTMLDivElement>("div#storage");

	if (div_container === null || div_storage === null) return;

	// if requested, diable transition-effects
	const main_div = document.querySelector<HTMLDivElement>("div#_main");
	if (main_div === null) return;

	if (data.mute_transition) {
		main_div.style.transitionProperty = "none";
	} else {
		main_div.style.transitionProperty = "";
	}

	// clear the storage-container
	div_storage.innerHTML = "";

	// counter for the individual slides
	let slide_counter = 0;

	// create the slides and store them in the container
	for (const part of data.parts) {
		// parent-div of slide
		create_slide(part, data.languages).forEach((slide) => {
			slide.dataset.slide = slide_counter.toString();
			div_storage.append(slide);

			slide_counter++;
		});
	}

	// store the amount of slides
	slide_count = slide_counter;

	active_slide = data.slide;

	// display the first slide
	jump(active_slide);

	// resize all the slides (has to be done after displayin the first slide)
	resize_slides();
}

// CasparCG-function: displays the template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function play() {
	const main_div = document.querySelector<HTMLDivElement>("div#_main");

	if (main_div !== null) {
		main_div.style.opacity = "1";
	}
}

// CasparCG-function: advances to the next step
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function next() {
	jump(active_slide + 1);
}

// custom-function (through invoke): advance to the previous step
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function prev() {
	jump(active_slide - 1);
}

// custom-function (through invoke): jump to an arbitrary slide
function jump(counter_raw: number) {
	const counter = clamp_slide_counter(counter_raw);

	// get the container to display the load the slide into
	const main_div = document.querySelector<HTMLDivElement>("div#container");

	if (main_div === null) return;

	// clear the content of the container
	main_div.innerHTML = "";

	// clone the slide and change its id, so the id stays unique
	const div_slide = document
		.querySelector<HTMLDivElement>(`div[data-slide='${counter}']`)
		?.cloneNode(true) as HTMLDivElement;

	if (div_slide === undefined) return;

	div_slide.id = "slide_active";

	main_div.appendChild(div_slide);

	active_slide = counter;
}

// CasparCG-function: hide the template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stop() {
	const main_div = document.querySelector<HTMLDivElement>("div#_main");

	if (main_div === null) return;

	main_div.style.opacity = "0";
}

// clamp the counter to valid values
function clamp_slide_counter(counter_raw: number) {
	return Math.max(0, Math.min(slide_count - 1, counter_raw));
}

// change the font-size so the slide with the highest width uses all of the available space
function resize_slides() {
	// get the highest width
	const max_width = get_max_width();
	const max_height = get_max_height();

	// get the width of the container
	const active_slide = document.querySelector<HTMLDivElement>("div#slide_active");

	resize_slides_text(max_width, max_height, active_slide);
}

// get the width of the widest slide
function get_max_width() {
	let max_width = 0;

	// get the width of the individual slides and store the biggest one
	for (let ii = 0; ii < slide_count; ii++) {
		const slide = document.querySelector<HTMLDivElement>(`div#storage [data-slide='${ii}']`);

		if (slide?.querySelector<HTMLDivElement>("div.lyric") !== undefined) {
			const current_width = slide.clientWidth;
			max_width = Math.max(current_width, max_width);
		}
	}

	return max_width;
}

function get_max_height() {
	let max_height = 0;

	// get the width of the individual slides and store the biggest one
	for (let ii = 0; ii < slide_count; ii++) {
		const slide = document.querySelector<HTMLDivElement>(`div#storage [data-slide='${ii}']`);

		if (slide?.querySelector<HTMLDivElement>("div.lyric") !== undefined) {
			const current_width = slide.clientHeight;
			max_height = Math.max(current_width, max_height);
		}
	}

	return max_height;
}

function create_slide(part: ItemPart, languages: number[]): HTMLDivElement[] {
	switch (part.type) {
		case "title": {
			// parent-div of slide
			const div_slide = document.createElement("div");

			const div_content = document.createElement("div");
			div_content.classList.add("slide");
			div_slide.append(div_content);

			div_content.classList.add("title");
			const title_container = document.createElement("div");
			title_container.classList.add("title_container");
			div_content.append(title_container);

			// create the titles for the individual languages
			languages.forEach((language, index) => {
				const div_title = document.createElement("div");
				div_title.classList.add(`language_${index}`);
				div_title.innerText = part.title[language] ?? "";
				title_container.append(div_title);
			});

			const div_church_song_id = document.createElement("div");
			div_church_song_id.classList.add("song_id");

			if (part.church_song_id !== undefined) {
				div_church_song_id.innerText = part.church_song_id;
			}

			div_content.append(div_church_song_id);

			return [div_slide];
		}
		case "lyric": {
			return part.slides.map((slide): HTMLDivElement => {
				// parent-div of slide
				const div_slide = document.createElement("div");

				const div_content = document.createElement("div");
				div_content.classList.add("slide");
				div_slide.append(div_content);

				div_content.classList.add("lyric");

				// add the individual text-lines
				for (const line_package of slide) {
					// create a template for the line
					const line_template = document.createElement("div");
					line_template.classList.add("text_line");

					// add the individual languages
					languages.forEach((language, index) => {
						const line = line_template.cloneNode(true) as HTMLDivElement;
						line.classList.add(`language_${index}`);
						line.innerText = line_package[language];

						div_content.append(line);
					});
				}

				return div_content;
			});
		}
	}
}

function resize_slides_text(max_width: number, max_height: number, container: HTMLElement) {
	const width_ratio = container.clientWidth / max_width;
	const height_ratio = container.clientHeight / max_height;

	// change the font size by the size difference ratio
	document.querySelectorAll<HTMLDivElement>("div.slide.lyric").forEach((ele) => {
		ele.style.fontSize = `${Math.min(width_ratio, height_ratio)}em`;
	});
}

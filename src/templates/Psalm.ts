import { PsalmTemplateData } from "../server/PlaylistItems/Psalm";

let data: PsalmTemplateData & { mute_transition: boolean };

let active_slide = 0;

// casparcg-function: transmits data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function update(s_data: string) {
	// parse the transferred data into json
	try {
		data = JSON.parse(s_data) as PsalmTemplateData & {
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
	for (const slide_data of data.data.text) {
		// parent-div of slide
		const div_slide = create_slide(data.data.metadata, slide_data);
		div_slide.dataset.slide = slide_counter.toString();
		div_storage.append(div_slide);

		slide_counter++;
	}

	active_slide = data.slide;

	if (data.data.metadata.indent) {
		document.querySelectorAll<HTMLDivElement>("div.part").forEach((ele, index) => {
			if (index % 2 !== 0) {
				ele.classList.add("indent");
			}
		});
	}

	// display the first slide
	jump(active_slide);
}

// casparcg-function: displays the template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function play() {
	const main_div = document.querySelector<HTMLDivElement>("div#_main");

	if (main_div !== null) {
		main_div.style.opacity = "1";
	}
}

// casparcg-function: advances to the next step
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

// casparcg-function: hide the template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stop() {
	const main_div = document.querySelector<HTMLDivElement>("div#_main");

	if (main_div === null) return;

	main_div.style.opacity = "0";
}

// clamp the counter to valid values
function clamp_slide_counter(counter_raw: number) {
	return Math.max(0, Math.min(data.data.text.length - 1, counter_raw));
}

function create_slide(title_data: PsalmTemplateData["data"]["metadata"], slide_data: string[][]) {
	// parent-div of slide
	const div_slide = document.createElement("div");

	const div_title = document.createElement("div");
	div_title.classList.add("title");
	div_slide.append(div_title);

	const div_title_caption = document.createElement("div");
	div_title_caption.classList.add("caption");
	div_title_caption.innerText = title_data.caption;

	const div_title_id = document.createElement("div");
	div_title_id.classList.add("id");
	div_title_id.innerText = title_data.id;

	div_title.append(div_title_caption, div_title_id);

	const div_content = document.createElement("div");
	div_content.classList.add("slide");
	div_slide.append(div_content);

	// create a template for the parts and lines
	const part_tempalte = document.createElement("div");
	part_tempalte.classList.add("part");

	const line_template = document.createElement("div");
	line_template.classList.add("text_line");

	// add the individual text-lines
	for (const part_text of slide_data) {
		const part = part_tempalte.cloneNode(true) as HTMLDivElement;

		// add the individual languages
		part_text.forEach((line_text) => {
			const line = line_template.cloneNode(true) as HTMLDivElement;
			line.innerText = line_text;

			part.append(line);
		});

		div_content.append(part);
	}

	return div_slide;
}

update(
	JSON.stringify({
		slide: 0,
		data: {
			metadata: {
				caption: "Psalm 22",
				id: "EG 709.1",
				book: "Evangelisches Gesangsbuch",
				indent: true
			},
			text: [
				[
					[
						"Mein Gott, mein Gott, warum hast du mich verlassen?",
						"Ich schreie, aber meine Hilfe ist ferne."
					],
					[
						"Mein Gott, des Tages rufe ich, doch antwortest du nicht,",
						"und des Nachts, doch finde ich keine Ruhe."
					],
					["Du aber bist heilig,", "der du thronst über den Lobgesängen Israels."],
					["Unsere Väter hofften auf dich;", "und da sie hofften, halfst du ihnen heraus."],
					[
						"Zu dir schrien sie und wurden errettet,",
						"sie hofften auf dich und wurden nicht zuschanden."
					]
				],
				[
					["Sei nicht ferne von mir, denn Angst ist nahe;", "denn es ist hier kein Helfer."],
					["Aber du, Herr, sei nicht ferne;", "meine Stärke, eile, mir zu helfen!"]
				]
			]
		}
	})
);

play();
jump(2);

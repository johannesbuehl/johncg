import { CountdownTemplateData } from "../server/PlaylistItems/Countdown";

let update_interval: NodeJS.Timeout;
const spans: {
	hours?: HTMLSpanElement[];
	minutes: HTMLSpanElement[];
	seconds?: HTMLSpanElement[];
} = {
	hours: [],
	minutes: []
};
let data: CountdownTemplateData & { mute_transition: boolean };

const end_time = new Date();

let end_time_sign;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function update(str_args: string) {
	// clear the old-state
	clearInterval(update_interval);

	try {
		data = JSON.parse(str_args) as CountdownTemplateData & {
			mute_transition: boolean;
		};
	} catch (error) {
		if (!(error instanceof SyntaxError)) {
			throw error;
		} else {
			return;
		}
	}

	// if requested, disable transition-effects
	const main_div = document.querySelector<HTMLDivElement>("div#main");
	if (main_div !== null) {
		if (data.mute_transition) {
			main_div.style.transitionProperty = "none";
		} else {
			main_div.style.transitionProperty = "";
		}
	}

	// create the individual spans for the numbers
	spans.hours = [document.createElement("span"), document.createElement("span")];
	spans.minutes = [document.createElement("span"), document.createElement("span")];

	if (data.show_seconds === true) {
		spans.seconds = [document.createElement("span"), document.createElement("span")];
	} else {
		delete spans.seconds;
	}

	// create the individual spans
	const time_div = document.querySelector<HTMLDivElement>("#time");
	if (time_div === null) {
		return;
	} else {
		time_div.innerHTML = "";
	}

	const colon_hm: HTMLSpanElement = document.createElement("span");
	colon_hm.innerText = ":";
	colon_hm.id = "colon_hm";
	colon_hm.classList.add("colon");

	Object.entries(spans).forEach(([key, vals]) => {
		if (key === "seconds") {
			const colon_ms = colon_hm.cloneNode(true) as HTMLSpanElement;
			colon_ms.id = "colon_ms";
			time_div.append(colon_ms);
		}

		time_div.append(vals[0]);
		time_div.append(vals[1]);

		if (key === "hours") {
			time_div.append(colon_hm);
		}
	});

	// // create an overlaying div for the underline
	// const underline_div = document.createElement("div");
	// underline_div.classList.add("underline");
	// underline_div.id = "underline";
	// time_div.append(underline_div);

	// if the position is undefined, set them to center
	if (data.position.x === undefined) {
		data.position.x = 50;
	}
	if (data.position.y === undefined) {
		data.position.y = 50;
	}

	if (data.font_size !== undefined) {
		const this_format = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			fontSize: `${data.font_size}em`
		};

		Object.entries(this_format).forEach(([key, val]) => {
			time_div.style[key] = val;
		});
	}

	if (data.time !== undefined) {
		const time = data.time.match(/(?<hours>\d+)(?::)(?<minutes>\d\d)((?::)(?<seconds>\d\d))?/);

		if (time?.groups) {
			end_time.setHours(parseInt(time.groups.hours));
			end_time.setMinutes(parseInt(time.groups.minutes));
			end_time.setSeconds(parseInt(time.groups.seconds));
		}

		end_time_sign = Math.sign(Date.now() - end_time.getTime());

		update_interval = setInterval(function () {
			update_time();
		}, 100);
		position_time();
		update_time();
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function play() {
	document.querySelector("#main")?.classList.remove("stop");
	document.querySelector("#main")?.classList.add("show");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stop() {
	document.querySelector("#main")?.classList.remove("show");
	document.querySelector("#main")?.classList.add("stop");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function next() {}

function get_remaining_time(): [Record<keyof typeof spans, string[]>, boolean] {
	const time_remaining = new Date(end_time.getTime() - Date.now());

	return [
		{
			hours: time_remaining.getUTCHours().toString().padStart(2, "0").split(""),
			minutes: time_remaining.getUTCMinutes().toString().padStart(2, "0").split(""),
			seconds: time_remaining.getUTCSeconds().toString().padStart(2, "0").split("")
		},
		Math.sign(time_remaining.getTime()) === end_time_sign
	];
}

const time_div = document.querySelector<HTMLDivElement>("div#time");

function position_time() {
	if (time_div !== null) {
		time_div.style.left = `${data.position.x}%`;
		time_div.style.top = `${data.position.y}%`;

		time_div.style.transform = `translate(-50%, -50%)`;
	}
}

function update_time() {
	const [time, finished]: [Record<keyof typeof spans, string[]>, boolean] = get_remaining_time();

	if (finished) {
		clearInterval(update_interval);
	} else {
		// if the hours are 00, don't show them anymore
		if (time.hours.join("") === "00") {
			if (spans.hours !== undefined) {
				spans.hours[0].remove();
				spans.hours[1].remove();
				document.querySelector("#colon_hm")?.remove();

				delete spans.hours;

				// re-position everything
				position_time();
			}
		}

		Object.entries(spans).forEach(([key, val]) => {
			val[0].innerText = time[key as keyof typeof spans][0];
			val[1].innerText = time[key as keyof typeof spans][1];
		});
	}
}

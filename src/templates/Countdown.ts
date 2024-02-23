import { CountdownRenderObject } from "../server/SequenceItems/Countdown";

let update_interval: NodeJS.Timeout;
const spans: {
	hours?: HTMLSpanElement[],
	minutes: HTMLSpanElement[],
	seconds?: HTMLSpanElement[]
} = {
	hours: [],
	minutes: []
};
let data: CountdownRenderObject;

const end_time = new Date();

let end_time_sign;


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function update(str_args: string) {
	// clear the old-state
	clearInterval(update_interval);
	
	data = JSON.parse(str_args) as CountdownRenderObject;
	
	// if requested, diable transition-effects
	const main_div = document.querySelector<HTMLDivElement>("div#main");
	if (main_div !== null) {
		if (data.mute_transition) {
			main_div.style.transitionProperty = "none";
		} else {
			main_div.style.transitionProperty = "";
		}
	}
	
	// create the individual spans for the numbers
	spans.hours = [
		document.createElement("span"),
		document.createElement("span")
	];
	spans.minutes = [
		document.createElement("span"),
		document.createElement("span")
	];
	
	if (data.show_seconds === true) {
		spans.seconds = [
			document.createElement("span"),
			document.createElement("span")
		];
	}
	
	// create the individual spans
	const time_div = document.querySelector<HTMLDivElement>("#time");
	if (time_div === null) {
		return;
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

	// if the position is undefined, set them to center
	if (data.position.x === undefined) {
		data.position.x = 50;
	}
	if (data.position.y === undefined) {
		data.position.y = 50;
	}

	if (data.font_format !== undefined) {
		const this_format = {
			...data.font_format,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			fontSize: `${data.font_format.fontSize}em`
		};

		Object.entries(this_format).forEach(([key, val]) => {
			time_div.style[key] = val;
		});
	}

	if (main_div !== null) {
		if (data.background_image !== undefined) {
			main_div.style.backgroundImage = `url("${data.background_image.replace(/\\/g, "\\\\")}")`;
		} 
		if (data.background_color !== undefined) {
			main_div.style.backgroundImage = data.background_color;
		}
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
function next() {
}

function get_remaining_time(): [Record<keyof typeof spans, string[]>, boolean]  {
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

const root = document.querySelector(":root");
const time_div = document.querySelector<HTMLDivElement>("div#time");

function position_time() {
		const root_width = root?.clientWidth;
		const root_height = root?.clientHeight;
		const time_width = time_div?.clientWidth;
		const time_height = time_div?.clientHeight;

		if (
			root_width !== undefined &&
			root_height !== undefined &&
			time_width !== undefined &&
			time_height !== undefined && 
			time_div !== null
		) {
				
			const free_width_share = 1 - time_width / root_width;
			const free_height_share = 1 - time_height / root_height;
			
			const left = data.position.x * free_width_share + time_width / root_width / 2;
			const top = data.position.y * free_height_share + time_height / root_height / 2;
			
			time_div.style.left = `${left}%`;
			time_div.style.top = `${top}%`;
			
			time_div.style.transform = `translate(-${left}, -${top})`;
		}
}

function update_time() {
	const [time, finished]: [
		Record<keyof typeof spans, string[]>,
		boolean
	] = get_remaining_time();

	if (finished) {
		clearInterval(update_interval);
	} else {
		// if the hours are 00, don't show them anymore
		if  (time.hours.join("") === "00") {
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
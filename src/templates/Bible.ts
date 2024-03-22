import type { BibleJSON } from "../server/PlaylistItems/Bible";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function update(str_args: string) {
	let json_args: BibleJSON;
	try {
		json_args = JSON.parse(str_args) as BibleJSON;
	} catch (error) {
		if (!(error instanceof SyntaxError)) {
			throw error;
		}
	}

	if (json_args.text !== undefined) {
		document.getElementById("text").innerHTML = json_args.text;
	}

	if (json_args.mute_transition) {
		document.querySelector<HTMLDivElement>("div#main").style.transition = "none";
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function play() {
	const main = document.querySelector("#main");
	main.classList.add("show");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stop() {
	const main = document.querySelector("#main");

	main.classList.add("stop");

	const reset_after_stop = () => {
		main.classList.remove("show");
		main.classList.remove("stop");

		main.removeEventListener("transitionend", reset_after_stop);
	};

	main.addEventListener("transitionend", reset_after_stop);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function next() {}

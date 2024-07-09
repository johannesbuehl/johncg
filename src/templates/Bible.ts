import type { BibleJSON } from "../server/PlaylistItems/Bible";

let mute_transition: boolean = false;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function update(str_args: string) {
	let json_args: BibleJSON | undefined = undefined;
	try {
		json_args = JSON.parse(str_args) as BibleJSON;
	} catch (error) {
		if (!(error instanceof SyntaxError)) {
			throw error;
		}
	}

	if (json_args?.text !== undefined) {
		document.querySelector("#text").innerHTML = json_args.text;
	}

	mute_transition = json_args?.mute_transition ?? false;

	if (mute_transition === true) {
		document.querySelectorAll("*").forEach((ele: HTMLElement) => {
			ele.style.transition = "unset";
		});
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function play() {
	const main = document.querySelector("#main");
	const text = document.querySelector("#text_wrapper");

	const show_text = () => {
		const remove_listeners = () => {
			main.removeEventListener("transitionend", show_text);
			text.removeEventListener("transitionend", remove_listeners);
		};

		text.addEventListener("transitionend", remove_listeners);

		setTimeout(() => {
			text.classList.add("show");
		}, 250);
	};

	if (mute_transition) {
		text.classList.add("show", "slide_out");
	} else {
		main.addEventListener("transitionend", show_text);
	}

	main.classList.add("slide_in");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stop() {
	const text_wrapper = document.querySelector("#text_wrapper");
	const main = document.querySelector("#main");

	const slide_out = () => {
		text_wrapper.removeEventListener("transitionend", slide_out);

		setTimeout(() => {
			const reset = () => {
				main.removeEventListener("transitionend", reset);
			};

			main.addEventListener("transitionend", reset);

			main.classList.remove("slide_in");
		}, 500);
	};

	if (mute_transition) {
		main.classList.remove("slide_in");
	} else {
		text_wrapper.addEventListener("transitionend", slide_out);
	}

	text_wrapper.classList.remove("show");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function next() {}

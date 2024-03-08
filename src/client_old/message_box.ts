type MessageType = "error" | "log" | "debug";

interface Message {
	type: MessageType;
	time: Date;
	text: string;
}

const icon_map = {
	error: "fa-solid fa-xmark error",
	log: "fa-solid fa-info log",
	debug: "fa-solid fa-bug debug"
};

export default class MessageLog {
	private messages: Message[] = [];

	private message_box_container: HTMLElement;

	private settings = {
		show: {
			error: true,
			log: true,
			debug: false
		}
	};

	constructor(message_box_container: HTMLElement) {
		this.message_box_container = message_box_container;
	}

	error(text: string) {
		this.add_message(text, "error");
	}

	log(text: string) {
		this.add_message(text, "log");
	}

	debug(text: string) {
		this.add_message(text, "debug");
	}

	private add_message(text: string, type: MessageType) {
		const message: Message = {
			text,
			type,
			time: new Date()
		};

		this.messages.push(message);

		if (this.settings.show[type]) {
			this.create_msg_box(message);
		}
	}

	private create_msg_box(message: Message) {
		// div for the individual elements of the box
		const message_box = document.createElement("div");
		message_box.classList.add("message_box");

		// container for the symbol
		const symbol_container = document.createElement("div");
		symbol_container.classList.add("symbol");
		message_box.append(symbol_container);

		// symbol of the message
		const symbol = document.createElement("i");
		symbol.classList.add(...icon_map[message.type].split(" "));
		symbol_container.append(symbol);

		// message-text
		const error_text = document.createElement("div");
		error_text.classList.add("text");
		error_text.innerText = message.text;
		message_box.append(error_text);

		// time of the error
		const error_time = document.createElement("div");
		error_time.classList.add("time");
		error_time.innerText = message.time.toLocaleTimeString();
		message_box.append(error_time);

		// display the message-box
		this.message_box_container.prepend(message_box);

		// function to transition out and remove itself
		const self_remove = (fade_out_time?: string) => {
			// if there is a fade-out-time specified, use it
			if (fade_out_time !== undefined) {
				// if it is instant, remove it instantly, since the "transitionend"-event will never fire
				if (fade_out_time === "0s") {
					message_box.remove();

					// return since the box is removed
					return;
				} else {
					// set the given transition duration
					message_box.style.transitionDuration = fade_out_time;
				}
			}

			// add the class for the fade-out
			message_box.classList.add("fade_out");

			// eventlistener to remove the end after the transition
			message_box.addEventListener("transitionend", () => {
				message_box.remove();
			});
		};

		// if the error_message gets clicked, remove it, but faster
		message_box.addEventListener("click", () => self_remove("0.1s"));

		// delay the showing of the messagebox by a little bit to trigger the in-transition
		setTimeout(() => {
			message_box.classList.add("visible");
		}, 10);

		// auto remove the message after 5 seconds
		setTimeout(() => {
			self_remove();
		}, 5000);
	}
}

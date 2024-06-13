export default class Chord {
	private note: string;
	private chord_descriptors: string = "";
	private bass_note?: string;

	readonly invalid: boolean = false;

	constructor(note: string) {
		const regex_chord_parts = /(?<Note>\w[<#=]?)(?<descriptor>[\w\d]*?)(?:\/(?<Bass>\w[<#=]))?/;

		const result = regex_chord_parts.exec(note);

		if (result) {
			if (result.groups?.Note) {
				this.note = standardize_note(result.groups?.Note);
			} else {
				this.invalid = true;

				throw new SyntaxError("invalid chord");
			}

			if (result.groups?.Bass) {
				this.bass_note = standardize_note(result.groups?.Bass);
			}

			if (result.groups?.descriptor) {
				this.chord_descriptors = result.groups.descriptor;
			}
		} else {
			this.invalid = true;
			this.note = note;
		}
	}

	get_chord_string(transpose_steps: number = 0): string {
		let chord_string = `${transpose(this.note, transpose_steps)}${this.chord_descriptors}`;

		if (this.bass_note !== undefined) {
			chord_string += `/${transpose(this.bass_note, transpose_steps)}`;
		}

		return chord_string;
	}
}

const notes_sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const notes_flat = ["C", "D<", "D", "E<", "E", "F", "G<", "G", "A<", "A", "B<", "B"];
function transpose(note: string, steps: number): string {
	// convert the note to a number between 0 and 11
	let note_number = notes_sharp.indexOf(note);
	if (note_number === -1) {
		note_number = notes_flat.indexOf(note);
	}
	if (note_number === -1) {
		return null;
	}

	// if there are no transposing steps, return the note
	if (steps === 0) {
		return note;
	}

	// add the transpose-steps
	note_number += steps;
	// flatten to the positive 12-step range
	note_number = ((note_number % 12) + 12) % 12;

	return steps > 0 ? notes_sharp[note_number] : notes_flat[note_number];
}

function standardize_note(raw_note: string): string {
	return raw_note.replace("H", "B");
}

export interface Chord {
	note: string;
	chord_descriptors?: string;
	bass_note?: string;
}

export function create_chord(note: string): Chord {
	const chord: Chord = {
		note: ""
	};

	const regex_chord_parts = /^(?<Note>\w[<#=]?)(?<descriptor>[^/]*?)?(?:\/(?<Bass>\w[<#=]?m?))?$/;

	const result = regex_chord_parts.exec(note);

	if (result) {
		if (result.groups?.Note) {
			chord.note = standardize_note(result.groups?.Note);
		} else {
			throw new SyntaxError("invalid chord");
		}

		if (result.groups?.Bass) {
			chord.bass_note = standardize_note(result.groups?.Bass);
		}

		if (result.groups?.descriptor) {
			chord.chord_descriptors = result.groups.descriptor;
		}
	} else {
		chord.note = note;
	}

	return chord;
}

export function get_chord_string(chord: Chord, transpose_steps: number = 0): string {
	const transposed_chord = transpose_chord(chord, transpose_steps);

	let chord_string = `${transposed_chord.note}${transposed_chord.chord_descriptors ?? ""}`;

	if (transposed_chord.bass_note !== undefined) {
		chord_string += `/${transposed_chord.bass_note}`;
	}

	return chord_string;
}

const notes_sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const notes_flat = ["C", "D<", "D", "E<", "E", "F", "G<", "G", "A<", "A", "B<", "B"];
function transpose(note: string, steps: number): string {
	// if there are no transposing steps, return the note
	if (steps === 0) {
		return note;
	}

	// remove a potential natural sign
	note = note.replace("=", "");

	// convert the note to a number between 0 and 11
	let note_number;
	if (note_number === -1) {
		note_number = notes_flat.indexOf(note);
	} else {
		note_number = notes_sharp.indexOf(note);
	}
	if (note_number === -1) {
		return note;
	}

	// add the transpose-steps
	note_number += steps;
	// flatten to the positive 12-step range
	note_number = ((note_number % 12) + 12) % 12;

	return steps > 0 ? notes_sharp[note_number] : notes_flat[note_number];
}

export function transpose_chord(chord: Chord, steps: number): Chord {
	return {
		note: transpose(chord.note, steps),
		chord_descriptors: chord.chord_descriptors,
		bass_note: chord.bass_note !== undefined ? transpose(chord.bass_note, steps) : undefined
	};
}

function standardize_note(raw_note: string): string {
	return raw_note.replace("H", "B");
}

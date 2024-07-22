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
			chord.note = result.groups?.Note;
		} else {
			throw new SyntaxError("invalid chord");
		}

		if (result.groups?.Bass) {
			chord.bass_note = result.groups?.Bass;
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

const notes_major = ["F#", "G", "A<", "A", "B<", "B", "C", "D<", "D", "E<", "E", "F", "G<"];
const notes_minor = ["E<", "E", "F", "F#", "G", "G#", "A", "B<", "B", "C", "C#", "D", "D#"];
function transpose(note: string, steps: number, minor: boolean): string {
	// if there are no transposing steps, return the note
	if (steps === 0) {
		return note;
	}

	// normalize the note
	note = standardize_note(note);

	// handle major and minor different
	let scale: string[];
	if (minor) {
		scale = notes_minor;
	} else {
		scale = notes_major;
	}

	let note_number = scale.indexOf(note);

	// if the note is not in the scale, return the note
	if (note_number === -1) {
		return note;
	}

	// add the transpose-steps
	note_number += steps;
	// flatten to the positive 12-step range
	note_number = ((note_number % 12) + 12) % 12;

	// if the index is 0 (first entry, but could also be the last one), decide on the transposing steps
	if (note_number === 0 && steps < 0) {
		return scale[12];
	}

	return scale[note_number];
}

export function transpose_chord(chord: Chord, steps: number): Chord {
	const minor = is_minor(chord);

	return {
		note: transpose(chord.note, steps, minor),
		chord_descriptors: chord.chord_descriptors,
		bass_note: chord.bass_note !== undefined ? transpose(chord.bass_note, steps, minor) : undefined
	};
}

function standardize_note(raw_note: string): string {
	return raw_note.replace("H", "B").replace("=", "");
}

function is_minor(chord: Chord): boolean {
	return chord.chord_descriptors?.[0] === "m";
}

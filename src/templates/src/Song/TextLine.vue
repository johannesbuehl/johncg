<script lang="ts">
	export interface ChordDescriptor {
		text?: string;
		super?: string;
	}

	export interface RenderChord {
		note: string;
		descriptors?: ChordDescriptor[];
		bass_note?: string;
	}
</script>

<script setup lang="ts">
	import { type Chord, transpose_chord } from "@server/PlaylistItems/SongFile/Chord";

	const props = defineProps<{
		text: string;
		chords?: Record<number, Chord>;
		transpose_steps?: number;
	}>();

	/**
	 * constructs an object-array for the text-line
	 * @param lang text of the line
	 * @param chords chords for the line
	 * @returns text-packets with their chords
	 */
	function create_text_line(
		lang: string,
		chords?: Record<number, Chord>
	): { text_packet: string; chord?: RenderChord }[] {
		const return_snippets: { text_packet: string; chord?: Chord }[] = [];

		// if there are no chords, create a single text-element
		if (chords === undefined) {
			return_snippets.push({ text_packet: lang });
		} else {
			const line_chords_entries = Object.entries(chords).map(
				([cc, chord]: [string, Chord]): [number, RenderChord] => [
					parseFloat(cc),
					format_chord(
						props.transpose_steps ? transpose_chord(chord, props.transpose_steps) : chord
					)
				]
			);

			line_chords_entries.sort((a, b) => {
				if (a[0] > b[0]) {
					return 1;
				} else if (a[0] === b[0]) {
					return 0;
				} else {
					return -1;
				}
			});

			// if there is a chord before the text, add it standalone
			if (line_chords_entries[0]?.[0] < 0) {
				return_snippets.push({
					text_packet: " ",
					chord: line_chords_entries[0][1]
				});

				// remove the chord from the array
				line_chords_entries.shift();
			}

			// if there are no chords in the line, just add the text
			if (line_chords_entries.length === 0) {
				return_snippets.push({ text_packet: lang });
			} else {
				// if there is text before the first chord, add it beforehand
				if (line_chords_entries[0]?.[0] > 0) {
					return_snippets.push({
						text_packet: lang.slice(0, Math.ceil(line_chords_entries[0][0]))
					});
				}

				// add the individual chords
				line_chords_entries.forEach(([chord_index, chord], chord_number) => {
					let return_snippet: { text_packet: string; chord?: Chord } = { text_packet: "", chord };

					// if the chord is between two chars, add it with an hyphen
					if (chord_index % 1 === 0.5) {
						// if it is inside a word, add a hyphen
						const regex_is_char = /[\wüöäß]/;
						if (
							[lang[Math.floor(chord_index)] ?? "", lang[Math.ceil(chord_index)] ?? ""].every(
								(char) => regex_is_char.test(char)
							)
						) {
							return_snippet.text_packet += "-";
							chord_index++;
						} else {
							// elese add an extra space
							return_snippet.text_packet += " ";
						}
					}

					// if it is the last chord of the line, use the rest of the text
					if (chord_number === line_chords_entries.length - 1) {
						return_snippet.text_packet += lang.slice(Math.floor(chord_index));
					} else {
						// take the text until the next space
						const last_space =
							lang
								.slice(Math.floor(chord_index), Math.ceil(line_chords_entries[chord_number + 1][0]))
								.lastIndexOf(" ") + 1;

						// if there is a space before the next chord, take only the text until the next-chords-word
						if (last_space) {
							return_snippets.push({
								text_packet:
									return_snippet.text_packet +
									lang.slice(Math.floor(chord_index), Math.floor(chord_index) + last_space - 1),
								chord
							});

							return_snippet.text_packet = lang.slice(
								Math.floor(chord_index) + last_space - 1,
								Math.ceil(line_chords_entries[chord_number + 1][0])
							);

							return_snippet.chord = undefined;
						} else {
							return_snippet.text_packet += lang.slice(
								Math.floor(chord_index),
								Math.ceil(line_chords_entries[chord_number + 1][0])
							);
						}
					}

					if (return_snippet.text_packet === "") {
						return_snippet.text_packet = " ";
					}

					return_snippets.push(return_snippet);
				});
			}
		}

		return return_snippets;
	}

	const note_replacer = {
		/* eslint-disable @typescript-eslint/naming-convention */
		"<": "♭",
		"=": "♮",
		"#": "♯"
		/* eslint-enablee @typescript-eslint/naming-convention */
	};
	/**
	 * inserts correct sharp and flat symbols
	 * @param note
	 * @returns formatted note
	 */
	function format_note(note: string): string {
		Object.entries(note_replacer).forEach(
			([pattern, replacement]) => (note = note.replace(pattern, replacement))
		);

		return note;
	}

	const descriptor_replacer = {
		M: "maj"
	};
	/**
	 * formats the descriptors of the chord
	 * @param descriptor string of all the descriptors of the chord
	 * @returns array of the individual descriptors prepared for rendering
	 */
	function format_descriptors(descriptor: string): Required<RenderChord>["descriptors"] {
		const descriptors_array: Required<RenderChord>["descriptors"] = [];

		[...descriptor].forEach((c) => {
			const descriptor_object: ChordDescriptor = {};

			if (parseInt(c)) {
				descriptor_object.super = c;
			} else {
				descriptor_object.text = c;
			}

			descriptors_array.push(descriptor_object);
		});

		Object.entries(descriptor_replacer).forEach(([pattern, replacement]) => {
			descriptors_array.forEach(
				(descriptor) => (descriptor.text = descriptor.text?.replace(pattern, replacement))
			);
		});

		return descriptors_array;
	}

	function format_chord(chord: Chord): RenderChord;
	function format_chord(chord: undefined): undefined;
	/**
	 * formats a chord for rendering
	 * @param chord chord-object
	 * @returns chord split into individual parts used for rendering
	 */
	function format_chord(chord: Chord | undefined): RenderChord | undefined {
		if (chord === undefined) {
			return undefined;
		} else {
			return {
				note: format_note(chord.note),
				descriptors:
					chord.chord_descriptors !== undefined
						? format_descriptors(chord.chord_descriptors)
						: undefined,
				bass_note: chord.bass_note !== undefined ? "/" + format_note(chord.bass_note) : undefined
			};
		}
	}
</script>

<template>
	<div class="line">
		<div
			v-for="({ text_packet, chord }, index) of create_text_line(text, chords)"
			:key="index"
			class="chord-letter"
		>
			<div class="chord">
				{{ chord?.note
				}}<template v-for="descriptor in chord?.descriptors" :key="descriptor"
					>{{ descriptor.text
					}}<sup v-if="descriptor?.super !== undefined">{{ descriptor?.super }}</sup></template
				>{{ chord?.bass_note }}
			</div>
			<pre>{{ text_packet === "" ? " " : text_packet }}</pre>
		</div>
	</div>
</template>

<style scoped>
	.line {
		display: flex;
		align-items: flex-end;
		flex-wrap: nowrap;

		text-wrap: nowrap;
	}

	pre {
		margin: 0;
		font-family: inherit;

		color: inherit;
	}

	.chord-letter {
		flex-direction: column;

		color: inherit;
	}

	.chord-letter:first-child {
		padding-left: 0;
	}

	.chord-letter:last-child {
		padding-right: 0;
	}

	.chord {
		color: orange;
		margin-right: 0.5ch;

		overflow: visible;
	}
</style>

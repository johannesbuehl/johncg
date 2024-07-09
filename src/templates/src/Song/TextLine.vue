<script setup lang="ts">
	import type { Chord } from "@server/PlaylistItems/SongFile/Chord";

	defineProps<{
		text: string;
		chords?: Record<number, Chord>;
	}>();

	function create_text_line(
		lang: string,
		chords?: Record<number, Chord>
	): { text_packet: string; chord?: Chord }[] {
		const return_snippets: { text_packet: string; chord?: Chord }[] = [];

		// if there are no chords, create a single text-element
		if (chords === undefined) {
			return_snippets.push({ text_packet: lang });
		} else {
			const line_chords_entries = Object.entries(chords).map(([cc, chord]): [number, Chord] => [
				parseFloat(cc),
				chord
			]);

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
				line_chords_entries.forEach(([chord_index, chord], ii) => {
					let text: string = "";

					// if the chord is between two chars, add it with an hyphen
					if (chord_index % 1 === 0.5) {
						// if it is inside a word, add a hyphen
						const regex_is_char = /[\wüöäß]/;
						if (
							[lang[Math.floor(chord_index)] ?? "", lang[Math.ceil(chord_index)] ?? ""].every(
								(char) => regex_is_char.test(char)
							)
						) {
							text += "-";
							chord_index++;
						} else {
							// elese add an extra space
							text += " ";
						}
					}

					// if it is the last chord of the line, use the rest of the text
					if (ii === line_chords_entries.length - 1) {
						text += lang.slice(Math.floor(chord_index));
					} else {
						text += lang.slice(Math.floor(chord_index), Math.ceil(line_chords_entries[ii + 1][0]));
					}

					return_snippets.push({
						text_packet: text.length === 0 ? " " : text,
						chord
					});
				});
			}
		}

		return return_snippets;
	}

	function format_chord(chord: Chord | undefined): string {
		if (chord === undefined) {
			return "";
		} else {
			let chord_string = chord.note;

			chord_string += chord.chord_descriptors;

			if (chord.bass_note !== undefined) {
				chord_string += `/${chord.bass_note}`;
			}

			const replacers = {
				"<": "♭",
				"=": "♮",
				"#": "♯"
			};

			Object.entries(replacers).forEach(
				([pattern, replacement]) => (chord_string = chord_string.replaceAll(pattern, replacement))
			);

			return chord_string;
		}
	}
</script>

<template>
	<div class="line">
		<div v-for="{ text_packet, chord } of create_text_line(text, chords)" class="chord-letter">
			<div class="chord">{{ format_chord(chord) }}</div>
			<pre>{{ text_packet }}</pre>
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
		margin-right: 0.5rem;

		overflow: visible;
	}
</style>

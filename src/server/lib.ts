import Ajv from "ajv";
import formatsPlugin from "ajv-formats";

import type { BibleProps } from "./PlaylistItems/Bible";

export const ajv = new Ajv();
formatsPlugin(ajv);

export function create_bible_citation_string(book_id: string, chapters: BibleProps["chapters"]) {
	// add the individual chapters
	const chapter_strings = Object.entries(chapters).map(([chapter, verses]): string => {
		// stop the loop-iteration, if there are no verses defined
		if (verses.length === 0) {
			return `${chapter}`;
		}

		const verse_range: { start: number; last: number } = {
			start: verses[0],
			last: verses[0]
		};

		// add the individual verses
		const verse_strings: string[] = [];

		for (let index = 1; index <= verses.length; index++) {
			const verse = verses[index];

			// if the current verse is not a direct successor of the last one, return the previous verse_range
			if (verse !== verse_range.last + 1) {
				// if in the verse-range start and last are the same, return them as a single one
				if (verse_range.start === verse_range.last) {
					verse_strings.push(verse_range.last.toString());
				} else {
					verse_strings.push(`${verse_range.start}-${verse_range.last}`);
				}

				verse_range.start = verse;
			}

			verse_range.last = verse;
		}

		return `${chapter},${verse_strings.filter(Boolean).join(".")}`;
	});

	return `${book_id} ${chapter_strings.join("; ")}`;
}

export enum CountdownMode {
	Duration = "duration",
	EndTime = "end_time",
	Stopwatch = "stopwatch",
	Clock = "clock"
}

export const countdown_title_map: Record<CountdownMode, string> = {
	clock: "Clock",
	stopwatch: "Stopwatch",
	duration: "Countdown (duration)",
	end_time: "Countdown (end time)"
};

export function get_time_string(date: Date): string {
	return [date.getHours(), date.getMinutes(), date.getSeconds()]
		.map((ele) => {
			return String(ele).padStart(2, "0");
		})
		.join(":");
}

export function msleep(n: number) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

export function sleep(n: number) {
	msleep(n * 1000);
}

const random_4_hex = () =>
	Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
export const random_id = () =>
	`${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;

export type RequireAtLeastOne<T> = {
	[K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

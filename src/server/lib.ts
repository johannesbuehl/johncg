import { BibleProps } from "./PlaylistItems/Bible";

export function recurse_object_check(obj: unknown, template: unknown): boolean {
	if (typeof obj === "object" && typeof template === "object") {
		const results: boolean[] = [];

		if (Array.isArray(obj) && Array.isArray(template)) {
			results.push(
				...obj.map((ele): boolean => {
					return recurse_object_check(ele, template[0]);
				})
			);
			// check that none of them are arrays
		} else if (Array.isArray(obj) === Array.isArray(template)) {
			const obj_keys = Object.keys(obj);

			results.push(
				...Object.entries(template).map(([key, item]): boolean => {
					if (obj_keys.includes(key)) {
						return recurse_object_check(item, (template as Record<string, unknown>)[key]);
					} else {
						return false;
					}
				})
			);
		} else {
			return false;
		}

		return results.every((res) => res);
	} else {
		// check, wether the object and the template are of the same type
		if (typeof obj !== typeof template) {
			return false;
		} else {
			return true;
		}
	}
}

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

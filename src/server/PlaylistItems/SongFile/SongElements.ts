export const verse_types = [
	"refrain",
	"chorus",
	"vers",
	"verse",
	"strophe",
	"intro",
	"coda",
	"ending",
	"bridge",
	"instrumental",
	"interlude",
	"zwischenspiel",
	"pre-chorus",
	"pre-refrain",
	"misc",
	"solo",
	"outro",
	"pre-bridge",
	"pre-coda",
	"part",
	"teil",
	"title",
	"unbekannt",
	"unknown",
	"unbenannt"
] as const;

export type SongElement = (typeof verse_types)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function is_song_element(x: any): x is SongElement {
	if (typeof x !== "string") {
		return false;
	}

	const stem = x.split(" ", 1)[0];

	return verse_types.includes(stem.toLowerCase() as SongElement);
}

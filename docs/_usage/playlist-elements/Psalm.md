---
title: Psalm
layout: page
nav_order: 2
parent: Playlist-Elements
---
# Psalm
Display the text of a psalm.

The text is mapped on the included background-image and optimized for an aspect-ratio of 16:9.
On different aspect-ratios the mapping may be off.
Adjust the values manually in the template-file or create your own.

## CasparCG layers

### template
`JohnCG/Psalm`

#### JSON-data: psalm-data
```json
{
	"command": "data",
	"data": {
		"metadata": {
			"caption": "Psalm 1",
			"id": "book-id (optional)",
			"book": "book-name (optional)",
			"indent": true
		},
		"text": [
			[
				[
					"first line of the first block of the first slide",
					"second line"
				],
				[
					"second block"
				]
			],
			[
				[
					"second slide"
				]
			]
		]
	},
	"slide": 0
}
```

#### JSON-data: slide-selection
```json
{
	"text": "Lk 1,1-2"
}
```

### media
`JohnCG/Psalm`
---
title: Playlist file (*.jcg)
layout: page
nav_order: 1
---
# Playlist file (`*.jcg`)
The playlist-file stores the individual items and settings of the playlist.

# File-Structure
A playlist-file is a JSON-file with the file-ending changed to `*.psm`.

## caption
Title of the playlist

## items
Individual items of the playlist. For an explanation of the different item-types, see [Playlist-Elements]({% link _usage/playlist-elements.md %}).

## `version`
The version of the playlist-file - it's based on semantic versioning[^1]:

The first number indicates the layout-version of the file and is incremented whenever there are changes that are not backwards compatible.  
The second number is incremented when the content gets (planned) changes.  
The third number is incremented when bugs get fixed.

# Example
```json
{
	"caption": "playlist-title",
	"items": [
		{
			"type": "song",
			"caption": "Greensleeves",
			"color": "#0000FF",
			"file": "Greensleeves.sng"
		}
	],
	"version": "1.0.0"
}
```

[^1]: [https://semver.org](https://semver.org)
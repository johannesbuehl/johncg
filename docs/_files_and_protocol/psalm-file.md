---
title: Psalm file (*.psm)
layout: page
nav_order: 3
---
# Psalm file (`*.psm`)
A psalm-file stores the content of a psalm for using it in a playlist.

# File-Structure
A psalm-file is a JSON-file with the file-ending changed to `*.psm`.

## `metadata`
The metadata block defnies all information of the psalm that aren't the text itself.

### caption
Title of the psalm

### `id` (optional)
Number of the psalm in the songbook / hymnal.

### `book` (optional)
Name of the songbook or hymnal.

Currently unused

### `indent` (optional)
Sets wether every second verse should be indented or not.

## `text`
A three-dimensional array with the text split into slides, verses, lines.

## `version`
The version of the psalm-file - it's based on semantic versioning[^1]:

The first number indicates the layout-version of the file and is incremented whenever there are changes that are not backwards compatible.  
The second number is incremented when the content gets (planned) changes.  
The third number is incremented when bugs get fixed.

# Example
```json
{
    "metadata": {
        "caption": "Psalm x",
        "id": "EG x",
        "book": "Evangelisches Gesangsbuch",
        "indent": true
    },
    "text": [
        [
            [
                "first line of the first verse on the the first slide",
                "second line of the first verse on the the first slide"
            ],
            [
                "first line of the second verse on the the first slide",
                "second line of the second verse on the the first slide"
            ]
        ],
        [
            [
                "first line of the thirds verse on the the second slide",
                "second line of the thirds verse on the the second slide"
            ]
        ]
    ],
    "version": "1.0.0"
}
```

[^1]: [https://semver.org](https://semver.org)
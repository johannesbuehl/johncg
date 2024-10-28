---
title: Bible file (*.bbl)
layout: page
nav_order: 4
---
# Bible file (`*.bbl`)
A bible-file stores the individual books of the bible and how many chapters with how many verses there are.
For every book there is a name and an ID / abbreviation stored.

JohnCG comes by default with two bible-files:
`King James Version.bbl` and `Lutherbible.bbl`.

The books are divided into groups (e. g. "Law" or "Gospels") and those groups into parts (e. g. "Old Testament" or "New Testament").  
The group- and part-names aren't predefined and can be changed - for example for localization.

# Structure
A bible-file is a JSON-file with the file-ending changed to `*.bbl`.

## `name`
Name of the bible-version

## `version`
The version of the bible-file - it's based on semantic versioning:[^1]

The first number indicates the layout-version of the file and is incremented whenever there are changes that are not backwards compatible.  
The second number is incremented when the content gets (planned) changes.  
The third number is incremented when bugs get fixed.

## `parts`
This object defines different parts of the bible like *Old Testament* or *New Testament*.
The count and name of parts can be freely chosen - only duplicates are forbidden.

### sections
Each part consists of sections.
A section groups multiple books together, for example the Gospels.

### books
A book is defined by its name, abbreviation (called `id`) and an array of the chapters.  
The chapters-array has an entry for every chapter with the amount of verses it has.

## Example
```json
{
    "name": "King James Version",
    "version": "1.0.0",
    "parts": {
        "Old Testament": [
            {
                "name": "Law",
                "books": [
                    {
                        "name": "Genesis",
                        "id": "Gen.",
                        "chapters": [
                            31,
                            25,
                            24,
                            26
                        ]
                    }
                ]
            }
        ]
    }
}
```

[^1]: [https://semver.org](https://semver.org)
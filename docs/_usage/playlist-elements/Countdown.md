---
title: Countdown
layout: page
nav_order: 8
parent: Playlist-Elements
---
# Countdown
Show a countdown, stopwatch or clock over a media.

## Properties

### Mode
#### End Time
Countdown to a specified time

#### Duration
Countdown from a specified timespan

#### Stopwatch
Display elasped time

#### Clock
Current time

### Time
Depends on the selected [mode](#mode):

#### End Time
Ending time of the countdown

#### Duration
Duration of the countdown

#### Clock / Time
Not availabel

### Show Seconds
Select wether the seconds should be shown or not.

### Position
x- and y-coordinates of the time on the screen in percent

### Fontsize
Fontsize of the countdown-text

### Fontcolor
Color of the countdown-text

## CasparCG layers

### template
`JohnCG/Countdown`

#### JSON-data
```json
{
	"position": {
		"x": 50,
		"y": 50
	},
	"font_size": 20,
	"font_color": "#ffffff",
	"time": "00:00:00",
	"show_seconds": true,
	"mode": "end_time | duration | stopwatch | countdown",
}
```

### media
selected background-media
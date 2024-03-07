# johnCG - character-generator for lyrics
Generate lyric-graphics and play them out through CasparCG.

## Requirements
- CasparCG

## Installation (WiP)
- move the file `song.html` into your CasparCG template directory

## roadmap
- implement other playlist-items than song (Missing: Video, Bible, Psalm, PowerPoint, PDF, Diashow / Multi-Image, Music)
- client: information about connection (active / reconnecting / ...)
- companion integration (buttons for song parts -> send name to casparcg)
- try to get the template and client to use the settings file (CSS has default values, send song data overwrites them)
- check client -> server slide_number out of range
- client: check response-texts, if they are still correct
- write installation instruction (including Bahnschrift-Font installation)
- client communication with osc over websocket?
- add support for NodeCG
- add CLI output to server
- create dummy-playlist-items for unsupported ones
- disable buttons, when no playlist is loaded
- implement all countdown modes
- countdown: save in server wether it is finished
- client-messages: create message-log, group same
- build-script in node / integrate with license-generator
- command-comment: define commands / names which get loaded straigth from the start and can be shown anytime
- fix "Buffer() is deprecated"
- catch songfile not found
- catch casparcg not running
- create playlist-summarys or lyrics-sheets through pandoc
- serve everything for the client, including html templates
- load files from disc always at item selection to stay up to date
- add functions to Config.ts (get_song_path, get_template_path, ...)
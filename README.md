# johnCG - character-generator for lyrics
Generate lyric-graphics and play them out through CasparCG.

## Requirements
- CasparCG

## Installation (WiP)
- move the file `song.html` into your CasparCG template directory

## roadmap
- implement other sequence-items than song
- client: information about connection (active / reconnecting / ...)
- companion integration (buttons for song parts -> send name to casparcg)
- try to get the template and client to use the settings file (CSS has default values, send song data overwrites them)
- check client -> server slide_number out of range
- client: check response-texts, if they are still correct
- write installation instruction (including Bahnschrift-Font installation)
- client communication with osc over websocket?
- add support for NodeCG
- add CLI output to server
- CasparCG: split text and image in two layers: enables text without background
- create dummy-sequence-items for unsupported ones
- disable buttons, when no sequence is loaded
- implement all countdown modes
- countdown: save in server wether it is finished
- add option to change template-directory
- make sequence-comments another design in client
- client-messages: create message-log, group same
- build-script in node / integrate with license-generator
# johnCG - character-generator for lyrics
Generate lyric-graphics and play them out through CasparCG.

## Requirements
- CasparCG

## Installation (WiP)
- move the file `song.html` into your CasparCG template directory

## roadmap
- SongFile: implement multi-language-songs
- implement other sequence-items than song
- client: information about connection (active / reconnecting / ...)
- use async / await
- companion integration (buttons for song parts -> send name to casparcg)
- try to get the template and client to use the settings file (CSS has default values, send song data overwrites them)
- check client -> server slide_number out of range
- client: check response-texts, if they are still correct
- create message log / show error messages
- write installation instruction
- client communication with osc over websocket?
- client: don't use ifames, include html directly
- client: fix title-slide font size scaling on window resize
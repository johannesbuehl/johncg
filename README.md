# johnCG - character-generator for lyrics
Generate lyric-graphics and play them out through CasparCG.

## Requirements
- CasparCG

## roadmap
- SongFile: implement multi-language-songs
- implement other sequence-items than song
- implement pinging / auto-reconnect
- client: information about connection (active / reconnecting / ...)
- use async / await
- companion integration
- add command to show / hide casparcg (play / stop and play_on_load) -> disable auto-play
- try to get the template and client to use the settings file (CSS has default values, send song data overwrites them)
- check client -> server slide_number out of range
- remove types in variable names (typescript is typed, vscode shows the types)
- implement set_display
- casparcg: only change output with click on thumbnail, not by selecting a different sequence-item
- validate received command
- implement eslint
- check response-texts, if they are still correct
- client: hightlight active song sequence-header
- colorize sequence-items
- config: specify caspercg template name
- create message log / show error messages

### server
- navigate buttons
- show / hide buttons

### client
- show / hide state feedback
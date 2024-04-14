# johnCG - character-generator for lyrics
Generate lyric-graphics and play them out through CasparCG.

## Requirements
- CasparCG

## Installation
(WiP)

## roadmap
- implement other playlist-items than song (Missing: Diashow / Multi-Image, Text, Custom AMCP-command)
- client: information about connection (active / reconnecting / ...)
- companion integration (buttons for song parts -> send name to casparcg)
- check client -> server slide_number out of range
- client: check response-texts, if they are still correct
- write installation instruction (including Bahnschrift-Font installation)
- client communication with osc over websocket?
- add support for NodeCG
- implement all countdown modes
- countdown: save in server wether it is finished
- client-messages: create message-log, group same
- fix "Buffer() is deprecated"
- catch casparcg not running
- create playlist-summarys or lyrics-sheets through pandoc
- load files from disc always at item selection to stay up to date
- create server-items at selection, delete after deselection to always stay up to date, but prevent multiple reloads (alternative: optional argument for accessing functions wether a reload should be done)
- save file through interface instead of download
- on item-update refresh render and client
- change default-item-colors
- use playlist-caption
- render PDF with same size as casparcg
- make keyboard-navigation better
  - tabindex for all elements
  - keyboard-shortcuts
- update-item: reload changed media (somehow handle video / audio - or just don't care (maybe detect wether it actually changed))
- change font-color of countdown
- create library src-folder
- move template-jump()-function into update() to prevent error messages in casparcg-log
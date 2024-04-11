# JohnCG - character-generator for song-lyrics and other church-service-elements
Generate graphics with song-lyrics or for other church-service-elements and play them out through CasparCG.

## Requirements
- CasparCG
- CasparCG-capable hardware
- SongBeamer for creation of song-files

## Getting started
1. Download CasparCG and set it up according to its [GitHub-site](https://github.com/CasparCG/server).
2. Download the latest JohnCG-version from [releases](https://github.com/johannesbuehl/johncg/releases) and unzip it.
3. Move the content of `casparcg/Templates` and `casparcg/Media` inside of CasparCGs Template and Media directories.
4. Edit `config.json` if necessary
5. Start CasparCG
6. Start JohnCG through `JohnCG_[VERSION]_linux.bat` or `JohnCG_[VERSION]_linux.sh`
7. Open [`127.0.0.1:8888`](127.0.0.1:8888) (or the port you specified in `settings.json`)
8. Optionally: create a shortcut to `chrome --app=http://127.0.0.1:8888` to open the client like a standalone app

## roadmap
- implement more playlist-items: Diashow / Multi-Image, Text, Custom AMCP-command
- companion integration (buttons for song parts -> send name to casparcg)
- client-messages: create message-log, group same
- fix "Buffer() is deprecated"
- create playlist-summarys or lyrics-sheets through pandoc
- load files from disc always at item selection to stay up to date
- create server-items at selection, delete after deselection to always stay up to date, but prevent multiple reloads (alternative: optional argument for accessing functions wether a reload should be done)
- save file through interface instead of download
- use playlist-caption
- make keyboard-navigation better
  - tabindex for all elements
  - keyboard-shortcuts
- update-item: reload changed media (somehow handle video / audio - or just don't care (maybe detect wether it actually changed))
- change font-color of countdown
- create library src-folder
- playout PDFs as base64 to make them work on all render-servers
- create documentation (including: Template-update-objects, psalm-file-definitions, config-file, companion-setup)
- modify client to avoid props-down-chaining (instead ts-file like `config.ts` or `logger.ts`)
- create example-files for songs and psalm
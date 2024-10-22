# JohnCG - character-generator for song-lyrics and other church-service-elements
Generate graphics with song-lyrics or for other church-service-elements and play them out through CasparCG.

## Requirements
- CasparCG
- CasparCG-capable hardware
- SongBeamer for creation of song-files
- Linux: `pandoc` and `LaTeX`-packages (basic, langgerman, latex, latexrecommended, latexextra, fontsextra, fontsrecommended)

## Getting started
1. Download CasparCG and set it up according to its [GitHub-site](https://github.com/CasparCG/server).
2. Download the latest JohnCG-version from [releases](https://github.com/johannesbuehl/johncg/releases) and unzip it.
3. Move the content of `casparcg/Templates` and `casparcg/Media` inside of CasparCGs Template and Media directories.
4. Edit `config.json` if necessary
5. Start CasparCG. Alternatively set the path to yourCasparCG-directory in the config and JohnCG will start CasparCG automatically.
6. Start JohnCG through `JohnCG_[VERSION]_linux.bat` or `JohnCG_[VERSION]_linux.sh`
7. Open [`127.0.0.1:8888`](127.0.0.1:8888) (or the port you specified in `settings.json`)
8. Optionally: create a shortcut to `chrome --app=http://127.0.0.1:8888` to open the client like a standalone app

## Roadmap for Release
- create documentation (including: Template-update-objects, psalm-file-definitions, config-file, companion-setup)
- test changed pandoc-installer (win and linux)
- check config-template / release-config (wether it is still valid)
- startup: json-schema bible-files

## Planned
- client: add_bible: get bible-citation-string from server through rest-api
- rest-api for remote-control
- reenable eslint vue-indent
- make keyboard-navigation better
  - tabindex for all elements
- create library src-folder
- modify client to avoid props-down-chaining (instead ts-file like `config.ts` or `logger.ts`)
- support other browser than Chrome and phone / tablet resolution
- add-song to playlist after creation
- performer-view with website and custom HTML-template and iFrame for casparcg-templates
- move backend to go
- use http-status-codes in answer to client
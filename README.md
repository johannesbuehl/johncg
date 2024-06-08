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
5. Start CasparCG
6. Start JohnCG through `JohnCG_[VERSION]_linux.bat` or `JohnCG_[VERSION]_linux.sh`
7. Open [`127.0.0.1:8888`](127.0.0.1:8888) (or the port you specified in `settings.json`)
8. Optionally: create a shortcut to `chrome --app=http://127.0.0.1:8888` to open the client like a standalone app

## roadmap
- load files from disc always at item selection to stay up to date
- create server-items at selection, delete after deselection to always stay up to date, but prevent multiple reloads (alternative: optional argument for accessing functions wether a reload should be done) / reload button in client
- make keyboard-navigation better
  - tabindex for all elements
- update-item: reload changed media (somehow handle video / audio - or just don't care (maybe detect wether it actually changed))
- create library src-folder
- create documentation (including: Template-update-objects, psalm-file-definitions, config-file, companion-setup)
- modify client to avoid props-down-chaining (instead ts-file like `config.ts` or `logger.ts`)
- move template-jump()-function into update() to prevent error messages in casparcg-log
- song-file: chords itself as chords and transpose them
- support other browser than Chrome and phone / tablet resolution
- show thumbnail of CasparCG-media
- SongEditor / PsalmEditor: Confirm to abort unsaved changes
- save_song(): check, wether "chords" is valid
- launch casparcg automatically
- reload psalm and song after file-edit
- FileDialogue: Create directories
- FileDialogue Thumbnails: make like songbeamer for easy switching
- Fix style of AddPart-Draggable-Drag-n-drop Placeholder
- SavePlaylist: create-directory-stack
---
title: Config file
layout: page
parent: JohnCG-Setup
nav_order: 1
---
# Config file

Almost all settings are set in `config.yaml`.

## `log_level` Logging-level
The logging verbosity in the terminal and log-file can be set as one of `ALL MARK TRACE DEBUG INFO WARN ERROR FATAL OFF`.

```yaml
log_level: INFO
```

## `behaviour` Behaviour
This sections controls the behaviour of JohnCG during usage.

### `activate_item_on_add` Automatically activate items after adding
Determiens wether an item should be activated (set as the currently displayed one) when it gets added to the playlist

```yaml
activate_item_on_add: true
```

### `bible_citation_style` Bible citation style
Customize the citation style used for bible-passage lower-thirds.

Input a citation for *1. Moses chapter 1, verses 2 through 4 and 6 and chapter 7*.

```yaml
bible_citation_style: 1. Moses 1,2-4.6; 7
```

## `path` Paths of the different files
Stores the paths for the different files used by JohnCG.
It supports both relative and absolute paths.

```yaml
playlists: Playlists
songs: Songs
psalms: Psalms
pdfs: PDFs
bible: Bibles/Lutherbibel.json
```

### `playlists`
Path for the playlist-files.  
Playlist-files are json-files but with a `*.jcg` file-extension.

### `songs`
Path for the song-files.  
Songs are stored in the Songbeamer-format.

### `psalms`
Path for the psalm-files.  
Psalm-files are json-files but with a `*.psm` file-extension.

### `pdfs`
Path for PDF-files.

### `bible`
Path of the bible-file.

## `casparcg_connections` Individual CasparCG-connections
Each entry is an individual CasparCG channel.
You can add multiple entries for different channels on the same CasparCG-server and also specify other CasparCG-servers on the network.  
All of them get sent the same commands.

For more information about the `casparcg.config` visit the [CasparCG wiki](https://github.com/CasparCG/help/wiki).

```yaml
casparcg_connections:
  - host: 127.0.0.1
    port: 5250
    channel: 1
    layers:
      media: 20 # optional
      template: 21
    path: casparcg
    # stageview: true
```

### `host`
Hostname or IP-address of the CasparCG-server.  
Use `127.0.0.1` or `localhost` for a server running on the same machine as JohnCG.

### `port`
Port used by CasparCG for ACMP control.  
Remember to change it in [`casparcg.config`]({% link _setup/casparcg.md %}) too.

### `channel`
The channel that should be used.

## `layers`
JohnCG uses two layers: one exclusively for media and one for templates.  
The media-layer can be omitted to only display the templates.

The media-layer is used for:
- song- psalm- and countdown-backgrounds
- media-items
- PDF-slides

The template-layer is used for:
- song-, psalm and countdown-text
- bible-citations
- text-lower-thirds
- template-items

Since the AMCP-item sends arbitrary AMCP-commands it isn't bound to the layers specified in the config.

{: .important }
Make sure the template-layer has a higher number than the media-layer since CasparCG renders higher layer-numbers above lower ones.

{: .tip }
You can modify the displayed content by sending AMCP-commands through external tools, for example [Bitfocus Companion](https://bitfocus.io/companion).  
This could be changing the brightness of the media-player to increase the contrast on the beamer-output through the BRIGHTNESS-mixer.

## `path` (optional)
Relative or absolute path to a CasparCG-instance.  
If this option is specified, JohnCG tries to start CasparCG at startup.

{: .attention }
If you specifiy multiple CasparCG-connections to the same instance, only specify the autostart-path at one instance

## Stageview (optional)
Renders a view optimized for performers.
It displays the same as a normal output with the following changes:
- no background-image for songs
- (if available) song-chords

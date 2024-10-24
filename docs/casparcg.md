---
title: CasparCG
layout: default
nav_order: 3
---

# CasparCG
JohnCG uses CasparCG, an open-ource character-generator, as its rendering engine.
It can play out media-files and programmable HTML-files called templates.


## Terminology
### channels
Multiple independant compositions can be created simultaneously and are called **channels**.

### layers
Each channel has infinite **layers** that are composed on top of each other based on their transparency.

### producers
Producers render the image and audio displayed in the individual channels.  
Producers are for example:
- ffmpeg-input
- media-items
- HTML-templates
- video-input from a Blackmagic DeckLink card
- solid colors
- another producer
- NDI

### mixer
Mixers modify the media in a layer.  
Some mixers are for example:
- position
- scale
- rotation
- opacity
- brightness
- saturation
- contrast
- blend-mode
- clip (masking)
- volume

### consumer
Consumers output the composed signal of a channel to different interfaces.  
Those are for example:
- Blackmagic DeckLink cards
- ffmpeg
- NDI
- screen: a windowed or fullscreen window in the os

## Further reading
More detailed information can be gathered by:
- [The CasparCG-wiki](https://github.com/CasparCG/help/wiki)
- [amwtech's CasparCG Documentation](https://github.com/amwtech/CasparCG_Documentation)
- [downloading CasparCG](https://github.com/CasparCG/server/releases) and trying around - it's free after all

{: .tip }
[Bitfocus Companion](https://bitfocus.io/companion) has a good but not fully complete module for controlling CasparCG. You don't need to bother with the actual AMCP-commands and just rendering stuff.
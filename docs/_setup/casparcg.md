---
title: CasparCG-Setup
layout: page
nav_order: 2
---
# CasparCG-Setup

For the easiest setup download CasparCG server from their [GitHub](https://github.com/casparcg/server/releases/) and unpack the content into `JohnCG/casparcg`.

JohnCG can autostart CasparCG (see [config]({% link _setup/johncg/config.md %}) for more details).
For this basic setup, just remove the `# ` infront of `# path`:
```diff
-      # path: casparcg_2.4.0 # optional - path to CasparCG-directory to auto-start at launch
+      path: casparcg_2.4.0 # optional - path to CasparCG-directory to auto-start at launch
```

CasparCG can be configured through `casparcg.config` - the individual components are documented at the bottom of the config-file.

A more detailed documentation can be found at [CasparCG]({% link casparcg.md %}) or at the [CasparCG wiki](https://github.com/CasparCG/help/wiki).  
The most important ones are:

## Channels
Multiple channels can be used for multiple individual outputs of JohnCG - for example with different resolutions or as a stage-view.

A simple configuration with a single output-channel in HD and 25 frames per second outputting to a borderless window.

```xml
<channels>
    <channel>
        <video-mode>1080p2500</video-mode> <!-- [vertical-resolution]p[fps * 100] -->
        <consumers>
            <screen>
                <windowed>true</windowed>
                <borderless>true</borderless>
            </screen>
        </consumers>
    </channel>
</channels>
```
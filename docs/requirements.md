---
title: Requirements
layout: default
nav_order: 2
---
# Requirements
- CasparCG-capable hardware
- CasparCG
- SongBeamer for adding chords to songs
- Linux: `pandoc` and `LaTeX`-packages (basic, langgerman, latex, latexrecommended, latexextra, fontsextra, fontsrecommended)

## Hardware capable of running CasparCG
According to the CasparCG [README.md](https://github.com/CasparCG/server/blob/20a78f65cb941aa668e20ead353206b59805984c/README.md):

### System Requirements
- A graphics card (GPU) capable of OpenGL 4.5 is required.
- An Nvidia GPU is recommended, but other GPU's will likely work fine.
- Intel and AMD CPU's have been tested and are known to work
- PCIE bandwidth is important between your GPU and CPU, as well as Decklink and CPU. Avoid chipset lanes when possible.

#### OpenGL 4.5
OpenGL 4.5 is supported by[^wikipedia-opengl]
- AMD Radeon HD 5000 series and newer
- Intel HD graphics in Intel Broadwell (5th generation) and newer
- Nvidia Geforce 400 series and newer
- Nvidia Tegra K1 and Tegra X1

#### Windows
- Only Windows 10 is supported

#### Linux
- Ubuntu 22.04 or 24.04 are recommended
- Other distributions and releases will work but have not been tested

[^wikipedia-opengl]: Information from Wikipedia: [wikipedia.org/wiki/OpenGL](https://en.wikipedia.org/wiki/OpenGL)
# Festival logo and banners

The supplied owner reference sets the jade, gold, red and river-blue direction.
The mark combines two curved boat ends, ceremonial ribbons, a sun/rower and a
Khmer wordmark. It keeps the earlier boat-only identity without adding houses
or trees. The full game title, Khmer province and year remain in UI/banner copy.

## One artwork source

- `src/race/festival-branding.mjs` owns the palette, vector paths, banner layouts
  and canvas painting. RaceGame imports the same palette for its theme colours.
- `src/race/festival-wordmark.mjs` contains Khmer outlines shaped from the repo's
  Noto Sans Khmer font with HarfBuzz. Logos need no external font or bitmap.
- `npm run build` exports `public/assets/festival/festival-logo.svg` and updates
  its content hash. Menu/header images and course signs use this artwork.
- Sponsor panels preserve Kuon Khmer and Angkor Soul, with Khmer secondary copy.
  Festival/support panels share the wave border and cream background. Start,
  finish, distance and bridge signs prioritise their Khmer text.

The wordmark authoring helper is `scripts/build-festival-wordmark.py`. Optional
fonttools/uharfbuzz tools are installed under E:/AI/_Data/Tools/branding-python
on this PC; another machine may pass its own --libraries directory. These are
authoring tools, not JavaScript/runtime dependencies. Normal builds use the
checked-in outlines and do not need Python packages.

## Size and lifetime

The SVG is 8,300 bytes. The same cached Path2D collection paints canvas artwork
once when a sign is built; nothing repaints banners in the animation loop.
Small signs use 1024 pixels, large banners 2048. Textures are shared by caption
and raster dimensions, while geometry instances retain their physical sizes.
MeshBasicMaterial disables tone mapping to preserve the chosen colours.
The existing scene disposal collects shared maps once using a Set.

Measured over the unchanged 129 course-sign placements:

| Measurement | Previous | Current |
|---|---:|---:|
| Unique sign textures | 25 | 24 |
| Estimated RGBA texture memory, including mipmaps | 77,037,568 bytes | 53,155,157 bytes |

This is an estimate of texture storage, not a GPU profiler memory reading or an
FPS improvement claim. The population, rigs, motion and gameplay are unchanged.

## Verification

`scripts/check-festival-branding.py` renders a contact sheet, compares SVG and
canvas pixels, checks caption bounds, inspects the actual in-world texture maps,
and captures menu layouts at 1024×768, 768×1024, 1180×430 and 390×844. It also
opens an AI race and confirms the existing two gameplay buttons remain present.
Screenshots are inspected directly. The source SVG and in-world artwork match;
tests do not establish physical-tablet FPS or native Khmer proofreading.

The regression gate is npm run lint, npm test, npm run build. Browser evidence
is under docs/qa/festival-branding. Existing unrelated working files are excluded
from staging and deployment.

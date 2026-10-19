# Kbach source artwork library

The existing game at https://machxanht.github.io/Tuk-Ngo/ now has a selectable
library of complete hull drawings from public posts on
https://www.tiktok.com/@karn_chinda. This is an experimental art collection,
not a claim that Cambodian drawings are the historical livery of Vietnamese
teams in the roster.

## Coverage and provenance

- 39 complete boat designs, assembled from 187 original source panels.
- Includes all 25 images in the five albums supplied by the user:
  `7669657553378282770`, `7681583457654295826`, `7691171048493944071`,
  `7689300429460507956`, `7686697282644888840`.
- 980 publicly visible posts were indexed during discovery. This is not an
  exhaustive archive of the channel. Single bow/stern photos, real race
  photographs, unrelated posts and isolated ornaments are not labeled as
  complete hull designs. Some visible post links could not be opened publicly.
- Each shipped design records its canonical post URL, caption, uploader,
  original dimensions, panel order, SHA256 hashes and baked texture hash in
  `public/assets/ghe-ngo/kbach-library/manifest.json`.
- Uploading account does not establish original authorship. One used post,
  [7672365998481083666](https://www.tiktok.com/@karn_chinda/photo/7672365998481083666),
  explicitly credits `@KPC_កីឡា`. Other channel posts point to
  `https://www.vecteezy.com/members/soklimyim`; that does not prove those
  vectors are the source of the 39 complete drawings. Reuse licences have not
  been verified for every design. No free or commercial licence is claimed.

## Preparation and runtime

`scripts/build-kbach-library.py <download-folder>` uses Pillow, NumPy and
OpenCV to identify the drawn rail and keel, rectify each image column, and
join panels in bow-to-stern order. It retains the original RGB artwork and
lettering. There is no generative redrawing, palette substitution or invented
detail. Source images range from 1280 to 5212 pixels wide. The first five
supplied albums are 3864 × 2172; an 8192 × 512 output is a UV layout size,
not a claim that every source is native 8K.

Two albums include a final isolated repeat-strip slide after the stern;
those are documented as detail slides and are excluded from the hull order.
Uncropped first-panel compositions are available for in-game comparison.
Original downloaded JPEGs remain in the local processing folder outside Git.

The menu's 61 hulls share a 2048 × 2048 atlas (1,145,512 bytes) and one hull
draw call. Sample liveries in the festival cup use rows of this atlas; the
eight researched team SVGs, kit data and protected athlete/hull/motion files
are unchanged. The sampled design is deterministic and never affects strength.
Atlas acquisition shares one decoded image/Three source, with reference-counted
ownership across rigs and ceremony; failed requests can retry.

The inspection view loads a full texture only when selected and retains at
most two per rig. A style change reuses the same kit materials. Thumbnails and
source comparison images load when the library is opened, not during menu init.
The complete collection is about 52 MB on disk; this is not an initial download.

## How to inspect

1. Open the existing root URL and select **Xem mô hình**.
2. The two-boat demo starts with different designs. **Kbach ghe 1** and
   **Kbach ghe 2** independently open the library.
3. **Cả ghe 3D → Thư viện kbach → Cận hoa văn** inspects one selected design.
4. The library filters the five supplied links, records the selected source,
   and can display its original first panel. **Màu đội Tum Núp 2** and
   **Kbach từ clip** retain the previous comparison choices.

## Verification

`node scripts/test-kbach-library.mjs` checks all 39 designs, all 187 panel
records, the five supplied links, output hashes, file presence and atlas bounds.
The ordinary regression suite checks gameplay, audio, tournament progression,
533/896/4 shirt topology and the unchanged source/motion hashes.

Visual and browser results are saved in `docs/qa/kbach-library/`. Local checks
include changing all five supplied designs, actual 8192 × 512 texture sizes,
stable GPU geometry/texture/material counts after successive swaps, mode
switching, and layouts at 768 × 1024, 1180 × 430 and 390 × 844. Public deployment
checks are recorded separately after release. No physical tablet FPS claim.

Release verification on 20 October 2026:

- `npm run lint`, `npm test` and `npm run build` passed. The production build
  emitted no Vite warnings; the protected shirt and eight master role sources
  retained their hashes.
- The first Pages release from source `b878e48` succeeded in
  [Actions run 39303594751](https://github.com/machxanht/Tuk-Ngo/actions/runs/39303594751).
  Public manifest equality and downloaded hashes of all five supplied full
  textures plus the atlas matched local assets.
- Public main menu requested only the catalog (18,877 transferred bytes) and
  fleet atlas (1,145,812 transferred bytes) from the library. No full inspection
  textures or source-comparison images were requested at menu initialization.
- Public cup team `can_tho-01` used atlas row 15, then entered the intro and
  countdown. Returning to menu and switching Vietnamese/Khmer worked.
- The public library exposed all 39 designs and the five-item filter. A source
  comparison loaded at 3864 × 2172. Selecting the bronze design applied its
  8192 × 512 texture on the actual hull; no browser errors were recorded.
- The local two-boat demo completed both 1200 m distances with independent
  materials and two selected textures. Successive source-design swaps retained
  284 GPU geometries, 46 textures and four kit materials in that inspection scene.
- The final compact-source CSS fix was checked at 1180 × 430: dialog content
  height 405 px, dialog viewport 405 px, independently scrollable provenance
  145 px and design grid 133 px. The close button remained 44 px tall.

These are viewport/browser measurements, not physical-tablet performance results.

Final release: source `6b762b8`, Pages `50da1c314c6c98a5ccba07696120ee70249eb171`,
[successful Actions run 39305553486](https://github.com/machxanht/Tuk-Ngo/actions/runs/39305553486).
The root loaded `index-B5JAjvyy.js`; the compact comparison loaded
`KbachPicker-B5pPLS1S.css`.

All 39 public full-texture hashes and the fleet atlas now match local output.
All 39 designs were selected through the public UI and verified on the painted
hull mesh, each at 8192 × 512. The inspection scene retained four kit materials
and stable GPU resource counts across successive selections; no browser errors
were recorded. The final public source-comparison check at 1180 × 430 measured
405 px content within a 405 px dialog, 133 px for the design grid, a 44 px close
button and a loaded source image 3864 px wide. Evidence is in
`public-assets.json`, `public-checks.json` and `public-source-1180x430.png`.

React review: the picker is lazy-loaded, catalog requests are deduplicated,
effects ignore completion after unmount, item keys are stable, the native modal
provides focus containment/Escape handling, and texture switching does not
rebuild the athlete kit. No unrelated component refactor was needed.

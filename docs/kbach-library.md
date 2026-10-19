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

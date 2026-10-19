# Source-derived shared kbach

The owner supplied the 872 × 398, 30 FPS graphic-design clip ending with the handle `@monghuorhout`. Its SHA256 is `9a87e7a04ec438fabb64683ddc306d4ee497e2d56f59e66de319c49d5dfa8835`. The clip is a graphic design reference, not footage certifying the historic livery of a named racing team. The recording is kept local and is not published.

The 56-second closeup supplies one complete large/small flower and hanging-leaf repeat. The 68-second closeup supplies the diagonal floral transition and a large fern curl. `scripts/build-kbach-master.py <video.mp4>` extracts these registered regions, separates bright gold from the dark incised veins and red background, and converts the contours into quadratic vector paths. The small source resolution still limits the exact original drawing; this reconstruction does not claim to recover the artist's editable original or unseen detail.

The earlier 4,096 × 256 bitmap assembled distant parts of the clip and blurred/stretched its central flowers. The old menu reduced each hull to a 512 × 64 atlas tile. The new `kbach-livery.mjs` lays out three vector motifs with physical repeat intervals and separate black, gold and colored-band layers. Both the downloadable `public/assets/ghe-ngo/kbach-master.svg` and live CanvasTexture use these same paths and layout. The SVG is scalable; its 8,192 × 512 viewBox is the UV paint layout, not the resolution of the source video.

The live hull texture is 4,096 × 512 with mipmaps and capped anisotropic filtering. The opening fleet shares one such texture across all 61 hull instances; a per-instance shader color changes only the red band, preserving the gold lines and dark ground. This replaces the atlas without allocating 61 large textures. Existing sample race liveries use the same master with the selected team's band color. The eight researched race SVGs, protected master athletes, rowing motion and shirt geometry remain unchanged.

From the stable game menu, choose **Xem mô hình → Cả ghe 3D → Cận hoa văn**. This shows the clip-derived reference palette. **Màu đội Tum Núp 2** restores that team's researched livery for comparison. Switching reuses the cached reference texture. The existing tools foldout includes the SVG download. The sample preview changes hull appearance, not team identity or race strength.

## Verification

- `npm run lint`, `npm test`, `npm run build`; source hashes and 533/896/four-boundary-loop shirt checks remain enforced.
- `scripts/check-kbach.py`: actual WebGL fleet texture, 61 color variants, close hull view, old/new texture under the identical camera and UVs, cached switching, bow/full hull views, three responsive viewport sizes, SVG without embedded bitmap, browser errors.
- `scripts/check-race-presentation.py`: menu music, intro/countdown/skip, touch-down and keyboard-down stroke input, both race languages at four viewport sizes.

Screenshots are inspected directly in addition to these checks. The before/after pair compares the original clip bitmap against the reconstructed master under the same current hull, UVs, camera and light; it is an isolated material comparison, not a claim that the whole earlier game had that exact view. Physical tablet frame rate is not measured.

## Public release

The stable [game URL](https://machxanht.github.io/Tuk-Ngo/) serves source `68494bc`, Pages commit `8cc931436d3e064559684ddd34e2c1aac2235590`. [Actions run 39294820936](https://github.com/machxanht/Tuk-Ngo/actions/runs/39294820936) succeeded. All 35 checked published files match the verified build, including the source-contour chunk, SVG download and standalone boat bundle.

The fresh public `check-kbach.py` passed: live 61-boat master texture and palette data, close and bow views, original-bitmap comparison, cached livery switching, three touch viewport layouts and the vector-only download, with zero browser errors. The public detail and bow screenshots were inspected directly. Evidence is in `docs/qa/kbach/public/`; the local race-input/music/intro regression report is in `docs/qa/kbach/race-regression/`.

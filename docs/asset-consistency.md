# Shared race asset and reference corrections

The stable game entry is https://machxanht.github.io/Tuk-Ngo/ . No new version route or version-suffixed source file was introduced.

## Reference observations

- [SBT CẦN THƠ — TỐC ĐỘ GHE NGO CHÙA BÂNG KRO CHẮP CHĂS](https://www.youtube.com/watch?v=6r_qtrhXXBk), 06:00–07:35: reviewed original video frames, including consecutive frames at 06:14–06:15 and 07:00–07:01. The middle caller faces the rowers with modest body movement, a whistle hand near the mouth and restrained free-arm cues. The seated bow caller leans and marks the rowing action with his hands. The ceremonial bow pole has a broad dark tip, a red collar and colored decorations. Its in-game length follows the owner's explicit shorter-than-person requirement; it is not claimed as a measured real pole dimension.
- [@karn_chinda, source drawing 7691171048493944071](https://www.tiktok.com/@karn_chinda/photo/7691171048493944071), slide 4: traced the stern's upper and lower silhouette from the original 3864 × 2172 panel. Scaled to the repository's 0.58 m middle depth; dimensions remain approximate. Monotone interpolation avoids a clipped plateau or an abrupt shoulder at the upturn.
- Owner's screen recording `az_recorder_20261020_034933.mp4`: inspected the crossed coach arms, shaft/gunwale contact and lower-leg hull intersection, using consecutive gameplay crops.
- Owner's red/white festival poster `1000010431.jpg`: reference for an original vector mark with a swept Ngo boat, a secondary boat stroke, water lines, Khmer temple and gold sun. The old poster's 2013 text was not copied.

## Implemented behavior

- Race and whole-boat inspection use the same `createHybridBoats` factory, canonical `boatHullGeometry`, team palette and calibrated motion bundle. The ceremony changes hull tessellation only, with the same profile and cross-section.
- Inspection opens with the current team's ID and construction type. Experimental kbach overrides are off by default. Returning to the game retains that selection, and the main back control no longer opens a different legacy game. The eight-boat cup remains available in inspection tools and at its original route.
- Rower shafts clear the gunwale at the crossing height. Knees tuck toward the keel, and kneeling placement uses actual deformed sole/shin vertices instead of an outboard floor probe. Low cross-thwarts remain below the rim.
- The whistle coach's elbows stay on their anatomical sides and below the head. The free hand gives a short low cue; the left hand holds the whistle. The bow caller also has a whistle while miming the stroke. The short dugout command pole is 1.48 m overall, with a dark flat blade, red collar and colored ribbons; the rendered tip height is about 90% of the commander's height above the hull floor.
- The rim tapers into each tip instead of ending as a square separate timber. Original source GLBs are unchanged.
- `festival-branding.mjs` contains the shared original vector paths and red/white/gold palette. The generated SVG is used by the game header/menu; the same paths draw all Khmer course banners and the Kuon Khmer / Angkor Soul ads. Banner copy retains Khmer support text.

## Verification

- `npm run lint`, `npm test`, `npm run build`: passed. Existing eight-boat and 61-team tournament tests pass; original source hashes and the shirt's 533 vertices / 896 triangles / 4 boundary loops are preserved. The standalone athlete's motion samplers still match the shared calibrated clip without resampling.
- Actual runtime geometry: 96 phases per construction, all 54 actors, run in six-phase browser calls to avoid blocking the QA tab. The steering clock was also advanced through a full cycle. See `qa/asset-consistency/surface-clearance.json`.
- Measured minimum shaft-to-outer-rim clearance at gunwale height: 0.04886 m. Zero shaft-centerline intersections with the canonical hull triangles; no detected sole/shin surface penetration at sampled phases. This is sampled geometric evidence, not a claim of motion-capture accuracy.
- Rendered spear-tip/person height ratio: 0.9018–0.9055 in the sampled poses.
- Visual/runtime public verification and viewport results are recorded in `qa/asset-consistency/verification.json` once publication is confirmed. Browser viewport checks do not measure physical-tablet performance.

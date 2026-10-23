# Gameplay input, ceremony clothing and festival artwork

## Requested outcome

Responsive rowing with a readable scoring cue, intact ceremony clothing, and a colorful illustrated festival logo, using the existing game and stable public URL.

## Changes and evidence

- Reproduced the input fault: at phase 0.52 an early BAD consumed beat 1; the correct press on beat 1 then returned null. Invalid early input no longer consumes its upcoming beat. The GO stroke is accepted at beat zero. Successful strokes remain limited to one per beat and spam penalties stay bounded.
- The main pad handles pointer-down from either finger. It scores while a finger is held and never scores again on release. Keyboard and assistive click activation remain supported. Press receipt is immediate and its animation cache is canceled/reused rather than accumulating.
- One simulation timing object drives scoring and the visible rail. The rail shows the green accepted window and gold PERFECT window. Cyclic cue colors have no delayed transition. Vietnamese/Khmer instructions refer to this same rail.
- The ceremony's old independent 32-vertex shorts decimation deformed cuffs, while coarsened anatomy could protrude through cloth. Close shots now retain native body/shorts triangles and exact animated source vertices; covered skin triangles are omitted. The native shorts retain all 1,150 triangles. Their 623 welded vertices do not move across either 24-frame salute variant. Original GLB bytes and the eight race rigs remain untouched.
- At most two nearby boats use the detailed ceremony mesh (up to 100 athletes). The other boats use a 544-triangle index LOD with the same animation texture. Total ceremonial athletes remain 3,050 across 61 boats. No per-frame mesh/material creation is used for LOD switching.
- A single vector illustration now depicts two decorated Ngo boats, paddlers, a Khmer pagoda, sun, sugar palms, river ripples and lotus flowers. The shared artwork paints both the menu logo and in-world banners. Its URL uses a content hash to avoid stale cached artwork.

## Verification

- npm run lint, npm test and npm run build pass. The exact 533/896/4 shirt, protected source hashes, eight original race rigs and 61-boat tournament are preserved.
- check-gameplay-input.py uses actual Chromium touchscreen events, including a held first finger and a non-primary second finger. Its narrow scoring-edge checks freeze only simulation time; input events still run through React. See local/input-regression.json.
- check-race-presentation.py checks the live cinematic/menu/countdown/race/pause/music flow, actual touch-down and keyboard scoring, and eight Vietnamese/Khmer layouts (1024×768, 768×1024, 1180×430, 390×844). See local/checks.json. No JavaScript/HTTP failures. Dispatch timing includes browser automation overhead and is not physical-tablet latency.
- Direct visual review: logo.png, local/menu-logo.png, local/ceremony-clothing.png, local/input-receipt.png and the landscape/portrait screenshots. The asset style remains stylized; real tablet FPS has not been measured.

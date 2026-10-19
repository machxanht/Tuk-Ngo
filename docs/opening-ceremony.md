# Opening ceremony reference and implementation

Reference: [Khai Mạc Ghe Ngo 2025 TP Cần Thơ (Sóc Trăng)](https://www.youtube.com/watch?v=hNSDABjJ6GU), Trí Lê photo, 60 seconds. The supplied video was downloaded for frame inspection; the source recording is not shipped with the game.

Observed frames:

- 00:02: the fleet gathers tightly in front of the main stand, with largely parallel hulls and small irregular offsets. The earlier formation extending hundreds of metres upstream did not match this scene.
- 00:17: seated crews raise caps above their heads; gestures and phases vary. This is a salute, rather than racing strokes.
- 00:22 and 00:42: dense spectators, continuous waterfront banners, low covered stands.
- 00:37: close coverage of a crew and controller beside the stand.
- 00:47: coverage from beneath the main stand's roof.

The revised menu places the existing 61-team fleet in nine close lanes and seven staggered ranks centered at the main stand. Positions are game coordinates; spacing and camera paths are authored from these visual observations, not surveyed or extracted as 3D from the film. The 61-team paint palette and eight cap colors are game presentation, not a claim that this clip verifies every team's historic cap or hull color.

The ceremony athlete is derived from the existing CC0 assembled athlete. Its seated legs remain fixed, and two 24-frame arm salutes are baked with two-bone IK. Each athlete receives a different phase/rate. The 610-triangle body uses a continuous painted uniform at this distance to avoid independently simplified cloth exposing the torso. A 69-triangle cap is derived from the actual baseball cap and follows the hand samples. A single vertex-animation texture drives the 3,050 bodies; cap transforms share the same sample timing. The source connected shirt, its 533 vertices / 896 triangles / four boundary loops, and all eight master race rigs remain unchanged.

The menu camera repeats six views over 33 seconds: fleet, grandstand, right-bank crowd, athletes, left-bank crowd and overhead. Views dwell before interpolated flights, with a small height lift between close views. The pre-race ten-second flyover/countdown remains a separate simulation phase.

Bank changes replace pink foliage with green crowns, increase the road population to 1,280 vehicle records (predominantly motorcycles/scooters), separate car/motorcycle/bicycle lane centers and create 6,052 roadside people. There are 5,710 walking actors across the street/shop placements. Runtime visibility budgets remain in force: these are total placements, not simultaneous full-detail draws.

Seventy new Khmer waterfront banners join the existing signs, producing 97 text placements. Short Khmer phrases, cream lettering, 15 m rail panels and 18 m overhead panels improve legibility. The overhead panels clear spectators' heads. Twenty cached text textures/materials and instanced placements avoid one texture or draw per banner.

Thirty-two water-hyacinth patches have rosette leaves, swollen stalks and small roots. Eight fallen banana stems have segmented trunks and torn leaves. They drift and bob near the banks outside the racing lanes, replacing the earlier tiny floating green spheres. Their geometry is authored; it is not taken from Google Maps or an AI reference image.

## Verification

- `npm run lint`, `npm test`, `npm run build`.
- `scripts/test-race-presentation.mjs`: dense hull separation, six continuous camera paths, finite animated vertex data, source hash, hand samples and drifting vegetation, alongside intro/pause/skip checks.
- `scripts/check-opening-ceremony.py`: real WebGL rendering through all six camera angles; changing cap transforms and floating vegetation; zero pink canopy vertices; banner/traffic/walker counts; responsive menu viewports; browser errors.
- `scripts/check-race-presentation.py`: touch-down input, music, intro/countdown and both race languages on eight viewport combinations.

Screenshots must be inspected in addition to these assertions. The isolated vegetation, banner and street closeups use a paused inspection camera with the pause dialog hidden; they are art diagnostics, not the normal menu composition. Browser checks use Edge with software rendering; no physical-tablet FPS claim is made.

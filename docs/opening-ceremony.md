# Opening ceremony reference and implementation

Reference: [Khai Mạc Ghe Ngo 2025 TP Cần Thơ (Sóc Trăng)](https://www.youtube.com/watch?v=hNSDABjJ6GU), Trí Lê photo, 60 seconds. The supplied video was downloaded for frame inspection; the source recording is not shipped with the game.

Observed frames:

- 00:02: the fleet gathers tightly in front of the main stand, with largely parallel hulls and small irregular offsets. The earlier formation extending hundreds of metres upstream did not match this scene.
- 00:17: seated crews raise caps above their heads; gestures and phases vary. This is a salute, rather than racing strokes.
- 00:22 and 00:42: dense spectators, continuous waterfront banners, low covered stands.
- 00:37: close coverage of a crew and controller beside the stand.
- 00:47: coverage from beneath the main stand's roof.

The revised menu packs the existing 61-team fleet into an irregular gathering centered at the main stand. Deterministic continuous positions and individual headings replace the lane/rank grid. A separating-axis check keeps padded hulls apart, including their small animated drift. Positions are game coordinates; spacing and camera paths are authored from these visual observations, not surveyed or extracted as 3D from the film. The 61-team paint palette and eight cap colors are game presentation, not a claim that this clip verifies every team's historic cap or hull color.

The ceremony athlete is derived from the existing CC0 assembled athlete. Its seated legs remain fixed, and two 24-frame arm salutes are baked with two-bone IK. Each athlete receives a different phase/rate. The 667-triangle body uses a continuous painted uniform at this distance to avoid independently simplified cloth exposing the torso. Hair uses a raised 64-vertex source shell plus four anatomical scalp-paint variants; this prevents the simplified head from appearing bald when it protrudes through the thin shell. A 69-triangle cap is derived from the actual baseball cap and follows the hand samples. A single vertex-animation texture drives the 3,050 bodies; cap transforms share the same sample timing. The source connected shirt, its 533 vertices / 896 triangles / four boundary loops, and all eight master race rigs remain unchanged.

The menu camera repeats six views over 33 seconds: fleet, grandstand, right-bank crowd, athletes, left-bank crowd and overhead. Views dwell before interpolated flights, with a small height lift between close views. The pre-race ten-second flyover/countdown remains a separate simulation phase.

The upper-right **Ẩn menu / Hiện menu** control hides the menu and heading to leave the ceremony across the viewport. It stays available at a minimum 44-pixel touch height, supports Vietnamese and Khmer, exposes expanded/control accessibility attributes and preserves keyboard focus. Escape restores the hidden panel. Camera and already-enabled menu music continue without rebuilding the scene.

The final 200 m contains 571 adult spectators in the shallow water along both banks, away from the racing lanes. The existing varied NPC models and GPU wave/cheer/clap animations are reused. Root placement submerges approximately 0.9 m of a normalized adult body, keeping the water near the belly rather than showing people standing on its surface. One instanced ripple draw surrounds their waterlines. This is an authored response to the user's description, not a measured water-depth reconstruction from the reference film.

Bank changes replace pink foliage with green crowns, increase the road population to 1,280 vehicle records (predominantly motorcycles/scooters), separate car/motorcycle/bicycle lane centers and create 6,052 roadside people. There are 5,710 walking actors across the street/shop placements. Runtime visibility budgets remain in force: these are total placements, not simultaneous full-detail draws.

Seventy new Khmer waterfront banners join the existing signs, producing 97 text placements. Short Khmer phrases, cream lettering, 15 m rail panels and 18 m overhead panels improve legibility. The overhead panels clear spectators' heads. Twenty cached text textures/materials and instanced placements avoid one texture or draw per banner.

Thirty-two water-hyacinth patches have rosette leaves, swollen stalks and small roots. Eight fallen banana stems have segmented trunks and torn leaves. They drift and bob near the banks outside the racing lanes, replacing the earlier tiny floating green spheres. Their geometry is authored; it is not taken from Google Maps or an AI reference image.

## Verification

- `npm run lint`, `npm test`, `npm run build`.
- `scripts/test-race-presentation.mjs`: irregular hull positions and separation over time, scalp/hair data, final-200-m shallow spectator positions, six continuous camera paths, finite animated vertex data, source hash, hand samples and drifting vegetation, alongside intro/pause/skip checks.
- `scripts/check-opening-ceremony.py`: real WebGL rendering through all six camera angles; changing cap transforms and floating vegetation; zero pink canopy vertices; banner/traffic/walker counts; hide/show/Escape in both languages; camera/music continuity while hidden; responsive full-scene viewports; shallow spectator diagnostics on both banks; browser errors.
- `scripts/check-race-presentation.py`: touch-down input, music, intro/countdown and both race languages on eight viewport combinations.

Screenshots must be inspected in addition to these assertions. The isolated vegetation, banner, street and shallow spectator closeups use a paused inspection camera with the pause dialog hidden; they are art diagnostics, not the normal menu composition. Browser checks use Edge with software rendering; no physical-tablet FPS claim is made.

## Public release

The stable [game URL](https://machxanht.github.io/Tuk-Ngo/) serves source `4710b21`, Pages commit `9fa2cd5c9149458db93e611326665625b32f147f`. [Actions run 39272172691](https://github.com/machxanht/Tuk-Ngo/actions/runs/39272172691) succeeded. All 35 checked public files match the verified build, including the content-addressed ceremony animation. The page URL remains unchanged.

Local lint, full Node tests, production build, opening visual checks and race-presentation regression passed. The fresh public opening check also passed: all six live camera angles, hair/caps, floating vegetation, both banks' signs and populations, menu hide/show/Escape in both languages, continuing camera/music, three full-scene viewport sizes and shallow spectator closeups on both banks, with no browser errors. Evidence is in `docs/qa/opening-ceremony/public/`; its selected screenshots were directly inspected.

The first public opening check stopped on a strict 44-pixel DOMRect assertion. A focused measurement showed CSS height/min-height of exactly 44 px and a DOMRect height of 43.999998 px while the existing button-press translation was transitioning. The check now allows 0.01 px for this floating-point discrepancy; the runtime was not altered to address it. The complete public check then passed.

The public race-presentation regression passed as well: actual menu music and return to music, intro/countdown/skip ordering, touch-down and keyboard-down strokes without duplicate releases, and both race UI languages at four viewport sizes. Its current report is `docs/qa/opening-ceremony/public-race/checks.json`. Physical-tablet frame rate remains unmeasured.

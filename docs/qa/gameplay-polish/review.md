# Festival density, opening wardrobe and easier rowing

## Delivered behavior

- The shared vector logo and banner mark contain only two decorated Ngo boats and their crews. The pagoda, trees, sun, river and lotus background artwork has been removed from the drawn mark.
- Easy mode is the default: hold CHÈO or Space to row continuously with automatic timing; release to rest. A press starts immediately. Releasing, canceling a pointer, losing focus, pausing, finishing and restarting clear held input. Early presses and resting do not incur timing penalties in this mode. Normal/hard retain manual timing and their previous balance.
- The original athlete bodies, 533-vertex / 896-triangle / four-boundary-loop shirt and eight race rigs remain unchanged. Both existing face libraries are distributed independently per team; crowd bodies use the current 11 civilian models with independently seeded face proportions, age, skin shade, clothing, activity and animation phase.
- Traffic increased from 1,280 to 4,840 vehicles across the map: scooters, motorcycles, delivery scooters, bicycles, sedans, pickups, vans and minibuses. Independent random gaps and lateral variation replace uniform spacing. Lane speed and minimum gaps keep traffic coherent.
- The map contains 65,645 spectator/pedestrian placements, including 11,471 roadside people, plus 2,885 trees scattered through backyards. These are whole-map populations, not simultaneous draw counts. Pedestrian scatter uses occupied cells and neighbor clearance; backyard planting avoids home footprints and inland lanes. GPU instancing and distance limits remain active.

## Opening ceremony diagnosis and fix

The ceremony had three distinct defects: its legs sampled an outdated rowing stance; separate, heavily reduced cloth/body meshes intersected; and a 70-vertex cap simplification damaged its brim. Close views now use tucked feet from the same canonical rowing pose as the race, low cross-thwarts, native shorts and a continuous crown/curved bill for each cap. The source body and shorts keep exact animated vertices.

A further diagnostic found that `Connected_Race_Shirt` in the exported GLB has 98 morph targets and no skin binding. It contains recordings of rowing, so its sleeves stay in a rowing pose when the body bones raise a hat. The ceremony baker now evaluates the unchanged V32 endpoint data for each salute: skin original endpoints, then interpolate barycentrically. Comparison to the original recording differs by at most 0.000023 m; all 533 vertices and 896 triangles remain. A regression requires sleeve movement in both salute styles, rather than only checking topology.

All 50 seating positions pass a hull containment check for below-knee vertices; the minimum measured lateral clearance is 0.0076 m. Shorts stay planted through all 48 samples. Close shots use at most two detailed boats. Distant athletes use one continuous painted 478-triangle body so separately reduced garment surfaces cannot intersect. Caps use independently authored 704/266-triangle detail levels.

## Evidence and limits

- `npm run lint`, `npm test`, `npm run build` pass. Protected source hashes, exact shirt math/topology, eight original race rigs, 61-team cup progression, audio and dashboard regressions remain intact.
- `scripts/check-gameplay-input.py` checks real Chromium touch-down/hold/release, independent team faces, early correction in manual mode, non-primary contacts, keyboard-safe release and actual ceremony rendering. Simulation time is controlled only for the manual timing edge cases. See `local/input-regression.json` and `local/ceremony-clothing.png`.
- `scripts/check-festival-density.py` inspects the real loaded instanced world, demographic/style variation and density. See `local/density-checks.json`, `local/street-density.png` and `local/backyard-canopy.png`.
- `scripts/check-race-presentation.py` passed the cinematic/menu/countdown/race/pause/music flow and eight Vietnamese/Khmer layouts. See `local/checks.json`.
- Easy-hold simulation completes all 1,200 m at 15, 60 and 144 FPS with identical outcomes. Native tablet frame rate and touch latency have not been measured. This remains the existing stylized asset family.

## Public delivery

Stable URL: https://machxanht.github.io/Tuk-Ngo/

Implementation `7e0c101` is published in Pages commit `1ad5ac5a27cb2fa07412755ffe9397d73852b43c`. All 26 changed public files match the tested build byte for byte. Public Chromium runs independently passed held-finger rowing/release, manual timing edges, independent team faces, ceremony rendering and real world density/style inspection, with no JavaScript errors. See `public-files.json`, `public/input-regression.json`, `public/density-checks.json` and the public screenshots.

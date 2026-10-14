# Architectural cleanup and three-phase race

## Preserved sources and behavior

- The connected-shirt implementation was moved byte for byte to `src/race/athlete-shirt.mjs`. It retains 533 vertices, 896 triangles and four boundary loops. Runtime topology and all eight original motion GLB hashes are checked by `scripts/check-architecture.mjs` against the portable `docs/runtime-invariants.json` manifest.
- The eight master rigs remain shared by 55 athletes per boat. The original body, hull, clips, skin UVs, calibrated hands/paddles, and source asset filenames remain unchanged.
- Both the React studio routes and the published illustrated route remain. The tablet URL, eight-team cup, selectors, save/restore, difficulty, pause, fullscreen, audio, inspection and automatic demo are retained.
- Pre-existing V21 source changes were preserved before consolidation. A local authoring baseline is stored outside the repository; automated invariant checks do not require it.

## Modules and build

- Renamed the active version-suffixed race modules to their canonical names; `docs/module-map.json` records every mapping. Crowd and traffic implementations were merged into their existing canonical modules without removing either API. `team-style` owns runtime kits; `team-livery` owns studio livery construction.
- Removed the superseded source filenames and browser bundle/adaptor names. Retained tool-only modules with real authoring callers; no unreferenced race module remained after tracing both runtime roots and tools. The old gameplay balance check and invalid three-byte GLB fixture test were replaced by canonical gates.
- `npm run build` produces `game-engine.js` and `hybrid-boats.js` in the existing public directory, then builds React. Scoped TypeScript checking to active source/config. Tailwind scans UI source instead of the asset/archive tree, fixing the baseline Rust allocation failure. React studio routes are lazy-loaded; Three core, renderer and addons have separate chunks, removing the oversized-bundle warning.

## Runtime and gameplay

- Asset transfers share a Promise per URL, use at most three concurrent attempts, and retry transient HTTP failures, inactivity and corrupt GLB/JSON. Slow progressing downloads are allowed to finish. Failed entries are evicted and completed bytes have explicit release hooks.
- Face geometry, role palettes, materials, shirt geometry and print textures are reused per renderer. Removed redundant leader geometry copies. Disposal clears render resources, cached canvases, mixers, skeletons and raw asset bytes.
- Far crews reuse alternate poses and WebGL frames beyond the configurable 44-unit hybrid distance threshold; nearest crews are scheduled at 60 Hz (30 Hz in low-power mode). Separate local-transform caches prevent a far crew from inheriting the near crew's pose. React course crews use a 140 m threshold in their world coordinates.
- Added 0–200 m start, 200–950 m cruise and 950–1,200 m final phases for player and AI. PERFECT builds cohesion/charge and reduces drain; GOOD maintains rhythm; BAD/mashing briefly desynchronizes and costs stamina. Cruise slipstream conserves stamina.
- Đạp requires final phase, at least 60% charge and 24% stamina. It consumes charge/stamina for a four-second burst with stronger effort, extra water spray, louder crowd audio and a small bounded camera zoom/shake. Reduced-motion preference disables camera shake. The top rhythm HUD stays outside the scene.

## Verification

`npm test`, `npm run lint`, and `npm run build` are the portable gates. Browser evidence is under `docs/qa/runtime/`: shirt/hand/foot checks, viewports and cup progression, transform-cache identity, GPU frame reuse and resource disposal. Local browser checks use Edge headless; physical-tablet performance is not measured. The very short 1180 × 430 viewport keeps the full map visible but small because the camera preserves its aspect ratio.

The renderer gate measured exact far-pose restoration, eight master rigs, 90 pose evaluations and 30 reused GPU frames for 120 boat renders, with zero geometries/textures retained after disposal. Headless animation measured about 32 FPS, while an idle requestAnimationFrame probe on the same host measured about 33 FPS; the 60 Hz setting is a target, not a measured physical-tablet guarantee. Direct render microtimings fluctuate and do not establish a speedup.

Public inspection found the fullscreen exit button overlapping cadence and stamina labels. Reserved a gutter beside those rows and the ready card, kept native tap highlights from floating over the scene, and added explicit overlap and master-clip/rhythm synchronization checks. The public gate covers five viewports, three real cup rounds and exact reload restoration; the protected-assets report checks all eleven published source asset hashes, including the eight original role clips.

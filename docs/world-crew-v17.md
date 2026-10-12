# V17 requested scene and crew improvements

## Delivered scope and evidence

The user requested dense festival spectators, moving road traffic, better riverbank town frontage, larger legible Khmer banners, distinct athlete faces, one standing controller cue per rowing cycle and separate stern steering motion. Existing race direction (VIP stand on right), accepted hull, kbach, gameplay and unobstructed default UI are retained. Public deployment is recorded after verification, not inferred from unit checks. Final game close views accepted the measured eye alignment.

## Map and spectators

Six tightly staggered pedestrian rows replace the former single sparse row outside the festival reach. IDs include bank/column/row and feed the established independent style/motion hashes. Grandstand aisles remain accessible. The two banks are split into separate 80 m LOD sections; detail now uses X/Z camera distance, preserving close human geometry without rendering the far bank as near geometry. Ambient movement continues while boats pause.

318 Overture footprints remain in the observed reach. Another 308 original narrow street houses extend the race approach; doors/shutters, window framing, upper balconies, shade canopies, foundation strips and paved forecourts replace the former sparse fronts. All elevations and facade designs are authored, not a claim of exact 2025 buildings. Generic photographic CC0 PolyHaven plaster and metal/tile diffuse/normal maps are licensed and credited in public/assets/maps/materials/ATTRIBUTION.md. No press pixels are shipped as game art. The raw open footprint dataset and attribution remain accessible.

The land top previously sat at 1.39 m, above the 1.24 m road, hiding portions of the road behind the VIP stand. Land is now 1.23 m and foundations meet building floors; roads render above it. Forecourt quads were corrected to face upward.

192 two-way ambient vehicles include 139 scooters, 35 cars and 18 minivans. Riders have rounded anatomy and helmets. Six shared instanced traffic batches follow the same road bend, retain right-hand lanes and rolling spokes, and use distant endpoints with out-of-road culling. This is ambient traffic, without a collision simulator. Nearby real rendered samples and paused-boat before/after captures verify movement.

Main fascia banners grow to 1.82 m height and lower banners to 2.05 m, use shorter nonrepeated text, Khmer font shaping, contrasting colours and anisotropic sampling. The new Biểu ngữ view shows readable lettering; Đường phố exposes street/traffic for inspection. Default UI still has only the single controls toggle and camera choices auto-close the panel.

## Crew changes and verification

55 athletes per boat use 16 baked head variants (jaw, cheek, nose, chin, brow, ears and asymmetry) with face-only tint/stubble; cap-contact scalp and neck boundaries stay fixed. The first diagnostic renderer wrongly flipped glTF UVs, making unrelated atlas pixels look like facial injuries; its V conversion was corrected. Actual game-eye inspection exposed a separate occlusion issue, resolved by measured orbital alignment: the 110 eyes moved down 7.5–9.0 mm with no forward shift, so pupils and iris render before the eyelid surface. Both phase-ray checks and actual game portraits at phase 0.55 verify the correction. Counts alone do not establish portrait realism.

The standing coordinator now has 49-key downbeat/recovery shoulder motion per rowing loop. Three helmsmen hold near-vertical aft-directed steering shafts, with small individual corrections; two-bone IK keeps both palms on grips and feet fixed. Rower/caller animation remains unchanged. Real references establish gross roles and brace, not measured mocap trajectories. Existing 4.2 m steering shafts give deep immersion; retained dimensions are authored.

The support check covers 49 phases in both clips: 2,457,840 lower-leg vertices, zero hull intrusion, support error under 0.01 mm, optimized grip error under 2.92 mm, and seated caller feet inside the hull. Eight baked team GLBs were reopened to verify 55 actors, two clips, kits/kbach, caps, feet and grips; actual download hash checks use V17 files.

Full uncapped glTF validation catches errors after unused legacy objects. The V15 baseline already has 660 nested skin warnings in its template and 715 in exported teams; V17 has the same counts, all NODE_SKINNED_MESH_NON_ROOT, with zero errors. Older maxIssues=100 reports did not establish zero warnings. No issues are ignored in the V17 check. The accepted hierarchy is retained and tested through Three.js; generic viewer compatibility is not claimed from these checks.

Final TypeScript/production build, affected world geometry/traffic checks, actual production Edge at 1024×768 / 768×1024 / 800×600, team selection/download hash, sprint water and game start/input/pause pass. Physical tablet hardware remains untested.


The people-inspection cameras now follow actual head facing after the course reversal, so seated/standing/controller/helm views show faces from the outboard front rather than retaining the old+X camera behind them.


Final production world check reports 32,549 spectator placements, 16 face types in each 55-person crew, 192 vehicles and 318 mapped / 308 authored frontage buildings. Public acceptance is recorded below after release. Final ocular alignment and front-facing inspection cameras are in the shipped source.


The linked whole-boat art preview and GLB download now both point to V17; previously they loaded V15 and downloaded V12. The solo VĐV study remains explicitly labelled initial research; the current crew and roles can be inspected from the studio.

## Public release acceptance — 2026-10-12

Source commits `0783c53` and `81bd566` are published through Pages commit `c44f2f145febca167ce7cdbfe39a2eb9cd6f7f5e`. The [Pages deployment](https://github.com/machxanht/Tuk-Ngo/actions/runs/38279739977) completed successfully. The public HTML serves `index-Bv0m-O1G.js`; the stable [studio link](https://machxanht.github.io/Tuk-Ngo/?demo=studio) remains unchanged.

The public scene confirms 32,549 crowd placements, six staggered rows, 192 vehicles, 318 mapped and 308 authored street-front buildings, 16 face variants per 55-person crew, no VN flags, visible traffic movement while boats pause, and moving controller/helmsman views. The linked art preview defaults to V17 and its downloaded template SHA-256 matches the source. All eight public team files have the expected byte size; actual Tum Núp 2 and Trà Tim downloads match their expected hashes. Team selection, water movement and starting the public gameplay pass without browser errors.

The public camera test collected 19 samples across 180 seconds, crossed one automatic course loop and retained a finite camera/target/boat position with the follow target 4 m from its boat reference. Boats remain paused while crowd time advances. This reproduces the previous long-run failure interval and did not reproduce the camera flying into the sky during this run; it does not prove unlimited stability.

Evidence: [public scene checks](qa/world-v17/public-world-check.json), [public download/gameplay checks](qa/world-v17/public-check.json), [art preview checks](qa/world-v17/public-art-check.json), [180-second camera checks](qa/world-v17/public-longrun-check.json), [scene after 180 seconds](qa/world-v17/public-after-180s.png), and [public art preview](qa/world-v17/public-art-v17.png). Physical tablet hardware remains untested. Authored facades, heights and steering timing remain approximations based on references, rather than a scanned replica or motion capture.

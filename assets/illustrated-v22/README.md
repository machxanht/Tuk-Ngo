# Illustrated boat and rowing study V22

Stable preview: https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/

Current direction: [game-direction.md](game-direction.md). The main project URL now opens this canonical 2.5D version; explicit older `demo` URLs remain reference routes. Visual and placement decisions are shared in `scene-config.js`.

## Current hybrid revision V25

The boats and athletes now render as actual 3D geometry on the retained painted festival. The four independent rower pictures are no longer loaded or used by the running demo. The anatomical CC0 model has a regenerated smooth vest, continuous sewn bindings, shorts, fitted forward/backward caps and six geometric head variations. Eight shared rigs drive 55 athletes per boat: seated/standing rowers on both sides, caller, controller and stern steering on both sides. Hands are constrained to the grips while authoring, feet are planted, and the recovered blade is lifted clear of water. The 97-sample clips interpolate continuously at runtime. The controller has a separate raised footboard and blue kit; the caller faces the crew; long stern oars sweep aft slowly.

`src/race/hybrid-boats-v25.mjs` is the shared WebGL renderer; `scripts/build-hybrid-athlete-v25.py` rebuilds the geometry and motion from the preserved Blender source, with `hybrid-motion-v25.py` as the calibrated motion helper. `scripts/pack-hybrid-v25.mjs` packages one shared geometry asset, separate role clips and the browser bundle. `hybrid-v25-manifest.json` lists 5,330,236 model bytes. The source hull geometry is retained; its runtime paint maps the approved image through measured image bands and original hull UV depth. Source image pixels remain unchanged. See [HYBRID-ATTRIBUTION.md](HYBRID-ATTRIBUTION.md).

The `VĐV cận` control shows a moving seated/standing/caller/controller/helm study; the pose slider can inspect any point in the continuous cycle. The same renderer drives both racing boats and the rhythm practice. Body parts, paddles and gunwales have real depth; no drawn hull mask is used to hide misplaced legs.

## Coherent revision V23

The slimmer bow is delivered as `hull-slim-bow-v23.png` and lossless WebP. It was edited with built-in ImageGen from the previous hull, using an existing real boat-on-land video frame only as a structural reference. The original hull remains for comparison. The near gunwale and floor profile were rechecked against the new image before placing the crew.

`bridge-c247-perspective-v23.png` changes the previous bridge's view to cross the river diagonally. The second bridge belongs to the other course end and is not placed next to it. `boat-refinement-v23.json` and `bridge-refinement-v23.json` preserve tool, inputs and prompts.

V23 reference lane scales are 0.86 and 0.90 rather than 0.70 and 0.96. The V24 autonomous race uses 0.62 and 0.66 to fit complete hulls and both gates into the course view. Building heights follow their floor counts. Near stalls and patrons occupy the promenade, using an authored road-edge profile; pedestrian movement follows its sidewalk edge. The crowd thins locally around stalls and the bridge entrance so its density does not require placing people through those objects.

The current authored scene has 1,949 spectators, 64 walking people, 16 moving vehicles and 10 stalls. There are two stands and one visible upstream bridge. The two bridge types remain in the source atlas. These are placement counts, not observed historical quantities.

`Đua tự động` now runs two boats from a shared start gate to a finish gate. A three-second countdown precedes 42.0/43.3-second races; the near boat leads initially and the far boat wins during the sprint. Bow coordinates determine gate crossings. Each boat has its own continuous rowing cycle, accelerating tempo and water effects. The camera follows gently and returns to the full composition at the finish; `Góc nhìn: Toàn cảnh` keeps the whole scene visible. Pause, replay, fullscreen and workshop remain available. The river segment is compressed to inspect the current artwork, not a surveyed 1,200-m course. Both boats reuse the same hull, uniform and crew images. `Tập chèo` remains a basic one-boat rhythm exercise; a player-controlled full race and tournament are not implemented.

This Canvas 2D preview follows the approved soft painted concept. It is the current 2.5D direction, with the default view assembling a festival scene with two boats. Existing 3D files and explicit reference routes remain available. Open `index.html` through an HTTP server, or use the stable Pages link.

## Contents

- `approved-concept.png`: approved visual direction, not a real race photograph.
- `hull-tum-nup-study.png`: transparent empty hull, painted interior and curved tips.
- `rower-seated-4poses.png`: seated catch, pull, exit and recovery; backward white cap.
- `rower-standing-4poses.png`: four standing poses; compact footing and forward white cap.
- `caller-controller-helm-2poses.png`: two poses each for bow caller, middle controller and stern helmsman.
- `water-effects.png`: six painted splash, foam and wake effects.
- `image-metadata.json`: dimensions, transparency and hashes of the delivered source images.
- `preview.js`: anchor coordinates, role layout, foreground hull and paddle masks, rowing loop and water motion.

Each boat contains 55 people: 8 seated pairs, 17 standing pairs, one bow caller, one middle controller and three helmsmen. All feet remain behind the near hull layer. The foreground paddle layer samples the original painted image; it extends the lower shaft from its grip so the blade reaches the water. Source PNG pixels remain unchanged.

## Assembled festival scene

Eight new source PNGs were generated with the built-in ImageGen tool using `approved-concept.png` as the style reference:

- `festival-landscape.png`: sunny sky, silty river and two painted embankments.
- `mekong-buildings-6.png`: six different regional shophouses, cafés and timber frontages.
- `mekong-plants-6.png`: coconut, shade tree, areca, banana, flamboyant and flowering shrub.
- `spectators-12-2poses.png`: 12 identities, two poses each; varied adults, older people and children, including four rear views.
- `pedestrians-4-4poses.png`: four additional identities with four walking poses each.
- `street-vehicles-6.png`: scooter, underbone motorbike, bicycle, hatchback, delivery van and cargo tricycle, with riders/drivers.
- `festival-food-stalls-4.png`: drinks, noodles, grilled snacks and fruit/coconuts.
- `stands-bridges-4.png`: main double-pitch stand, lower single-pitch stand, teal portal bridge and silver truss bridge. These are interpretations of the forms documented by the existing Maspero scene, not measured replicas.

`festival-atlas.json` records observed sprite bounds and feet anchors. `festival-prompts.json` preserves the full prompt set. Source PNGs are copied without pixel changes. Atlas sprites are sampled, scaled, clipped and layered at runtime by `festival-scene.js`. The distant road is a simple painted-colour Canvas strip over the landscape; most environmental detail comes from the generated bitmap art.

Runtime images use lossless WebP encoding. `scripts/pack-illustrated-v22.py` compares every decoded channel, including hidden RGB under zero alpha, against the original PNG. `runtime-images.json` preserves sizes and hashes, including the retained old hull that is no longer loaded by the current renderer. The gallery downloads remain PNG. Images are downloaded on first load; this is not a measured tablet load-time guarantee.

The original festival assembly placed 2,120 spectators and 13 food stalls; revision V23 adjusts these counts as described above to leave usable space at stalls and the bridge. Some placements are cropped by the camera. Spectators use individual animation offsets and speeds; nearby watchers face the river. Vendors are layered behind counters, with patrons at the three near stalls. Traffic moves in road strips. The scene has a moving ripple layer and two boat layers with different timing. The second boat reuses the same hull, uniform and crew art.

Banner text is rendered with the bundled `NotoSansKhmer.ttf`, rather than generated image lettering. There are no national flags. The main stand banner reads `ពិធីបុណ្យអកអំបុក · ប្រណាំងទូកង`; other panels use `សូមស្វាគមន៍`, `ប្រណាំងទូកង` and `អបអរសាទរ`. Food panels use `អាហារ` and `ភេសជ្ជៈ`. Wording has not received a native-language editorial review.

The existing scene's main double-pitched stand, lower opposite platform and two different bridge forms informed the drawing brief. Festival crowd density is consistent with the [VTV report of 4 November 2025](https://vtv.vn/day-song-dong-maspero-suc-nong-tu-ngay-hoi-dua-ghe-ngo-100251104151528239.htm). This does not establish exact street locations, finished bridge details or individual buildings. The approved generated concept is a style reference, not real-world evidence.

## Generation brief

Images were created with the built-in ImageGen tool, using the approved illustration as the style reference. The common brief was soft painted game artwork with clear silhouettes, warm daylight, consistent green sleeveless jerseys with pale trim, navy shorts, white baseball caps, bare feet, wooden paddles and true transparent backgrounds. Hull art requested black, lime and gold kbach-like decoration with red rounded, rising tips. Seated poses keep the legs inside the boat. Standing poses were revised to bring the feet close under the hips. Role poses distinguish a seated caller, standing rhythm controller and a helmsman with a longer steering oar. Water effects use the same painted style.

These are original generated illustrations, not evidence of real race equipment or exact 2025 team decoration. The boat is a visual study; team-specific kbach and lettering remain unverified.

## Current limits

The athletes use continuous skinned 3D animation; their six head variants are geometric variations of one anatomical source, not six independently authored identities. Crowd cheering still uses two painted poses and pedestrians four drawn steps; vehicle riders are painted into their moving sprites. There is no complete player-controlled racing game, verified full team collection, physical cloth simulation or sound. The environment remains an illustrated composition rather than a navigable surveyed map. The upstream bridge extends beyond the right edge; the other bridge is outside this window.

The page supports play/pause, automatic race replay, follow/overview camera, close-up boat view, full festival view, fullscreen and inspection of each rowing pose. Practice and workshop allow cadence from 55 to 105; automatic races control each boat's tempo. Splash sprites become larger at sprint cadence. Controls sit below the art; pose buttons and the asset gallery are collapsed by default. Desktop browser checks and tablet-sized viewport checks do not establish performance on a physical tablet.

## Verification

`scripts/check-illustrated-race-v24.py --realtime` checks 464 course samples per viewport, bow gate crossings, monotonic travel, camera containment, leader changes, pause/resume, workshop suspension, replay and fullscreen. One race runs to completion on the actual browser clock. The local run finished in 46.96 wall-clock seconds at 30.0 headless desktop fps, with no page errors or failed requests. Tablet-sized checks cover 1024×768 and 768×1024; a physical tablet has not been tested.

`scripts/check-illustrated-festival-v22.py` exercises the real page at 1440×1100, 1024×768 and 768×1024. It checks demo/practice/workshop, four rowing phases, sprint cadence, pause/resume, fullscreen entry and exit, gallery images, Khmer font loading, common camera/direction, stall/crowd feet before the road edge and absence of horizontal overflow. It checks practice tap counting and ignores taps when paused. Pixel comparisons confirm movement in both crowd regions, the road and river. Time samples include 120, 180 and 3600 seconds. Current local checks passed with no page errors or failed requests; desktop headless rendering was approximately 29.8–30 fps. This is not a physical tablet measurement or a device performance guarantee.

Canvas pixel dimensions adapt to the viewport, with a 1600-pixel width budget, while all world coordinates use the same 2400×1500 art space. A cadence remainder prevents roughly 31 ms browser callbacks from halving a 30 fps target. Crowd poses and ripple strips are cached; paused scenes do not repaint continuously. The PNG gallery and archived four-pose rower WebPs are optional reference assets, not the live 3D actor source.

`scripts/publish-illustrated-v22.ps1` publishes the current asset folder and canonical root entry using the existing Pages tree. It retains legacy bundles and avoids publishing unrelated working-tree changes. Use `-PrepareOnly` to inspect the staged files before publishing. Do not treat the root redirect as a completed racing game; the current mode limits above still apply.

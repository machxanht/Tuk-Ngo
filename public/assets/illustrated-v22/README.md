# Illustrated boat and rowing study V22

Stable preview: https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/

This standalone Canvas 2D preview follows the approved soft painted concept. The default view now assembles a festival scene with two boats. It does not import or replace the existing 3D game. Open `index.html` through an HTTP server, or use the stable Pages link.

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

Runtime images use lossless WebP encoding. `scripts/pack-illustrated-v22.py` compares every decoded channel, including hidden RGB under zero alpha, against the original PNG; all 13 files retain identical pixels. Runtime image transfers total 18,041,648 bytes instead of 25,069,946 bytes of PNGs, excluding the optional concept gallery image. The gallery downloads remain PNG. `runtime-images.json` preserves sizes and runtime hashes. Images are still downloaded on first load; this is not a measured tablet load-time guarantee.

The authored scene places 2,120 spectators, 64 walking people, 16 moving vehicles and 13 food stalls. Some placements are cropped by the camera. Spectators use individual animation offsets and speeds; nearby watchers face the river. Vendors are layered behind counters, with patrons at the three near stalls. Traffic moves in road strips, separate from the packed rail-side crowd. The scene has a moving ripple layer and two boat layers with different scale and timing. The second boat reuses the same hull, uniform and crew art.

Banner text is rendered with the bundled `NotoSansKhmer.ttf`, rather than generated image lettering. There are no national flags. The main stand banner reads `ពិធីបុណ្យអកអំបុក · ប្រណាំងទូកង`; other panels use `សូមស្វាគមន៍`, `ប្រណាំងទូកង` and `អបអរសាទរ`. Food panels use `អាហារ` and `ភេសជ្ជៈ`. Wording has not received a native-language editorial review.

The existing scene's main double-pitched stand, lower opposite platform and two different bridge forms informed the drawing brief. Festival crowd density is consistent with the [VTV report of 4 November 2025](https://vtv.vn/day-song-dong-maspero-suc-nong-tu-ngay-hoi-dua-ghe-ngo-100251104151528239.htm). This does not establish exact street locations, finished bridge details or individual buildings. The approved generated concept is a style reference, not real-world evidence.

## Generation brief

Images were created with the built-in ImageGen tool, using the approved illustration as the style reference. The common brief was soft painted game artwork with clear silhouettes, warm daylight, consistent green sleeveless jerseys with pale trim, navy shorts, white baseball caps, bare feet, wooden paddles and true transparent backgrounds. Hull art requested black, lime and gold kbach-like decoration with red rounded, rising tips. Seated poses keep the legs inside the boat. Standing poses were revised to bring the feet close under the hips. Role poses distinguish a seated caller, standing rhythm controller and a helmsman with a longer steering oar. Water effects use the same painted style.

These are original generated illustrations, not evidence of real race equipment or exact 2025 team decoration. The boat is a visual study; team-specific kbach and lettering remain unverified.

## Current limits

Four drawn rowing poses and two cheering poses form visible frame animations, not finished smooth rigs. Faces are currently repeated within each rower type. The pedestrians have four drawn steps; vehicle riders are painted into their moving vehicle sprites. This preview has no racing gameplay, complete verified team variants, collision simulation or sound. Existing 3D work remains separate. Most of the scene is a fixed camera composition, not a navigable surveyed map; the second bridge and some edge structures are partially cropped.

The page supports play/pause, cadence from 55 to 105, close-up boat view, full festival view, fullscreen and inspection of each rowing pose. Splash sprites become larger at sprint cadence. Controls sit below the art; pose buttons and the asset gallery are collapsed by default. Desktop browser checks and tablet-sized viewport checks do not establish performance on a physical tablet.

## Verification

`scripts/check-illustrated-festival-v22.py` exercises the real page at 1440×1100, 1024×768 and 768×1024. It checks both views, all four rowing phases, sprint cadence, pause/resume, fullscreen entry and exit, gallery downloads, Khmer font loading and absence of horizontal overflow. Pixel comparisons confirm movement in both crowd regions, the road and river. Time samples include 120, 180 and 3600 seconds. Local checks passed with no page errors or failed requests. The desktop headless browser rendered about 22 frames per second during this check; that is not a physical tablet measurement or a guarantee of 30 fps.

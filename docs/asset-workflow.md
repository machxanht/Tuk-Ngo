# Blender asset workflow

## Current delivered milestone

The default page now opens a complete, orbitable 3D boat with 55 athletes on
animated water, using the new Blender cap/hair/paddles and connected shirt.
It shares the race's eight original role masters instead of loading the old
full-crew GLB. Sixteen athletes sit in eight front pairs; 34 stand behind them;
the bow caller, middle controller and three helmsmen retain separate motions.
The connected green shirt is the same prototype garment shown on the single
athlete; this does not redefine the historical team kits in the preserved cup.

- Canonical tablet entry: `https://machxanht.github.io/Tuk-Ngo/`.
- The previously shared `assets/illustrated-v22/` link forwards to this entry.
- Full-boat viewer: `src/race/boat-preview.mjs`; one direct WebGL render per frame.
- Single-athlete inspector: the **Một VĐV** button on the same page.
- Editable source: `art/athlete/athlete-master.blend`, with packed textures.
- Download: `public/assets/athlete-master/athlete-master.glb`.
- Runtime equipment: `public/assets/athlete-master/athlete-details.glb`.
- Race integration: `src/race/hybrid-boats.mjs`.
- Collar appearance: `src/race/athlete-finish.mjs`.

The old 2D/sprite/model preview modes and their runtime illustration module are
removed. The main route does not load the illustrated banks/crowd/vehicle
atlases or technical dossier. Historical asset files are retained as sources;
they do not load when opening the boat. The existing cup is explicitly reached
through **Giải 8 ghe**, at `assets/illustrated-v22/race.html?mode=cup`; its festival
background remains illustrated. Rebuilding the full Maspéro environment is not
part of this boat/motion correction.

The details contain a sewn-panel baseball cap with curved brim/rear strap,
scalp-fitted short hair, and a rounded wooden paddle. Cap direction is forward
in nine of the twelve appearance variants and backward in three. Runtime hair
length/wave and facial geometry vary within the existing twelve cached
identities. The new details merge into the existing body cache and paddle batch.
They do not introduce a new mesh draw for each athlete accessory.

The source MakeHuman body and the eight original motion files are retained.
This is an authored character, not a scan or likeness of a named athlete. Motion
remains authored animation, not motion capture. The shirt geometry and endpoint
skinning module remain byte-identical to the protected manifest. The new finish
only adds a distance attribute and replaces the collar's colour mask.

## Real references and provenance

- [Thanh Niên: Tum Núp wins men's and women's races, 15 November 2024](https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm):
  white baseball caps, team clothing and photographed crew proportions. Existing
  local references are recorded in `asset-studio/athlete-real-references/sources.json`
  outside this repository. These photographs are reference, not game textures.
- [Báo Sóc Trăng: Tum Núp race video](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/):
  existing local frame sequences for seated/standing rowing and crew roles.
- [User-supplied tournament](https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s)
  and [Mr Chấn Hưng](https://www.youtube.com/@mrchanhung72) remain course and
  boat-decoration references for subsequent environment work. This delivery
  does not claim a new complete analysis of their full video catalog.
- The body/skin/rig retain the existing MakeHuman CC0 provenance in
  `public/assets/human/ATTRIBUTION.md`. Equipment geometry is authored for this
  project; the hair shell is fitted from that existing anatomical surface.
- The Khmer shirt print is the existing owner-requested `កូនខ្មែរ`, rasterized
  with the existing Noto Sans Khmer font. It is not asserted to reproduce a
  historical sponsor print. No generated photograph is used as evidence.

## Reproducible authoring

Run `scripts/author-athlete.py` in Blender to author equipment and recreate the
editable source around the preserved anatomical reference. Rasterize the
existing shirt print into `public/assets/athlete-master/kit-print.png` (the
delivered PNG is included), then run `scripts/assemble-athlete.py` in Blender.
Both scripts resolve the repository from their own location under normal
Blender CLI execution; the current local MCP execution also has a workspace
fallback. Neither script overwrites an approved body, hull, motion or shirt file.

The local authoring was executed through the reviewed community
[MCP for Blender](https://github.com/ahujasid/mcp-for-blender), checkout
`7a0373ec9199183cb460068c4f96aed9c579fb4f`, in `E:/AI/Um Tuk/tools/blender-mcp`.
The installed bridge was queried with `get_scene_info` and used with
`execute_blender_code` through a standard MCP client. The local add-on listens
on localhost; telemetry is disabled and external asset/generation integrations
are disabled. The existing Codex configuration gained only the `blender` server
entry pointing to that local executable. No paid generation service or login
was used. The current session can call it through the local MCP client; the
registered tools are available to a newly loaded Codex MCP session.

The standalone GLB samples the exact shirt endpoint calculation into 49 morph
targets over one stroke; runtime still uses the original exact shader. Body,
cloth and paddle channels are combined into one GLB animation, so standard
viewers cannot play only the body. This sampled export is a viewing artifact;
it is not a replacement for the eight protected runtime rigs. Its texture has
coherent UV islands and padding to prevent collar/letter mip bleeding.

## Acceptance checks

- `npm run lint`, `npm test`, `npm run build`.
- `npx --no-install gltf-transform validate public/assets/athlete-master/athlete-details.glb`.
- `npx --no-install gltf-transform validate public/assets/athlete-master/athlete-master.glb`.
- `python scripts/check-athlete-browser.py`: real Edge renderer, roles and
  phase samples, paddle lengths, measured sole clearance, inspection angles,
  tablet viewport layouts, and the exported GLB in the existing 3D viewer.
  Serve the existing game assets on port 4256 and the production Vite preview
  on port 4173; use `--url`/`--studio` to select other servers. `--record`
  captures the actual 10-second 3D viewer output.
- `python scripts/check-runtime.py --url http://127.0.0.1:4256/assets/illustrated-v22/ --out docs/qa/athlete-master/runtime`:
  existing shared-pose/cache/disposal regression gate.

Visual evidence is stored under `docs/qa/athlete-master`. Physical tablet frame
rate is not established by headless Edge or viewport emulation. A visual quality
percentage is not measured. This proof must be assessed before extending the
style to all river assets. Remaining environment work is the shared short
Maspéro reach, stands/bridge/streets, crowd/traffic variety and measured device
budgets; these are not claimed complete by the athlete milestone.

## Measured local result

The browser sampled twelve stroke phases for all eight role masters. The sole
clearance stayed at approximately 2 mm; palm-to-grip marker distance stayed
below 1 mm. These are sampled geometric checks, not a claim of scanned anatomy.
Paddles measured 1.52 m seated, 1.75 m standing and 4.20 m steering. The exported
GLB's wrist travelled 0.151 m in the animation check and its cloth morph weights
changed, confirming both tracks actually animate in the standard viewer.

Both new GLBs pass glTF validation without errors, warnings, infos or hints.
The inspection hull is cropped and batched at load time to about 21,919
triangles/19 draws including the athlete, rather than submitting the full
30 m hull behind clip planes. The game renderer retained eight masters, exact
far-pose restoration, 90 pose evaluations/30 frame reuses over 120 boat renders,
and zero retained GPU geometries/textures after disposal. Edge headless measured
31.6 FPS on this host; it does not establish physical tablet performance or a
speedup over the previous host-limited measurement.

## Previous athlete milestone public verification

Source commit `5c015960df8faf4679e71dbf582ea8827178d98b` was pushed to `main`.
Pages commit `c0ecfaa84f7f9a672900741cc1b9465f77f70be7` deployed successfully
in GitHub Actions run `38961184883`. The existing tablet entry remains
`https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/`.

The same athlete browser gate was run against that public game and its existing
`?demo=art` inspection mode. Roles, grip/sole samples, desktop/tablet layouts and
actual body/cloth animation passed without browser errors. Fourteen downloaded
runtime assets matched the local SHA256 bytes, including both new GLBs and all
eleven protected public source files. Evidence is under
`docs/qa/athlete-master/public`. The source-only protected shirt module remains
covered by the local invariant gate.

## Motion regression and load correction

Blender's old scene export reduced 97 original motion samples to 26 and changed
the clip duration from 1.0104166 to 1.0416666 seconds. A same-phase browser
comparison found a hand discrepancy of approximately 0.176 m. Assembly now
copies all 161 source samplers (times, values and interpolation) exactly into
the exported GLB and evaluates the connected-shirt endpoints from the source
glTF joint matrices. Cloth is sampled at all original keys, including time zero.
Unused exported animation buffers are removed, with sparse morph accessor
references retained and remapped.

Run `blender --background --python scripts/assemble-athlete.py` to regenerate
the proof. Unchanged garment UVs and the atlas are reused; the saved Blender
source uses 96 FPS so the original subframe keys remain editable. The eight
source motion files and protected shirt module/data are never rewritten.

Regression evidence is in `docs/qa/athlete-master/boat`, `cup`,
`cloth-agreement.json` and `load-comparison.json`. `test-athlete.mjs` checks every
original animation accessor byte and validates the actual exported GLB. The
browser compares 96 phases with the original role master and checks grip/sole
placement, mode remounting, direct water/splashes, and unobscured desktop/tablet
layouts. An independent 96-phase endpoint comparison measured maximum cloth
surface drift of 1.50 mm. This is sampled animation verification, not a claim of
motion capture or measurements on a physical tablet.

## Complete boat public verification

Runtime source commit `94ae852` is published by Pages commit
`efffebf14d70f56d5cf4e15aecefe2b5d867afa8`. GitHub Actions run
`38966187816` completed successfully. The direct public browser gate passed for
all 96 motion comparison samples, all eight role master geometry checks,
three tablet viewport layouts, mode remounting and water/splash updates, with
no browser errors. Fourteen public runtime files match the local bytes.
The previous tablet URL forwards to the canonical 3D entry; **Giải 8 ghe**
opens the preserved cup directly. Evidence: `docs/qa/athlete-master/public-boat`.

The final material correction limits the shirt-print zone to zone 9; it no
longer discards the authored hair in zone 10 when the connected kit is active.
Public initial transfer measured approximately 8.0 MB with Pages compression.
The same-server local comparison is approximately 31.2 MB before and 10.4 MB
after, a 66.7% byte reduction. These figures do not establish physical tablet FPS.


## Outboard rowing and bright festival banks

The canonical root now uses `rowing-motion.glb`, an offline derived bundle of
all eight role clips. `scripts/build-rowing-motion.mjs` preserves the eight
source GLBs and the original skeletons. The port/starboard source bindings are
corrected before baking outboard blade trajectories. Rear rowers use a low
half-kneeling stance and fitted knee pads; the caller is at x=12.35 m with the
same pelvis height as the first seated rower. Three stern helmsmen sweep long
blades aft and lift them above the water during recovery.

The saved Blender scene and exported standalone athlete use the same calibrated
clip. Blender pose bones are converted through the original inverse binds;
the final GLB retains the exact derived samplers rather than resampling the
scene export. Rebuild the motion before running `assemble-athlete.py`. Original
shirt topology (533 vertices / 896 triangles / four boundary loops), eight
master source clips, body and hull hashes remain protected and unchanged.

The boat scene has two 3D banks across a 61 m channel, two covered stands,
2,214 people (1,107 on each bank), 11 CC0 Quaternius character models, twelve
clothing tints, seven activities, ten Khmer signs, 42 instanced house frontages
and moving road vehicles. The scene is an authored asset inspection reach,
not a surveyed recreation or a completed 3D race course. The preserved cup
remains accessible through its own button.

`build-crowd-preview.mjs` packages the existing two lower civilian LODs and
unchanged bone palettes into a 3.92 MB compressed stream (7.97 MB decoded),
instead of fetching the full-resolution meshes. Modern browsers decompress
it with DecompressionStream; a raw canonical binary is the compatibility
fallback. The compact data and source models retain their CC0 attribution.
The near and middle crowd budgets are 24 and 280. Pose updates run in the GPU;
random activity phase, speed, model, colour and age avoid a uniform crowd.

`check-athlete-browser.py` verifies 96 animation phases, both outboard margins,
all eight master soles and hand grips, 34 half-kneeling people, fitted knee
supports, caller seat alignment, stern reach/lift, three tablet layouts,
actual rendered crowd pixel changes, Khmer font loading, splashes and remounts.
Local evidence is in `docs/qa/athlete-master/boat/check.json`. Maximum sampled
standalone palm gap was 3.06 mm, within the shared 5 mm interpolation tolerance;
standalone and shared bone positions agreed to floating-point precision.
The first local transfer with the added 3D banks was 14.94 MB; the host reported
about 32 FPS. These are desktop browser measurements, not physical tablet FPS.


The public gate passed against source `04609e9`, Pages commit
`9ddf3986567540507a6366abecbf01fa27cee052` and successful Actions run
`38977671958`. Evidence in `docs/qa/athlete-master/public-boat` includes actual
public desktop/tablet renders, 96-phase motion comparisons, animated crowd pixel
changes, all 17 public asset hashes and both existing entry routes. Public
initial transfer was 11.88 MB in that run. The cup exposes all eight choices;
the local touch gate completed its three rounds. A separate 120-second local
run kept identical camera/target values and stable geometry/texture counts after
warm-up, with no browser errors (`boat/stability.json`). The main shader, asset
bytes and application code were unchanged by this subsequent documentation gate.


## Low cross-thwarts, separated crew and civilian outfits

The current boat has 54 people: 50 rowers, one bow caller, a coordinator facing
stern and two helmsmen. Seated rowers share eight transverse thwarts below the
local gunwale; the caller has a ninth thwart at the first row's height. Thwart
ends and foot supports are fitted against the actual interior mesh. Pair centres
are 48 cm apart, with a 90% lateral body scale. Seated feet tuck toward the keel;
the low stance uses a 1.22 m paddle. The standalone GLB and saved Blender source
use the same seated leg motion and shortened paddle. The original 1.52 m equipment
asset remains the unmodified stock mesh used to derive each paddle length.

Steering uses two staggered-foot actors at x=-11 and -12 m. Their calibrated clips
include torso weight transfer, a submerged aft/outboard sweep and raised recovery,
with a small phase offset between the two. These are authored poses, not captured
motion. Original body/hull, eight source clips and protected shirt data remain
byte-for-byte unchanged.

The compact civilian derivative classifies connected clothing parts into upper
garments, trousers/skirts, footwear, hats and small trim. Shirts retain twelve
bright tints; eight independent lower-garment colours and four shoe colours replace
the former single full-body tint. Integer-safe palette lookup avoids noisy colour
switches at fragment interpolation boundaries. Original NPC meshes and motion
palettes are preserved. The **Khán giả** view inspects these garments directly.


Public verification for this revision passed on source `789cc79`, Pages commit
`dba44b67f1887c48321e84d09446f6868b4685ac`, Actions run `39021620087`.
The actual public renderer passed the crew-layout assertions, 96-phase GLB
agreement, mode remounts, animated crowd and three tablet viewport checks with
no browser errors. Seventeen public asset files match the local bytes. Local
cup QA completed all three rounds and the renderer disposal check released all
tracked GPU geometry and textures. Physical tablet performance remains untested.
Evidence: `docs/qa/athlete-master/public-boat/check.json`, `asset-hashes.json`,
`deployment.json`, plus the local `boat/floor-slices.json` and steering contact
sheet. The 40-sample sliced/full hull-ray comparison measured zero drift.

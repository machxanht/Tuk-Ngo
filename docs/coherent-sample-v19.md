# New 3D quality sample V19

Requested outcome: rebuild a visibly better, brighter and more coherent asset sample from licensed source characters and real race references before multiplying it into the full map. Observable deliverable: one seated athlete in the accepted ghe, three complete clothed civilians, a 50 m riverside street, moving water/cars/NPCs and unobstructed tablet controls. Visual likeness is judged from the running sample; there is no meaningful automated “80% likeness” score.

The existing tablet URL `?demo=studio` opens this sample. Its collapsed panel provides six close/overview cameras, stroke phase/pause, a matching athlete GLB download, the retained full race scene and gameplay. `?demo=studio&scene=race` retains the original course; `?demo=play` retains gameplay. Default sample UI is one 48 px button. Camera selection closes the panel; Escape restores focus.

## Implemented sample

- One detailed generic MakeHuman athlete with full source face/fingers, edited eye openings, curved irises, a fitted forward baseball cap, new welded jersey and continuous tailored shorts. Actual exported skin uses the original CC0 texture with one explicit glTF albedo tint. Back print is `កូនខ្មែរ` and is projected onto the new garment rather than intersecting its old surface.
- Authored seated paddle rhythm with fixed pelvis/feet, solved palm grips and neutral head direction. One portable clip contains the body, paddle and 49 garment contact poses. Contact is restricted by body region and correction distance; it does not pull waist cloth toward nearby raised thighs. The seated study omits the original midship standing platform that intersected its thighs. Accepted hull/kbach shape stays intact.
- Three softened Quaternius CC0 civilian models, each with complete source clothing, idle and wave. Source motions blend independently with time offsets. Two men share a head family; these are stylized civilians rather than scans or three entirely independent faces.
- Seven narrow house lots, sidewalk, road, two cars moving in opposite lanes, broadleaf trees and a coconut palm. The street uses regional building vocabulary rather than arbitrary building scatter. Windows, cars and tree crowns remain simplified. This is not a measured Maspero reconstruction.
- Clear daylight HDR environment, warm sun, restrained fill and one shared daylight/material setup. Moving river shader and paddle splash system remain active. Pausing the hero leaves ambient NPC/car/water motion running. Reduced-motion preference initially pauses the hero.

## Sources and editable delivery

See `public/assets/coherent-v19/ATTRIBUTION.md`, `docs/npc-source-v19.md`, `docs/hero-motion-v19.md` and `docs/coherent-bank-v19.md`. No AI-generated reference image, restricted Renderpeople delivery, Adobe account or paid model was used. Real 2024 photos/video inform the sample kit and stroke; the actor is not claimed to be a specific 2025 athlete.

Editable hero: `assets/blender/athlete-v19.blend`, with packed textures. Original untouched diffuse is retained at `assets/source/makehuman/young_lightskinned_male_diffuse3.png`; its CC0 provenance remains in the human attribution. Original anatomical GLB and original study Blender scene remain in the project.

Rebuild the hero with installed Blender:

```powershell
blender --background --python-exit-code 1 --python scripts/rebuild-hero-v19.py -- --output ./v19-output
```

The generator calls the garment and motion helpers, exports GLB, persists the standard baseColorFactor and saves a packed editable scene. NPC conversion uses `scripts/prepare-npc-v19.py INPUT_GLTF OUTPUT_GLB --polish`; the actual source mirror paths are documented separately. `scripts/extract-sample-hull-v19.mjs` extracts the accepted static hull from V18. The published file manifest records exact bytes/hashes and does not score art quality.

## Verification and remaining scope

`npm run lint`, production build, the persisted athlete rig validator and `scripts/check-coherent-sample-v19.py` form the scoped checks. The browser script captures six cameras, four stroke phases, three tablet-sized viewports, matching GLB download and a three-minute continuous sample; it also starts/strokes/pauses the retained game and checks the full race route. Test reports are in `docs/qa/coherent-v19/` and selected inspected images in `public/assets/coherent-v19/previews/`.

The detailed hero GLB currently validates with zero errors and twelve inherited `NODE_SKINNED_MESH_NON_ROOT` warnings. Each civilian has zero errors/four warnings. The template remains a detailed study rather than a ready full-crew mobile LOD. Viewport emulation is not a physical-tablet performance benchmark.

Direct final image inspection shows continuous shorts, readable Khmer back print, visible pupils and brighter lighting in the sampled poses. Shoulder openings still reveal small fit irregularities on close inspection; hand surface contact and facial acting are not finished production animation. House/vegetation/vehicle detail is deliberately simpler than the hero. This is a concrete quality comparison candidate, not a claim that the entire requested map has been rebuilt or that likeness has reached a measured 80%.

The full eight crews, full crowd diversity, dense stands/bridge/complete Maspero map and applying the new character pipeline across all game roles remain outside this first sample. Keep the approved hull/team data and functional gameplay while judging this sample; do not multiply these assets or replace the full race until the new appearance is accepted.

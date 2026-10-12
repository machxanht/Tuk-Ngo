# V19 civilian NPC candidates

Prepared 2026-10-13; candidates only, outside runtime/public assets. These are complete authored Quaternius civilians, not recolored bare bodies. They are visibly faceted low-poly and therefore do **not** establish a quality match with the detailed MakeHuman athlete. Parent selection remains required.

## Source and license

- [Official Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html): 11 characters, 24 animations, CC0; source models `Casual_2` and `Casual_Hoodie`.
- [Official Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularwomen.html): 10 characters, 24 animations, CC0; source model `Casual`.
- The official Drive download returned quota errors. Actual files were obtained from the openly attributed [CC0 glTF mirror](https://github.com/agentkaerf/FreeModels), paths `Ultimate Modular Men- Feb 2022/Individual Characters/glTF/` and `Ultimate Modular Women - April 2022/Individual Characters/glTF/`. Mirror conversion provenance is distinct from direct official delivery.
- [CC0](https://creativecommons.org/publicdomain/zero/1.0/) permits embedding and redistribution, including public GLB delivery. No account, purchase, message, or separate license agreement was made.
- [Renderpeople terms](https://renderpeople.com/general-terms-and-conditions/) allow realtime games in §4.1b, but §4.3b prohibits easily downloaded/extracted individual model files. No Renderpeople assets were acquired or republished. Simply removing a download button does not establish compliant static public GLB delivery.
- [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) Standard was downloaded from official itch delivery for examination. The free ZIP contains only Superhero male/female bodies; Regular and Teen are Pro contents. None were misrepresented or used as civilian/hero candidates.

## Deliverables and observed appearance

All GLBs and render evidence: `E:/AI/Um Tuk/asset-studio/coherent-v19/npc-candidates/`.

| File | Bytes | Triangles | Visually observed |
|---|---:|---:|---|
| casual-man.glb | 836140 | 5776 | Gray short sleeve shirt, long blue trousers, red shoes, brown short hair |
| hoodie-man.glb | 868268 | 6206 | Purple hoodie with pocket/cuffs, blue shorts, purple shoes, brown short hair |
| casual-woman.glb | 894824 | 6424 | White short sleeve shirt, orange long trousers, dark shoes, blond bob |

Each has one skin and source `Idle`, `Idle_Neutral`, `Wave`, 186 channels per action. No source clap was present. Two men share the same underlying head family: clothing silhouettes differ, but this is not evidence of three independent facial identities. Woman anatomy and hair differ. Faces are neutral stylized faces, not photographic likenesses.

Reproducible conversion: bundled Blender with `--background --python-exit-code 1 --python scripts/prepare-npc-v19.py -- INPUT_GLTF OUTPUT_GLB`. Script preserves the three suitable source actions and excludes combat/death actions. Original full source glTF retained in `E:/AI/Um Tuk/tools/asset-cache/coherent-v19/modular-mirror/`.

Rigs use `Root`, `Body`, `Hips`, `Abdomen`, `Torso`, `Chest`, `Neck`, `Head`, `Shoulder.L/R`, `UpperArm.L/R`, `LowerArm.L/R`, `Wrist.L/R`, plus finger and leg bones. Full bone lists are the per-file `.json` reports.

## Verification and limits

Directly inspected all three `.glb.png` Blender renders at Idle_Neutral frame 12. Clothes are complete mesh geometry, bodies proportionate but strongly faceted, with angular eyes and simple materials. These renders support candid style comparison, not a claim of substantial improvement over the existing detailed athlete. Exported GLBs revalidated: zero errors, four warnings each; full reports are `.validation.json`. Runtime motion smoothness and wave performance have not been visually inspected over time; the animations are preserved source motions, not invented wave/clap loops.

No runtime, gameplay, public assets, final hero, or accepted crew files changed. Three candidate GLBs are delivered; semi-real quality, three unique face identities, and a matching free RegularMale hero remain unresolved.

## Separate softened comparison

Parent requested a separate comparison with smoother anatomy/clothing. Add `--polish` to the converter; raw candidates remain untouched. Final `*-polished.glb` applies a 0.01 mm coincidence weld, one Catmull-Clark subdivision before the armature, smooth normals, warm brown skin and muted casual-man shoes. Boundary edges and edges between different material slots are creased to preserve the source eyes, nose, seams, and clothes boundaries. Vertex group weights interpolate through subdivision; the source rig and three actions remain.

The first subdivision diagnostic on unwelded glTF was rejected: source flat-normal vertex splitting made disconnected triangles shrink into tiles. Welding was the evidence-based correction; current renders show continuous surfaces.

| Final comparison | Bytes | Triangles |
|---|---:|---:|
| casual-man-polished.glb | 1326556 | 34656 |
| hoodie-man-polished.glb | 1379596 | 37236 |
| casual-woman-polished.glb | 1428856 | 38544 |

Directly inspected all three final `.close.png` and `.wave.png` renders. Arms, elbows, wrists, sleeve openings, trousers/shorts and feet remain visually continuous in the inspected source wave midpose; no tile gaps remain. All three final GLBs validate with zero errors/four warnings, preserve `Idle`, `Idle_Neutral`, `Wave`, and one skin. Motion over the full animation still needs runtime visual QA; inspecting one pose does not establish every frame. The polished faces remain simple stylized bead/peg eyes without detailed mouths; these are softened game characters, not semi-real scanned people. Two male faces remain related. Parent should choose or reject them by the actual close renders before integration.

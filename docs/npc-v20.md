# V20 civilian crowd

Eleven complete Quaternius civilians in the accepted softened style: seven men and four women. Each GLB has actual clothing and hair geometry, one skin and source `Idle`, `Idle_Neutral`, `Wave`, `Walk` animation clips. Source families share some facial topology; eleven source models do not mean eleven independently scanned face identities.

## Files and integration

- `public/assets/coherent-v20/npcs/manifest.json`: model IDs, source models, official source URLs, exact mirror delivery URLs, CC0 identifier, bytes, SHA-256 hashes, triangles and animations.
- `public/assets/coherent-v20/npcs/*.glb`: eleven stable finished exports, total 15,771,748 bytes / 404,784 triangles.
- `src/race/coherent-npcs-v20.mjs`: `await createCoherentNpcs(scene, loader, base)` returns `roots`, `update(absoluteSeconds)`, idempotent `dispose()` and `stats`.
- `scripts/prepare-npc-v20.py`: reproducible Blender conversion, retaining Walk in addition to accepted V19 clips. Run bundled Blender `--background --python-exit-code 1 --python scripts/prepare-npc-v20.py -- INPUT_GLTF OUTPUT_GLB --polish`.

The first three models preserve NPC camera anchors X −1.7, 0.1, 1.9 / Z 0.3. Others occupy X −17..18 / Z 1.05..2.65. Two office characters follow bounded short walking routes, with gait easing into idle at direction changes. Remaining characters wave intermittently with different deterministic time phases. No random respawning, river/road routes or application integration is included. Root owns main runtime import and authored gesture overlays.

The set includes T-shirt/trousers, hoodie/shorts, woman T-shirt/orange trousers, tank/shorts, overalls and sun hat, business suit, hard hat/reflective vest, punk vest/mohawk, green dress, woman's business suit, and woman's hard hat/reflective vest. Geometry softened by welding coincident source face vertices before one subdivision, retaining seam/material feature creases, then smooth normals; source skin weights and rig remain.

## Source and license

[Official Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) and [Official Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularwomen.html) explicitly mark the packs CC0 and support personal/commercial use. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) permits modification and public asset redistribution. Exact acquired files come from the openly attributed [agentkaerf glTF mirror](https://github.com/agentkaerf/FreeModels); this is recorded separately from official author/pack license provenance. No account, purchases or licensing bypasses were used. No Renderpeople assets included.

All 24 original clip names: `Death`, `Gun_Shoot`, `HitRecieve`, `HitRecieve_2`, `Idle`, `Idle_Gun`, `Idle_Gun_Pointing`, `Idle_Gun_Shoot`, `Idle_Neutral`, `Idle_Sword`, `Interact`, `Kick_Left`, `Kick_Right`, `Punch_Left`, `Punch_Right`, `Roll`, `Run`, `Run_Back`, `Run_Left`, `Run_Right`, `Run_Shoot`, `Sword_Slash`, `Walk`, `Wave`. No original cheer, clap, dance, talking, yes or jump exists. `Interact` is not evidence for any specific crowd gesture and is excluded. Do not relabel combat motions as cheering. Additional authored gestures remain parent-owned work and must be identified as authored.

## Verification

Actual Blender evidence outside repository: `E:/AI/Um Tuk/asset-studio/coherent-v19/npc-candidates/v20-contact.png`, and per-model `v20-NAME.glb.png`, `.close.png`, `.wave.png`. Contact sheet directly inspected: different clothing/hair silhouettes are visible, proportions remain consistent with accepted V19 NPC style. These are stylized models, not photographic people. Idle/wave renders exist for every export; they are pose evidence rather than full animation playback QA.

All eleven GLBs validate with zero errors. Ten have four inherited nested-skinned-mesh warnings; suit-man has five warnings. Full validation/module report: external `v20-validation.json`. Actual Three GLTFLoader loaded all eleven, module updated 481 samples spanning 0..120 seconds: all root trajectories stayed X −20..20 and Z 0.3..2.7; first three anchors stayed fixed; disposing twice left zero NPC roots. Main browser promenade rendering and full motion quality still require root integration QA. No changes to main runtime, athlete, bank, App or existing V19 assets.

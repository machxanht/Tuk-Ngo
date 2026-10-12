# V13 garment-only preview and diagnosis

This is a review preview, not a replacement of accepted game assets. The script reads `assets/blender/crew-v12.blend` and the canonical `assets/blender/athlete-rower-study.blend`. Every generated Blend, GLB, image and report stays in `E:/AI/Um Tuk/asset-studio/crew-v13-garment/`. It never overwrites either source or a public asset.

## Evidence and cause

The current crew builder removes canonical cloth contact shape keys, applies a collapse ratio of 0.18 to garment and binding meshes, then joins them with the actor's anatomy. The sampled standing actor has 822 shirt vertices versus 4,250 in the canonical study. Its four intentional shell boundaries remain intact: hem, neckline and two armholes. This is primarily a silhouette/seam-quality problem, not a missing-shirt polygon problem.

The accepted LOD hem has 59 boundary samples versus 112 in the study; neckline 43 versus 64, and armholes 30/31 versus 36/36. Its binding material contains 49 open boundary edges in 12 tiny loops. The canonical curve-to-mesh tubes already have unwelded/uncapped endpoints; collapse decimation makes these separate tube endings especially coarse. Existing `before-phase-01/17/33.png` are actual Blender renders of the source, not generated reference pictures.

Short sleeves are a separate runtime issue: `src/race/team-style-2025.mjs` creates an open 16-segment cylinder attached to each upper arm. This script does not edit that root-owned code and does not claim to integrate those cylinders into the shirt.

## Scoped preview

Only shirt and ribbed-binding primitives are removed from each joined crew mesh. Anatomy, shorts, print patches, eye geometry and other non-shirt faces retain their vertex positions, deform weights, UVs, polygon order and materials. The script copies the canonical shirt basis, reduces nearly planar detail with limited dissolve, and rebuilds four periodically closed binding tubes directly on the resulting shell boundaries. Binding vertices inherit the same local skin weights as their corresponding shirt boundary, rather than independently sampling anatomy.

The resulting shell has 1,416 used vertices and four closed boundary loops with 55 hem, 36 neckline and 23/24 armhole samples. Limited dissolve also removes collinear boundary samples; this is not a claim that all canonical boundary vertices survive. Each of the four binding surfaces has **zero** open boundary edges. Binding tubes use **six radial sides**, reduced from the first preview's eight; ring centre positions, radii and inherited weights are unchanged. This removes 25% of binding triangles without changing the shirt shell. Visual change is restrained; this remains an authored low-detail tank top, rather than a new clothing system or cloth simulation.

Caller and controller cloth is handled explicitly. Their `Caller_Olive` and `Controller_Light_Blue` primitives are removed alongside the rower fabric, then restored with separate cached garment data and the original material pointers. Olive RGBA remains `(0.12, 0.19, 0.07, 1)` and light blue `(0.12, 0.55, 0.78, 1)`. Green templates do not overlap the original role shirts.

## Preservation and pipeline gates

`repair-report.json` records exact equality of non-shirt anatomy positions, skin weights and UVs. Sampled world bone matrices and paddle transforms at frames 1, 9, 17, 25, 33, 41 and 49 have the same SHA-256 before and after: `0efa2d714763f706e8c2ef502c25f784c7798816329e4aa9247d3d1567d06dcf`. There remain 55 original armatures; the script does not modify their rest data, actions or pose curves.

Reconstructing the combined mesh re-encodes Blender's packed corner normals. Maximum measured normal-vector difference on non-shirt faces is `0.0006215273440812988` (approximately 0.036 degrees). This is recorded rather than described as bit-identical normals. The preview gate permits less than 0.001 while requiring exact anatomy position/weight/UV preservation.

`merge-path-report.json` confirms that the GLB is **crew-only**: no accepted hull was imported or rebuilt. Actor metadata remains 50 ROWER, 1 BOW_CALLER, 1 MID_CONTROLLER and 3 HELMSMAN. All **3,401** original scene paths from `asset-studio/crew-v12/crew-dedup.glb` survive, including every one of its **2,968** animation-target node paths. The added 275 paths are five garment objects per actor. The exported preview has a single Blender scene clip named `Scene`; the integration pipeline must retain/relabel the accepted base/sprint clips, not mistake this preview for a complete boat template.

The first merged preview exceeded the unchanged 900,000-triangle full-template budget (923,702 triangles). Root requested six-sided rather than eight-sided binding tubes; the regenerated external preview must pass root's fresh merged triangle gate, as well as feet, grips and runtime material checks, before integration. The first integration measured 117,024 binding triangles, so the expected 25% binding reduction is 29,256 triangles; that arithmetic is an expectation rather than a fresh merged validation result. Those final game checks are outside this preview's acceptance claim.

## Actual visual checks

- Blender standing rower: `after-phase-01/17/33.png` (first preview), with caller material correction leaving rower geometry unchanged.
- Blender seated rower: `after-seated-phase-01/17/33.png`.
- Blender bow caller: `after-caller-phase-01/17/33.png`; olive role colour and the existing back print remain visible.
- Edge hardware WebGL: `browser-preview-normal-00/32/66.png`, `browser-preview-sprint-00/32/66.png`, and `browser-preview-sprint-side.png`.

The listed images were captured from the initial eight-sided binding preview. At root's request, the six-sided budget correction regenerates the Blend/GLB and preservation report without repeating the full three-phase render set; final six-sided merged visual review belongs to root.

The browser preview applies the accepted V12 `Rowing_Sprint_Real_2024_Roles_80SPM` clip to the preserved node paths for visual checking; this clip is not embedded into or rewritten by the garment export. There were no page exceptions or missing animation-binding warnings. The external module test page logged the benign multiple-Three-instance warning and an initial favicon 404, recorded in `browser-report.json`; the favicon link was subsequently added. These desktop renders do not establish physical-tablet performance or prove the final merged boat's support contacts.

## Reproduce

Use Blender 5.2.2 on the installed local runtime:

```powershell
& '../tools/blender/blender-5.2.2-windows-x64/blender.exe' --background --python-exit-code 1 --python scripts/repair-crew-garments-v13.py -- --diagnose-only --render
& '../tools/blender/blender-5.2.2-windows-x64/blender.exe' --background --python-exit-code 1 --python scripts/repair-crew-garments-v13.py -- --render --actor-kind caller
& '../tools/blender/blender-5.2.2-windows-x64/blender.exe' --background --python-exit-code 1 --python scripts/repair-crew-garments-v13.py -- --render-existing --actor-kind seated
```

The preserved external outputs are `crew-garment-preview.blend` and `crew-garment-preview.glb`. Root owns the production integration decision. No commit or publishing is performed by this script.


## Read-only diagnosis of the white neck/chest patches

Root's subsequent merged V13 gate passed at **893,342 triangles**, with zero validator warnings/errors and the reported all-49-phase feet/grips checks. The remaining visual concern was the broad white patch visible inside Trà Tim's neckline in `asset-studio/clothing-v13/VĐV_đứng-80-0.32.png`.

A causal probe in the actual optimized studio scene at phase 0.32 identified the **runtime short sleeves**, rather than the reconstructed binding, existing uniform print, or anatomy:

1. Hiding only meshes using `chroi-tum-chas_Short_Sleeve`, including the visible `RaceAccessories_Team_Sleeve_<id>_l` batches (two sleeve instances each), removed the broad patches while retaining the thin white collar and hem. Evidence: `asset-studio/clothing-v13/diagnose-white-no-sleeves.png`.
2. Repainting only those short-sleeve materials magenta made the broad neck/chest patches magenta. The collar and hem stayed white. Evidence: `asset-studio/clothing-v13/diagnose-white-magenta-sleeves.png`.
3. The standing actor's four posed `Continuous_Binding_0/1/2/3` meshes, material `chroi-tum-chas_Collar_Armhole`, had maximum triangle areas of `0.00010825`, `0.00010228`, `0.00007068` and `0.00010217` square metres. Maximum triangle edge lengths were 0.07787, 0.06398, 0.04428 and 0.06395 metres. They remain thin binding strips; none forms the broad white filled patch. Metrics and sleeve mesh names are recorded in the external `clothing-v13/diagnose-white-report.json`.

The causal source mesh is `Team_Sleeve_<id>_l/r`, rendered through its `RaceAccessories_` batch. The rounded lathe profile then extended from **−0.07 to +0.18 metres** around the upper-arm origin, with maximum radius **0.073 metres**. Its proximal cap therefore reached seven centimetres toward the clavicle/chest. When the arm rose, that broad white cap was exposed inside the tank top's neckline. The 2.8–3.2 mm continuous binding was not responsible.

These probes changed only temporary visibility/colour in a disposable browser session. No Blend, GLB, garment script, accepted body, or runtime source was mutated by this diagnosis.

**Final root-owned runtime profile:** the sleeve is an open lathe wall with axial extent **+0.025 through +0.18 metres**, maximum radius **0.062 metres**, an open upper join, and **no filled proximal cap or negative extent**. Root reviewed the current three-phase images. The sampled far-arm region is explained below; this is not a claim of complete costume fit.


## Final open-wall sleeve: physical versus projected position

At normal phase **0.32**, the remaining white region on standing `Athlete_18_ROWER` is the **far upper-arm sleeve projected near the neck**, rather than a demonstrated sleeve/torso intersection:

- `Team_Sleeve_18_l` is on the far side: its world centre is about 0.184 m behind the neck's lateral position. The sleeve centre is **0.2020 m from the neck bone in 3D**, yet projects only **30.68 pixels right and 9.36 pixels below** the neck bone in the 1280 × 900 view.
- Four ray hits on the white sleeve wall lie **14.4–19.4 mm from the posed bare-arm surface**, **71.2–98.1 mm from posed torso surfaces**, and **145.6–166.3 mm from the neck bone**. These points follow the anatomical upper arm, rather than occupying the neck/chest surface.
- The 192 posed sleeve triangles were checked against 1,620 source-body triangles strongly weighted to spine, clavicle, neck or head (average weight above 0.75, arm weight below 0.15). Bidirectional triangle-edge intersection checks found **zero crossings**. The source skin material mesh contained 5,132 triangles in total; classification and ray-hit metrics are recorded rather than treating all shoulder transition faces as pure torso.

Evidence: `asset-studio/clothing-v13/final-sleeve-bones.json` and `final-sleeve-physical-report.json`. The diagnostic used the actual V13 studio runtime, source skin vertices posed through its skeleton, and the actual final sleeve triangles. It did not edit the runtime, Blend, GLB, binding geometry, or sleeve profile.

**Limit:** this establishes the explanation for the sampled far-arm white region on this actor at normal phase 0.32. It does not establish perfect sleeve fit on every actor, at every normal/sprint phase, or at the shoulder's mixed-weight transition. The shirt and runtime sleeves remain authored approximations, not simulated tailored cloth. Root stopped speculative profile changes and retains ownership of final visual acceptance against V12.

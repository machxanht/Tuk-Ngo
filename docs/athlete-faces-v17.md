# V17 facial variation and ocular alignment

## Face pipeline

Run `python scripts/athlete-faces-v17.py INPUT_GLB OUTPUT_GLB` to bake 16 deterministic adult male face variants across 55 active athletes. Regional jaw, cheek, nose, chin, brow, ear and asymmetry offsets use the head joint inverse bind matrices. Head-local X is lateral, Y is up and Z is forward. The reader respects interleaved glTF accessor byteStride.

The stronger prototype changes 33,153 facial vertices, with maximum displacement 14.68485 mm. Offsets taper to zero at the neck boundary and cap-contact scalp. Each athlete receives unique geometry and appended POSITION, NORMAL and COLOR_0 attributes, so geometry-UUID instancing cannot collapse the variants. There are no runtime morph targets. Face-only tint, brow/stubble detail and brown iris material variation retain the existing MakeHuman CC0 skin map.

The first Blender diagnostic failed to flip glTF texture V when reconstructing meshes. This produced repeated red marks and a forehead patch. Correcting V to 1-V shows clean original skin. This was a renderer error; output GLB UVs were never changed. The corrected `athlete-faces-v17-render.py` includes the actual cap and ocular meshes in four portraits.

## Actual-pose ocular diagnosis

The actual game exposed a separate ocular-placement defect. Run `node scripts/athlete-faces-v17-eye-diagnostic.mjs INPUT_GLB REPORT_JSON` to load the rig in Three.js and raycast skinned material triangles at animation phases 0.55 and 0.65. Before the fix, both pupil-center rays for actor 2 at phase 0.55 hit skin approximately 20.4 mm before the pupil and iris. The iris material existed but was hidden behind facial skin. Phase 0.65 adds foreground arm occlusion.

A head-local skin-depth profile establishes the cause: the original pupil center is at Y about 0.0447 m, above the actual orbital aperture at Y about 0.036 m. Skin at the original center is closed lid/brow at Z about 0.099 m; skin within the aperture recedes to Z about 0.067 m. Forward-only correction was visually rejected because it placed pupils on the brow. Those attempts are absent from the final candidate.

Run `python scripts/athlete-faces-v17-eyes.py INPUT_GLB OUTPUT_GLB` to measure each orbital aperture from head-only skin triangle intersections, sampled vertically every 0.5 mm, and center the existing sclera, iris and pupil there. For the current parent V17 input, the 110 eyes move downward 7.5-9.0 mm and have zero forward offset. Only ocular POSITION accessors are cloned and appended. Face, body, cap and garment geometry, weights, materials, animations and skins remain unchanged. The original binary data remains an exact prefix. The output `.eyes.json` records every measured offset.

Latest candidate: `E:/AI/Um Tuk/asset-studio/crew-v17-faces/ghe-ngo-crew-v17-eyes-measured.glb`. Apply this ocular fix to the current face GLB without reapplying facial variation. When rebuilding from the motion input, run the face pipeline first and ocular alignment second.

## Verification and limits

Both transformations assert original binary-prefix preservation and unchanged animation/skin JSON. The measured-eye candidate passes complete glTF validation with zero errors and 660 existing nested-skin warnings; the capped diagnostic did not establish zero warnings. At actual Three.js phase 0.55, both rays now hit pupil, then iris, then sclera before facial skin; the assertion passes. External reports are `eye-surface-order.json`, `eye-surface-order-after.json` and the candidate `.eyes.json`.

Directly inspected `portraits-measured-eyes.png`: pupils are centered within the eye openings, with no dots above the brow; the eyes have a dark brown, narrow squint appearance and caps remain fitted. The parent's final gate is the actual browser close view at phase 0.55. Arm occlusion at phase 0.65 must be assessed separately from ocular visibility. No accepted public GLBs, website code or commits were changed by this agent.


Parent acceptance: actual game portraits atphase0.55 show the measured eyes centered in their openings, distinct jaw/nose shapes and preserved caps. Final template validation uses maxIssues100000 and records0errors/660existingnestedskinwarnings; all eight bakedteamassets have0errors/715existingwarnings, matching uncappedV15baseline.

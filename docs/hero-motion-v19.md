# V19 one seated hero: motion helper

Scope: one original detailed MakeHuman study rig, not the full crew. Only `scripts/rebuild-hero-motion-v19.py` and this document are repository outputs. Original blend, public GLB and all geometry/materials remain untouched.

## Inspection and bounded diagnosis

Read original `assets/blender/athlete-rower-study.blend` through Blender and examined the authoring path for its49frame stroke. Reviewed [athlete-study-2024.md](athlete-study-2024.md), [crew-role-reference-2024.md](crew-role-reference-2024.md), and directly viewed real `remote-105s.jpg` plus the previously inspected104–105.75s contact sequence. Real seated rowers have bent raised knees, low hips, alternating forward catch/drive/recovery, and generally forward head direction. Numeric joint angles/timing are not measured from this material.

Original code carries a34°maximum torso lean with a coupled head correction (`head` factor−.6). This can leave gaze tied to the torso and a tucked silhouette. The existing lateral-only elbow pole keeps IK stable but may look rigid. The old head posture is a motion issue; brow/eye material expressions are separate geometry/material work. Garment contact morphs encode the old poses and must not be treated as valid after changing motion.

## Calling contract

Import the module in Blender, then call **`apply_motion_v19(rig,paddle,scene)`** after creating the body/clothes and before generating new garment contact corrections. It returns a numeric report and bakes49frames at64FPS (48intervals/64=.75s, authored80SPM). Required rig names are the study's head/neck/spine, thigh/calf/foot, upperarm/lowerarm/hand and five three-segment fingers on each side. Paddle local axis is+Z toward the handle, with shaft extending−Z; grip separation.53m and paddle placement assume the original1.52m study paddle.

Running Blender `--background --python scripts/rebuild-hero-motion-v19.py` reads the original source and saves only external `E:/AI/Um Tuk/asset-studio/coherent-v19/motion/athlete-motion-v19.blend` and `.glb`, numeric report and four phase PNGs. These use existing old garments for motion review; root owns their replacement. No geometry or material is created by the helper.

Changes: maximum spine lean28°; head and upper neck retain neutral world orientation; reachable paddle arc remains source-based; elbow pole adds modest down/back bias while retaining lateral separation; anatomical arm lengths/roll are calibrated from the study rig; wrists retain the elbow plane and fingers wrap to the actual shaft/crossgrip. Feet and hips have a stationary seated setup.

## Checks

Across49baked frames: anatomical palm-to-grip gap **0.000000504m**, foot drift **0.000000190m**, zero arm reach excess, elbow internal angle **55..145°**, head world orientation drift **0radians**. Lower-arm length is inherited from rest calibration; the solve does not stretch bones. Wrist orientation uses a continuous elbow-plane frame, with no fallback-axis switch. These are Blender numerical checks, not a claim of pixel-perfect exported skin contact or hull collision. There is no boat in this candidate, so support height against an actual seat/floor remains root's50m-sample integration check.

Actual generated phase0/.25/.5/.75PNG files were rendered; direct visual review accompanies handoff. Garment clipping/printing/cap/face expression must be reviewed on the root's newly authored hero, not judged complete from these inherited garments. No claim of full-game completion, mocap, scanned identity or exact real-athlete biomechanics.

## Alternate humanoid family

Quaternius may be useful for a consistent NPC/hero family, but bone aliases alone cannot safely retarget this helper: rest rolls, body dimensions, palm landmarks, finger counts and seated hip offsets differ. Supplying `bone_aliases` deliberately raises a clear unsupported-retarget error before mutating the rig. A later calibrated adapter should provide named shoulder/elbow/wrist/palm landmarks, actual segment lengths and rest orientation frames, then reuse the reachable arc and planted-support logic. This pass does not pretend that MakeHuman transforms are automatically natural on a different skeleton.

## Optional anatomical foot targets

`apply_motion_v19(..., foot_targets={'l':[.095,-.36,.11], 'r':[-.095,-.36,.11]})` accepts Blender world targets. DefaultNone preserves the existing seated setup. The helper solves thigh/calf chains using measured rest lengths and a forward knee pole, then retains each foot's rest world orientation. The resulting static leg pose is carried across49frames; hips/riglocation are not raised to hide feet. Verified sourcebone side: left thighX+.10558m, right−.10558m.

Original-blend49frame test with the supplied targets: max targetgap **0.000000616m**, drift **0.000000052m**, zero leg reach excess. Finalleftfoot[.09499945,−.35999975,.10999990], right[−.09499965,−.35999966,.10999987]. Palm and elbow metrics remain unchanged. Pelvis midpoint is constant at approximately[0,.005423,.544480]m; headworldY spans−.24053..−.06944m andZ1.12030..1.18186m. Pelvismidpoint is a rig support proxy, not a measured buttock contact surface. Report saved externally as `foot-target-report.json`. Actual hull/seat collision remains untested here; root must regenerate clothes and check the integrated sample.

## Garment follow-up: contact diagnosis and tailored shorts

Inspected integrated browser `coherent-v19/browser/hero.png` and latest `hero/athlete-v19.blend`. Direct on/off contact renders at frame25 showed the lower jersey smooth with morphs disabled and folded upward with morphs enabled (`garments/contact-off.png` versus `contact-on.png`). Largest shader-independent rest morph displacements were65.66mm at jerseyhemZ.92 and56.73mm at shorts top/crotchZ.88. Original Boolean shorts had196polygons/441vertices, including large n-gons, which are poor support for per-vertex contact displacement. This supports contact amplification and unstable top-shell fit, rather than missing garment-boundary faces.

`rebuild-hero-garments-v19.py` now uses the complete licensed MakeHuman pelvis/thigh surface for final shorts. The visible study has deliberately removed crotch faces, so it is unsuitable as the garment-shell source. A temporary full-base import is restricted to pelvis/thigh-weight faces, clipped at rest waistZ.92 and leghemZ.60, welded across source UV/material seams, offset14mm along normals and triangulated. Original anatomical skin weights are retained. Temporary source objects are deleted after extraction; no source/public asset is overwritten. The helper also lifts the jersey lower edge by up to45mm, tapered smoothly towardZ1.02, to reduce interference at the raised-thigh fold.

An initial anatomical-shell render exposed narrow seam cracks and hand fragments: rest-height clipping alone included hanging hands, and duplicated source seam normals were offset apart. Restricting by anatomical weights and welding before offset resolved those directly observed defects. Final shorts have2831vertices and three boundaries; fresh frame1/frame25renders were directly viewed and show connected smooth short hems without the earlier jagged fragments (`coherent-v19/garments/phase-1.png`, `phase-25.png`). These are pre-contact candidate renders, not final integration acceptance. Root owns region-aware contact rebaking and backprint reprojection; final49phase fit and rendered print still need validation after that stage.

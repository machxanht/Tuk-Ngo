# Art preview V4 — 2.5D and 3D comparison

Requested result: prioritize credible assets, use real references, preserve a downloadable 3D boat/crew, and publish a tablet comparison before adding gameplay. The accepted route is a fixed-angle 2.5D render from improved 3D source with a 3D comparison, full-boat and close-crew views, river and paddle-contact effects.

## Changes

The prior muscular Superhero source is replaced by an anatomical MakeHuman/MPFB CC0 mesh from Innerscene. The original 53-bone rig and skin weights are preserved. Separate raised jersey, shorts and binding surfaces share the rig; covered body faces are masked. A cap, seated leg pose, closed fingers and fixed-length arm IK complete the rowing variant. A clothing-edge diagnostic exposed false edges at split normals/UV seams; physical-position matching now keeps the binding on actual garment openings.

Torso lean, head compensation and paddle sweep/depth are adjusted as a continuous authored cycle. An arm-reach check on recovery led to a lower recovery lift; no grip tolerance was relaxed. The generator checks 81 phases both at the origin and after translation/yaw. `docs/qa/rig-check.json` records 55 roles, 25 thwarts, a watertight hull, hand contact, fixed arm lengths and paddle clearance. Maximum measured grip gap is 0.875 mm in that generator check.

The boat uses the existing dimensions and owner-clip-derived shape/livery. Real project press photos guide the green uniform, white cap, seating and festival bank. The owner's clip is graphic boat artwork rather than live rowing footage. The cycle is an authored approximation: no unverified timestamp/angle/cadence from earlier prose is promoted to a measured fact.

The offline Three.js authoring page exports 24 frames for each view into transparent WebP pages, including normalized blade/water contact positions. Canvas2D draws the 2.5D scene and contact-triggered droplets/ripples. The 3D comparison loads the exported GLB with its baked loop and retains procedural river effects. Views share phase/cadence/pause state. Close view isolates one pair so clothing, anatomy and hands can be assessed; full view shows all 55 actors. Original orbit studio and reference panels remain.

## Acceptance and limitations

- Inspect close view through entry, drive, exit and recovery; inspect full-boat silhouette and livery.
- Check pause/reset, cadence, splash toggle, view/mode switches and single-canvas cleanup.
- Check portrait 768×1024 and landscape 1024×768, without horizontal overflow or covered controls.
- Validate exported GLB, TypeScript and production build, then verify the deployed artifact by commit/HTTP content and browser interaction.
- Capture actual scene PNG and a 10-second animation clip; no AI reference image is used.

A fixed view intentionally limits camera freedom in the art comparison; the orbit studio remains for other angles. The rower is a generic source mesh adapted to this game, not a likeness of a specific real crew member. Body collision avoidance is inspected visually and is not a full physics solver. The GLB contains crew animation but not runtime water particles. Physical tablet frame rate, thermal behavior and final art approval still need testing on the user's device.

Historical V3 verification remains in `docs/tablet-preview-v3.md`; V4 evidence is recorded separately so earlier deployment claims are not confused with this revision.

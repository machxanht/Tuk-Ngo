# Painted festival motion V26

Only `public/assets/illustrated-v22/festival-scene.js` was changed in the application. The new regression helper is `scripts/check-festival-motion-v26.py`. No bitmap, placement configuration, preview/game rule, road, house, bridge, stand, banner or licensed source file was edited.

The existing scene used a sine sign to toggle each spectator between two source poses about half the time, plus vertical motion of the entire sprite. The revised renderer adds independent low-amplitude body shear/lean and breathing scale about the atlas foot anchor. That anchor remains the origin of the local transform, so the transform cannot translate the feet off the bank or stall. The old vertical whole-person bob is removed.

Each spectator now has an independent deterministic period, window duration, offset, tempo, phase and lean bias. Cheer windows last approximately 1.4–3.1 seconds in 7–15 second cycles; an eased envelope selects a single stable alternate pose during each eligible window. There is no alpha crossfade, duplicate person, double-arm overlay or generated in-between pose. Both source rasters are explicitly warmed and cached before readiness. The actual atlas contains 24 cells: 12 illustrated people with two source poses each. Continuous motion is an affine raster transform, not a new skeletal rig or a larger pose inventory. Parent integration corrected `stats.identities` to the actual twelve source people; it does not establish a new inventory.

`festivalScene.setActivity(value)` clamps finite values to 0..1 and ignores non-finite input. Default is .4. `getActivity()` returns the requested value; `stats.renderedActivity` reports the gently smoothed drawing value. At 0 the alternate cheer windows are disabled while the small body motion remains. At 1 more windows are eligible, with slightly stronger lean. The helper `motionAt(person,time,value)` exposes the deterministic transform/pose selection for QA and does not alter placements.

Water still uses the original river clip and painted background. Cached ripple rows now share a consistent downstream flow with shallow depth-dependent speed, offset row spacing, gently drifting vertical phase and smooth glints. Highlight opacity varies continuously rather than flashing on/off. No water bitmap was repainted.

## Verification

Run `python scripts/check-festival-motion-v26.py` against `http://127.0.0.1:4255/`. The helper compares all generated crowd/walker/vehicle/stall placement records against the HEAD renderer using the current unchanged scene configuration. The records matched byte-for-byte: **1,949 spectators, 64 walkers, 16 vehicles, 10 stalls**. Combined placement SHA256: `eafed1d57e81420e10816d4d4bf726f7a764a9be7d70355f0bcc0b798fd2479f`.

Actual Edge headless with D3D11 hardware GPU, device scale 1, was inspected at t=2 and t=6 in desktop 1440×1080 and tablet-sized 1024×768 viewports. Outputs are external at `E:/AI/Um Tuk/asset-studio/festival-motion-v26/`: `desktop-time2.png`, `desktop-time6.png`, `tablet-time2.png`, `tablet-time6.png`, `report.json`. The approved raster scene, Khmer banners and crowded banks remained visually intact. Alternate poses differed across people/time; no crossfade ghosting was present.

All sampled motion coefficients were finite. Canvas2D translate/scale/transform/setTransform/drawImage instrumentation recorded 25,427 calls per viewport during the sampled render checks with **zero non-finite numeric draw arguments**. Setter checks returned 0 for −2, 1 for 2 and preserved 1 forNaN. At t0,2,6,13,31 the alternate-pose counts were:

| Activity | Counts across the five sampled times |
|---|---|
|0|0,0,0,0,0|
|.4|135,162,127,135,136|
|1|339,347,322,348,326|

After restoring native Canvas2D methods, a five-second running-page measurement produced **29.91 FPS** on desktop (150 frames/5.015s) and **29.78 FPS** at tablet size (149 frames/5.004s), close to the existing 30 FPS loop cap. This is a local desktop GPU measurement with two viewport sizes, not a physical Android/tablet performance guarantee.

Final browser checks reported **zero page errors** in both viewports. An intermediate reload saw `TukNgoGameRules is not defined` while the parent's new rules bundle was being assembled; after that bundle and script order were completed, the affected full browser check passed on reload. `node --check public/assets/illustrated-v22/festival-scene.js` passed.

Limits: arm/face detail comes entirely from the two existing painted poses; pose changes are stable cuts, not interpolated limbs. Body deformation is gentle whole-sprite shear/scale rather than independently articulated anatomy. Water is layered 2D flow, not a fluid simulation. Actual tablet hardware and parent integration of race excitement remain parent review tasks.

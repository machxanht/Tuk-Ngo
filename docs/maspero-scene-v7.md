# Maspéro V7 — two 3D crews and urban race setting

Owner request: build two boats rowing together and a carefully made grandstand/river setting as close to Maspéro as the available real references allow. Continue the accepted 3D direction. No generated images are reference evidence.

## Real references inspected

- [Báo Sóc Trăng, Thạch Pích, 13 November 2024](https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/hao-huc-cho-ngay-khai-hoi-67c01d9/): the river-front photograph shows the stand, shallow double-pitch pale green/grey sheet roof, open steel frame, white concrete base, crowded seats and flags. The second photo, inside the stand, shows roof bracing, concrete pillars, red/white seats, blue side seats and a low white officials' building. Both original photos were opened and visually inspected in the browser.
- [SGGP, Tuấn Quang, 14 November 2024](https://www.sggp.org.vn/khai-mac-giai-dua-ghe-ngo-nam-2024-lon-nhat-tai-dbscl-post768322.html): the IMG_7872 photo was opened and visually inspected. It shows muddy water, spectators tightly packed behind the riverside railing, umbrellas, houses and wires behind them. The article confirms the 1,200 m men's event.
- [VTV, 15 November 2024](https://vtv.vn/doi-song/giai-dua-ghe-ngo-soc-trang-khu-vuc-dbscl-2024-hai-doi-ghe-chu-nha-bao-ve-thanh-cong-chuc-vo-dich-20241115222254275.htm): identifies the race section between bridges C247 and 30/4. Bridge silhouettes in the scene are generic approximations; no measured bridge geometry was supplied.
- [Owner's original design video](https://drive.google.com/file/d/1P4vzMy9rbXIHvB8kH6aNWpenhgbOcVoA/view): the existing V6 hull and original-pixel WebP ornament remain unchanged. This graphic video contains no athlete motion.
- Human mesh remains [MakeHuman/MPFB via Innerscene, CC0](https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1). V6's authored stroke is reused; see rowing-motion-v6.md and public/assets/human/ATTRIBUTION.md. No rowing motion capture is claimed.

Press photographs are visual references only; they are not copied into game textures. The scene's meshes, signs, colour fields, flags, clouds and water are authored in code. No image-generation tool was used.

## Delivered scene

The studio demo is the V7 preview. It starts near the finish/stand so both boats and the main setting are immediately visible. The original asset inspection remains available in the art demo.

- Two V6 hulls, each with all 55 people and its own baked rowing phase. The first crew keeps green clothing. The second uses amber jerseys solely to identify a fictional test opponent; this is not an authenticated second team asset.
- Shallow sheet roof, steel trusses, concrete columns/tiers, side access stairs, 1,144 coloured seat meshes, an officials' booth and loudspeakers.
- Two sloping concrete embankments, continuous metal railings, paved walks, urban roads, 285 simplified townhouses, 110 trees, flags, 62 umbrellas and 4,354 distant spectator figures. These are authored scene counts, not real venue capacities or inventories.
- Sediment-coloured moving water, daylight sky, separate per-boat droplets/ripples at paddle crossings and tapered moving wakes/contact shadows.
- Four orbitable cameras: both boats, following, close crew, and grandstand. Select either crew for the close view. Pause/play, reset, cadence, start/midpoint/near-finish jumps, course position, low-power rendering, PNG export and supported-browser 10-second WebM recording.
- Finish pass-through and automatic return after a short run-out. This is a rowing/scene trial, not competitive gameplay or a simulated official result.

## Approximations and ownership

The game course is 1,200 m long. Width 86 m, lane centres ±7.5 m, stand position/length, house arrangement, bridges, road widths, bank height, spectators, sign placement and boat travel speed are authored approximations. The x-axis is a local game coordinate, not a surveyed geographic direction. Real references support architectural character and appearance, not these exact dimensions.

The older race-course/2025-race-course-reference.md contains stronger CONFIRMED geometric/timestamp claims without fresh measurement evidence. V7 does not adopt those confidence labels as survey facts. This document states the actual basis of the active scene.

No V6 hull, athlete source, skin weights, source animation or original WebP file is overwritten. Runtime consolidation converts differing glTF joint attribute encodings to matching buffers, combines each person's five skinned surfaces into one vertex-coloured draw, merges stationary boat parts by material, and instances moving caps/eyes/paddle parts. The first team's garment colours and vertices are preserved; roughness uses one shared approximation for the consolidated human surfaces.

## Verification

Run node scripts/check-race-crews.mjs to load the actual GLB in Node (only image references excluded from its decoder), instantiate two translated/rotated crews, and inspect eight stroke phases. It checks 110 people/100 rowers, successful consolidation, 92,400 sampled source-vs-consolidated skin positions and moving-accessory transforms. Actual browser renders are additionally required.

Evidence is in docs/qa/two-crews-v7.json, scene captures and the V7 browser/deployment reports. Browser-size tests are not tests on a physical tablet. The existing large application bundle and high triangle count still limit older devices; the preview defaults to pixel ratio 1 and 24 Hz pose updates. Actual display frame rate is shown in the UI and depends on the device and browser.

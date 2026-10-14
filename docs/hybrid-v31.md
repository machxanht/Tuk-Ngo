# V31: athlete variation, portable GLBs and the eight-boat cup

Stable game/tablet URL: https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/.

## Visible changes

The athlete inspector now offers twelve named generic profiles with localized jaw, cheek, chin, nose, brow and eye-spacing changes, four modest hairline styles and optional stubble. The eye surfaces follow the same deformation. Smooth source normals are transformed rather than regenerated across UV seams. Crew identities use a stable team/actor hash, giving different distributions on the two boats. These are authored variants of one licensed anatomy, not twelve scanned people or likenesses of named competitors.

The same canvas and touch race now support an eight-boat simulated cup: quarterfinal, semifinal and final. Three player wins earn the cup; loss/DNF eliminates the player, and a tie explicitly replays that round. The bracket's other matches use seeded simulated outcomes independent of real ranks. Completed rounds save locally; reload restarts an unfinished race at its current round. Changing player or starting a new cup clears that cup's progress. The opponent livery loads before countdown; failure leaves the current pair visible and permits retry. Cup controls/bracket remain outside the picture. This is not a replay of the actual 2025 fixtures/results.

Two new optional GLBs are exported from the current renderer: seated rower with paddle, and blue-shirted bow caller. They contain skin UV/texture, chosen generic face, cap, kit prints, 53 bones and continuous role animation. Sleeved cuffs include nine corrective morph targets for ordinary glTF viewers. Generic hair/stubble is converted to vertex colour, with fine procedural grain omitted. These downloads are not requested on initial game load and do not represent all eight fully reconstructed uniforms.

## Garment corrections and evidence

Standalone GLB inspection exposed jagged cuff triangles and an old tank strap projecting above the anatomical sleeve. Nine outer shoulder vertices in the independently decimated source vest were 4.36–35.45mm from anatomical triangles. A nearest-surface shoulder conformance experiment introduced a visible dark gap in the public close-up and was removed. The accepted original tank shoulder is retained; the measured mismatch requires a properly retopologized garment, not further point-projection patches. Sleeve coverage includes the proximal armpit, and a flat cuff cuts the source triangle surface at an authored short-sleeve length.

Ordinary interpolation of new cuff positions and joint weights produced approximately 16mm drift under the actual clips despite a small synthetic-pose result. Moving the cutoff did not resolve this. The runtime therefore interpolates the two **already skinned source endpoints**, using three packed attributes (exact six-bit joint indices, normalized twelve-bit weights). This preserves surface correspondence without a separate tube or additional pose rigs. The portable GLB bakes the equivalent correction into its animation. Original source vertices keep their weights and normals; intersection normals are normalized.

The actual 17-pose shader-equivalent check stays within about 4.502mm for seated/standing rowers, caller and controller. Reloaded caller GLB stays around 4.50001mm across 33 animation samples. Both GLBs pass Khronos validation with zero errors and zero warnings. Direct body/face renders and paddle visibility were inspected. Some small seams/edge artifacts remain around the inherited vest-to-sleeve transition: these checks prove correspondence, not flawless tailoring or historical costume accuracy.

## Verification

- `test-tournament-v31.mjs`: all eight players, valid bracket progression, three wins, loss/DNF/tie, duplicate finish and validated restore.
- `check-tournament-ui-v31.py`: actual buttons at 1024×768, 390×844 and 834×480; accelerated existing-model wins through all three rounds, saved/loaded progress, explicit injected tie fixture, DNF, choice locks and livery failure/retry. These are integration checks, not timed human races.
- Existing quick race gate: four layouts, real button input, pause, fullscreen controls outside scene, records after reload, accelerated win/DNF and audio; no page errors or failed normal requests.
- Face gate: twelve actual profile renders, finite normalized geometry, all twelve identities represented in each of two distinct crew distributions. Skin UV/seam and low-power gates pass.
- Rig/feet/grip gate passes with unchanged eight continuous role rigs. Current actor has 14,185 triangles; whole-boat draw is 949,621 triangles/314 calls. Headless desktop remains around the existing 30fps cap; physical tablet hardware remains untested.
- All eight team palettes/liveries and the Kos Thum blue interior pass the existing selection/load-retry gate. Source corpus and its remaining historical uncertainties are unchanged.

Current evidence is under `docs/qa/hybrid-v31/`. Earlier unchanged crowd/roster checks remain in V29; gallery recordings show V31. Export development helpers are not included in the game's initial bundle.

## Whole-goal status

Implemented: stable shared route/style/camera, two racing 3D boats and role motions, moving painted festival/water, sprint droplets, dense varied painted crowd/walkers/vehicles/stalls, eight sourced visual teams, touch quick race and cup, standalone athlete downloads, linked 61-entry bilingual list. These are implementation/placement facts, not an 80% visual-fidelity score.

Still incomplete or unverified: some garment seams and exact branded tailoring; independently sculpted identities; full crowd rigs/large action library; measured Maspéro reconstruction and exact bridge/stand architecture; remaining land-hull-to-bib/kbach matches; six roster Khmer names; native Khmer wording review; actual tablet performance and human playtesting. The audio is still a licensed CC0 concert crowd, not a Khmer tournament chant. The broad goal remains active.

Final deployment: main implementation `fbcd987`, Pages `e31dcc10e37ad0817b9539caa2b4f8c96779fa9e`, successful workflow38535994521. Public release capture explicitly confirms all nine script URLs use hybrid-31.1 and the active shader uses14/16 vertex attribute slots. Public gallery GLBs with the same31.1 cache key reload with53 bones, actual hand motion and caller cuff gap~4.50001mm; no page errors. The final public close-up retains the prior shoulder shape and does not show the rejected projection gap.

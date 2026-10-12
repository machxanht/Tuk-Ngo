# V13: race-bound paint corrections and garment boundaries

This continues V12's eight 2025 men's quarter-finalist identities, two-boat course and caller's feet inside the hull. The stable studio, gameplay and art URLs are retained. The change is limited to crew garment geometry, team paint/kit and their delivered GLBs; gameplay balance, spectators and course architecture are retained.

## Real-reference corrections

- **Tum Núp 2 / 17:** the directly visible race hull has a green sinuous naga/dragon body with pale dorsal marks on dark blue. This replaces the unbound green leaf-scroll training candidate. The caller is light blue with navy shorts; the controller is black with blue/navy shorts; rowers remain green with white caps. On-land Tum Núp1 scale detail is not asserted to be the same physical hull as team2.
- **Kos Thum 1 / 49:** orange/red caps replace the former distant yellow-cap interpretation. The inner hull is blue. The race-side alternating lime diamonds and gold/orange floral curls now match the adjacent blue-interior launch hull, resolving that motif/layout assignment. The caller's yellow kit and controller's blue shirt/yellow cap are visible separately. See [bib49/17 binding evidence](top-eight-2025-hull-binding-followup.md).
- **Om Pou Year / 23:** finished named 2025 sources show dense lime curled leaves on black, red rail, diagonal separators, a central red name panel and a cyan figurative insert on the red end. The panel's blurred lettering is deliberately untranscribed. The figurative end is a simplified authored interpretation; the unseen opposite end is mirrored rather than claimed as recovered paint.
- **Pôthi Satharam 2 / 07:** the red side now includes the newly exposed lower repeated gold curling border between gold lines. The upper repeated ornamental band is not a transcription of unreadable lettering. Neither the Om nor Satharam new land footage establishes a readable numbered race hull; their exact bib23/07 physical hull binding remains unresolved. See [Om/Satharam evidence](top-eight-2025-om-satharam-followup.md).

Prêk On Đơk, Trà Cuôn, Trà Tim and Pôthi Khsach retain the V12 observed motif families and race palettes. Each team has a separate curved bib plaque on each bank, with independent UV direction so the digits are readable from both banks. Plaque positions use the accepted shared hull shape and are approximate. Eight identities remain selectable as two opponents, with no invented separate ranks5–8.

## Garments and preserved motion

The repaired editable crew is `assets/blender/crew-v13.blend`, merged with the accepted hull into `public/assets/ghe-ngo/ghe-ngo-crew-v13.glb`. The original V12 asset is retained. Canonical shirt surfaces receive interior-only reduction that preserves the four boundary loops. Closed continuous binding tubes use the shell's actual boundary positions and weights. Caller/controller material slots stay role-specific. Runtime team sleeves have a rounded side profile and taper, without a filled shoulder cap protruding into the neckline. This is a restrained garment repair, not a newly sculpted human or a cloth simulation. Shirt fit and exact historical cuts remain approximate; Khmer back print is still the owner's custom **កូនខ្មែរ**.

All 55 armatures, authored base/sprint rowing, body vertices/weights and paddle motion remain. The accepted hull's original binary segment stays unchanged in the merged template. Repaired geometry and current team styling are exported into **all eight downloadable GLBs**, not just applied to the live view.

## Reproduce and inspect

Run Blender `scripts/repair-crew-garments-v13.py` against the existing V12 editable source. It writes previews, reports and optional three-phase renders outside the repository, under `../asset-studio/crew-v13-garment/`. After reviewing them, copy its `.blend` to `assets/blender/crew-v13.blend`, deduplicate its GLB into `../asset-studio/crew-v13/crew-dedup.glb`, and run `node scripts/merge-role-crew.mjs v13`. The merge reuses V12 sprint tracks; it resolves bones by full actor/rig paths and retains the corrected caller tracks.

Run `node scripts/build-team-liveries-2025.mjs`. In Vite open `scripts/export-team-assets-2025.html`, export each identity from the V13 template, then run `gltf-transform dedup` on each download into `public/assets/ghe-ngo/teams-2025/`. The game downloads these baked files directly. Internal revision queries invalidate changed textures/GLBs while the user-facing URLs stay stable.

Affected gates: `check-role-crew.mjs v13`, `check-role-runtime.mjs v13`, `check-team-assets-2025.mjs v13`, TypeScript, gameplay checks and production build. Visual QA must inspect representative catch/pull/recovery, seated and standing clothing, caller feet, both-bank bibs and changed paint. Browser viewports are not a physical tablet benchmark. Exact per-boat measurements, hidden kbach and full costume fidelity remain unverified.

## Verified release gates

The final merged template has 893,342 active triangles (budget 900,000), 55 actors, both clips, preserved accepted hull bytes, and zero glTF validator errors/warnings. The optimized two-crew runtime samples 49 phases per clip: 2,457,840 lower-leg vertices show no intrusion below the authored hull floor; 196 caller-foot samples stay inside the hull. Maximum template hand-to-grip gap is 0.00001242m. All eight delivered GLBs are reopened and their two clips exercised, with zero validator errors/warnings, 880 foot samples and 848 grip samples each; maximum exported grip gap is 0.002143m. These are model-contact checks, not real-race measurements.

Actual production Edge checks at 1024×768 and 768×1024 select/download all eight teams, match every downloaded SHA-256 to its validated file, exercise sprint water, and start/input/pause/change-team/resume the game. No page exceptions were observed. Three-phase seated/standing/caller review uses normal and sprint cadences, with both-bank bib inspection. The remaining far-arm white sleeve near the neck in one view was checked physically on actor18 at phase0.32: zero crossings with the classified torso/head/neck triangles; this limited diagnostic does not establish perfect costume fit. Evidence is in `docs/qa/crew-v13/`. TypeScript, gameplay gates and the production build pass. Physical-tablet performance remains untested.

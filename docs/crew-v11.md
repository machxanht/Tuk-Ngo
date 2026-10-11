# V11 crew and spectators

This revision applies the detailed athlete to the two-boat studio and playable rhythm game. The single-athlete preview remains an inspection tool. The accepted V9 hull/livery binary segment is copied without modification into the new GLB; water, architecture and crowd remain realtime scene assets outside that GLB.

## Requested roles and kit

Each boat has 50 propulsion paddlers: 8 seated pairs forward and 17 standing pairs aft. The selected boundary is within the owner's requested 5–10 pairs, not a measured historical count. The other five actors are a seated bow caller facing the crew, a light-blue standing coordinator near the transition, and three stern helmsmen with long sweep oars. Those roles have separate motion and close-view buttons under “Người trên ghe & khán giả”. Both the studio and game load `ghe-ngo-crew-v11.glb`.

The clean green kit has a continuous waistband and loose shorts. The back print is **កូនខ្មែរ**, requested custom team lettering rather than historical sponsor artwork. Windows Khmer UI shapes the text into a transparent glyph texture; only print-primitive UVs are cropped. Skin UVs are kept intact. Caps have a crown, seams and visor, with 18 forward and 37 backward orientations per boat. The amber test team retains its own colour.

Foot placement is authored against the accepted hull's inner cross-section and fore/stern decks. Anatomical two-bone leg solves keep the feet at fixed support points while the torso strokes. A generic isolated seated pose previously put ankles almost at keel height and outside the narrow lower hull. The support plan considers the whole foot footprint, not only a bone position.

The animated river now discards surface fragments inside each moving hull using the accepted cross-section in boat coordinates. A continuous river plane had previously passed through the open boat and hidden the feet below its surface, making correctly positioned lower legs look cut off. The contact-shadow plane also leaves the dry interior clear. The same treatment is used in studio, gameplay and whole-boat inspection.

## Spectators

Sixteen authored adult profiles derive from the existing licensed MakeHuman/MPFB CC0 topology. Body proportions, skin tones, hair treatment, caps, garment outline, plain/striped clothing and colour vary. Six activities include standing/seated watchers, standing/seated clap, one-hand wave and standing cheer. Most standing spectators watch; activity, phase, speed, intensity and facing differ independently.

The vertex-animation textures and instanced near/far batches preserve the existing crowd API and density. The arm IK pole uses the actual shoulder side: assigning left/right signs contrary to the source rig had pulled the arms through the torso. The near mesh has 1,800 triangles; the far mesh has 319. Modeled cap crowns/visors and bob hair move with the head, rather than being painted onto a bald silhouette. These are stylized derivatives of one topology, not 16 separate scans or portraits. [Attribution](../public/assets/crowd/ATTRIBUTION-v10.md) records the free source.

## Real evidence and limits

See [fresh video research](crew-role-reference-2024.md). Actual 2024 Báo Sóc Trăng frames and Thanh Niên photographs guide seated/standing silhouettes, white cap orientation, kit and the caller/coordinator distinction. The supplied full YouTube replay was throttled during this research pass, so its contents were not newly inspected. No generated image was used as reference and no press image is redistributed as a game texture.

Motion, exact counts, paddle dimensions and steering sweep remain authored approximations. This is not motion capture, a scan of a real athlete, or a measured reconstruction. Screenshots and browser-size checks establish the rendered result on desktop WebGL; they do not establish physical tablet performance.

## Build and verification

The editable source is `assets/blender/athlete-rower-study.blend`; `scripts/build-role-crew.ps1` wraps the installed free Blender pipeline. It plans support points, exports base and `--sprint` role cycles, deduplicates the base mesh, merges the accepted hull, and checks the saved GLB. Add `-RebuildStudy` to rebuild the detailed athlete and shaped Khmer texture through `build-athlete-study.ps1` first. Intermediate exports go to the neighboring `asset-studio/crew-v11` cache. Both Blender sources stay editable. The wrapper has been syntax checked; the individual authoring, merging and checking steps were executed during this revision.

Physical UV/normal seams are welded before anatomy simplification. Decimating the original disconnected seam islands had produced shattered skin silhouettes. Skin permanently covered by the vest is omitted in the crew derivative so its simpler garment cannot reveal flesh speckles. Shoulder and armhole anatomy remains. Opposite-bank rigs reflect the body but compensate the print UVs so Khmer lettering stays readable.

`check-role-crew.mjs` validates the persisted GLB, role distribution, cap orientation, triangle budget and original binary preservation. `check-role-runtime.mjs` inspects two actual cloned crews. Direct browser views must additionally cover the kit, cap, both paddler postures, caller, coordinator, steering and the crowd; structural metadata alone cannot establish visual quality. The unchanged rhythm engine uses `check-gameplay.mjs`. Type checking and a production build complete the local gate.

The stable routes are `?demo=studio`, `?demo=art` and `?demo=play`. New asset filenames refresh cached assets without introducing a separate public URL for each fix.

## Checked result on 2026-10-11

- Persisted boat GLB: 21,789,708 bytes, 812,052 active triangles, 55 actors, two distinct role clips; glTF validator reports zero errors and zero warnings. The original 7,736,128-byte hull/livery buffer prefix retains SHA-256 `e1fa94afa34fa4c6c12de82c4b8d88032080362c67d61c21e283241b8aa15473`.
- Two runtime crews: 49 phases of both clips, 2,457,840 lower-leg/foot vertex samples. No sampled penetration of the accepted hull's inner surface; maximum foot-bone support error is 0.000009813 m. This is sampled animation verification, not a physical collision simulation.
- 10,388 grip samples across seated/standing propulsion and stern steering: maximum palm-center gap is 0.000012416 m. The handle path is projected into both arms' reach before IK, rather than clamping an arm and leaving its hand off the shaft. Steering oars are 4.2 m and their tips remain below the water surface in sampled poses. Finger-surface pressure and physical cloth dynamics are not simulated.
- NPC data: valid indices, finite animation values and normalized normals across all six activities. Near/far binary sizes are 3,207,168 / 611,712 bytes.
- Direct Edge WebGL views cover both paddler postures, the caller, coordinator, steering, both crowd banks, and Khmer back print. `*-footplacement.png` images temporarily hide interface overlays for diagnosis; the `*-browser.png` images show the actual interface.
- Browser checks at 1024×768 and 768×1024 pass without page errors or horizontal overflow. Water time advances, sprint strength reaches 1 and paddle contact emits spray. The playable build starts, responds to a stroke, freezes time/distance while paused and resumes.
- Type checking, production build and the existing rhythm-engine checks pass. Single-athlete GLB has zero validator errors and 28 non-root skinned-node warnings. Physical tablet performance and native-reader review of the shaped Khmer lettering remain untested.

Evidence is in `docs/qa/crew-v11/`, `docs/qa/crowd-*-v10.*` and `docs/qa/athlete-study/`. Earlier rejected diagnostic renders are excluded from this release.

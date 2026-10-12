# V18 baseball caps

The owner requested a recognizable baseball cap rather than the old oversized dome and raised rim. The new cap replaces only the consolidated cap mesh on each of the 55 crew members. It has a fitted six-panel fabric crown, subtle seams, a small flat button, side eyelets, a rear opening and adjustment strap, and a closed curved bill with an approximately 8.3 cm projection and 1.8 mm edge thickness. These are authored game dimensions, not measurements from an individual athlete's cap.

The 18 forward and 37 backward assignments are retained. Existing team and specialist cap colours stay intact. Roughness is increased to 0.92 with zero metalness. Each cap is weighted entirely to its own head joint and positioned through the existing inverse bind matrix. Hull, kbach, clothing, varied faces, corrected eyes, athlete placement, skins and both animation clips are retained.

Reproduction: `python scripts/baseball-caps-v18.py INPUT_GLB OUTPUT_GLB`. Start from the V17 template and the eight V17 baked team files. The generator retains the original binary prefix and asserts that animation JSON, skin JSON and every non-cap node are unchanged. Team outputs then pass through `gltf-transform dedup`; existing team files keep their public filenames, while downloads use `?v=18` to refresh cached assets. The studio, gameplay and whole-boat art preview load `ghe-ngo-crew-v18.glb`.

## Checks

- The scalp clearance test inspects 121,495 actual crown vertices, edge midpoints and triangle centres across all 55 caps, in head space. Final minimum radial clearance is approximately 0.993 mm, with no penetrating samples. An initial close render caught small forehead intersections; measured clearance led to the final fitting allowance. See [cap fit](qa/crew-v18/cap-fit.json).
- Direct game renders inspect both orientations from front, side and rear at rowing phase 0.55. The selected crew member is isolated for inspection; geometry, team material and animation are the actual game assets.
- The template has 892,407 active triangles, 55 actors and both clips. glTF validation reports zero errors and the existing 660 nested-skin hierarchy warnings. All eight team files reopen correctly, retain their kit/kbach and pass exported hand/foot support checks. Their existing warning count remains 715 per file.
- The affected runtime check retains zero lower-leg hull intrusion, caller feet inside the hull and maximum palm-to-grip error under 2.92 mm across both clips.

The production build and TypeScript check pass. Actual Edge browser checks pass at 1024×768, 768×1024 and 800×600: clean default UI, camera selection, gestures, team switching, actual GLB download hash, sprint water, and game start/input/pause. See [production browser checks](qa/crew-v18/production-ui-check.json), [front-facing cap](qa/crew-v18/cap-3-front.png), [side profile](qa/crew-v18/cap-3-side.png), and [backward cap and strap](qa/crew-v18/cap-2-front.png).

Public deployment acceptance is recorded after verification. Physical tablet hardware remains untested. The existing V17 map, crowd, traffic and camera behavior are unchanged by this cap-only update.

# Mixed D/F crew verification

The existing character-comparison page now opens the moving 54-person crew. The initial deterministic roster contains 31 D and 23 F characters, 7 skin tones, 8 model/hair combinations, 16 model/face combinations and 52 complete identities. The identity button generates another roster while retaining the same downloaded meshes and textures.

## Verified

- Both final character GLBs have nine body clips. F retains its separate facial demo. All three GLBs, including the fitted hair library, validate with zero errors and zero warnings.
- The bake records 776 poses per character: 97 samples for each side/posture/crew role. Palm contacts remain within 1 mm of their paddle targets and neither arm exceeds its measured reach. These are authored IK motions; they are not motion capture.
- Browser checks pass at 1440×900, 1024×768 and 768×1024: default mixed crew, randomization, bounded caches, both sides/postures, facial controls, pause/play, phase scrubbing and no HTTP/console errors. Six sampled phases give minimum foot/hull clearance of approximately −0.9 mm, within the numerical tolerance used for the hull surface.
- After five identity changes, 16 shared role skeletons and 34 cached material variants remain. Geometry and texture resources are shared.
- At the same 1440×900 close view and phase 0.28, the renderer reports 224 draw calls / 976,744 triangles after shared support-board instances and pose-aware frustum bounds; the preceding implementation rendered 602 calls / 2,300,925 triangles. These counters are not frame-rate measurements on physical tablets.
- Main-app `npm run lint`, `npm test` and `npm run build` pass. The architecture gate confirms the unchanged 533-vertex / 896-triangle / four-boundary-loop shirt and preserved source hashes.
- The public page passes the same three browser layouts. All eight published files match the Git content (the CSS checkout's CRLF line endings normalize to LF); all three served GLBs match their exact local bytes. See [public file hashes](public-files.json) and [public browser results](browser.json). Implementation: `ce593d0`; Pages deployment: `c021c914ad1c0064e58bb2d9a567418d6fce8e2e`.

## Visual inspection

Reviewed the complete boat in landscape/portrait, bow caller, two helmsmen, close crew, native F expressions and sampled port/starboard stroke phases. D uses its own shoulder/torso surface and weights, a finished garment edge and a pelvis-weighted shorts waistband. Hair caps use radial skull clearance plus a thin target-head scalp underlay; loose locks remain visible. The cap keeps broad skulls from showing through sparse source hair panels.

- [Crew detail](crew-detail-1440.png)
- [Tablet portrait](crew-768.png)
- [Bow caller](crew-front.png)
- [Two helmsmen](crew-stern.png)
- [Port/starboard sampled cycle](cycle-contact.png)

## Limits

The route is a mixed-crew inspection preview; it does not yet replace athletes in the cup race. The high-resolution F source remains heavier than D. Physical-tablet frame rate and a large field of these full-resolution crews have not been measured. Facial profiles are modest shape-key variations of the two approved characters, not 16 separately sculpted people.

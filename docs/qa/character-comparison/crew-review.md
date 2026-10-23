# Original athlete GLB retained; faces only

The earlier inspection implementation incorrectly substituted a Quaternius D body. It is replaced with a thin adapter around the game's existing createHybridBoats. The same face-only graft runs in the game and the existing inspection route.

- All 54 athletes retain the original body, connected shirt, cap, hair, paddle, placement and eight shared motion rigs.
- Sixteen static head identities derive from D/F. The initial roster uses 31 D faces and 23 F faces. Face changes do not select another original body/cap variant.
- The face mask changes triangle indices only for head-weighted skin/eyes. Every geometry attribute remains the exact original BufferAttribute. Body buffers are never edited or replaced.
- A 96-phase browser comparison against createHybridBoats({faces:false}) checks all eight skeletons, every athlete placement, paddle matrix and shirt positions: 768 role poses, zero differences.
- Original source hashes and the protected 533-vertex / 896-triangle / four-boundary-loop connected shirt pass the architecture gate.
- The new static head-only GLB validates with no errors or warnings and contains no skin/body skeletons. Full D/F source GLBs and the NPC implementation remain unchanged.
- Browser checks cover desktop 1440×900 and tablet layouts 1024×768 / 768×1024, face randomization, bounded caches and the existing 18-NPC / nine-activity preview. No browser/HTTP errors.
- Directly inspected original-body-detail.png, original-body-face.png and the three crew viewport screenshots. The neck/head style remains stylized; physical tablet frame rate is unmeasured.

See browser.json, validation.json and public-files.json for measured evidence. NPCs are still an inspection sample; this change does not replace thousands of map spectators with full-resolution D/F models.

The production build was also opened in the two-boat race at 1024×768. Both boats use 54 face grafts and eight original rigs; the head GLB is fetched once for the two concurrent loaders. No JavaScript or HTTP errors. Edge reports an existing GLSL compiler warning in unmodified festival-crowd.mjs (bonePose/skinPose); that separate crowd shader was not changed. See game-browser.json.

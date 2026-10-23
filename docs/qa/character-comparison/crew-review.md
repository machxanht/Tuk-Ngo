# Face-only crew and civilian NPC verification

The existing character-comparison route now has three views: the common-body crew, varied civilians and the unchanged source D/F comparison. This follows the revised requirement to randomize only athlete faces and reserve broader appearance variation for NPCs.

## Crew

- 54 athletes use one D body, the same blue kit, short haircut and common skin material. The initial roster selects 31 D faces and 23 F faces, covering 16 source/profile combinations.
- Head-only geometry is cached in the bind coordinates of the head. F retains its facial morphs and is fitted to the common neck envelope. The corresponding original D head triangles are masked in a shared derived body geometry.
- Changing faces preserves exact body geometry UUIDs, skeleton UUIDs and dimensions. Eight shared role skeletons and four cached identity material variants remain after repeated randomization.
- Six sampled rowing phases give a minimum foot/hull clearance of approximately -2.14 mm, inside the hull approximation tolerance. Neither the protected V32 shirt nor the eight source rigs are edited.

## NPCs

- The separate inspection shows 18 civilians: nine D and nine F bodies, 12 shirt colors, eight trouser colors, six initial skin choices and seven initial model/hair combinations. Appearance changes also change faces, hair and proportions.
- Nine activities are sampled: idle, waving, clapping, cheering, indicating, talking, phone use, walking and seated clapping. Independent phases and speeds avoid synchronized crowd motion. Native F blink/smile and head movement remain active.
- The arm solver uses each body's own limb lengths and palm frame. Walking positions and phone/bench visibility are verified. Every NPC's bone pose changes across sampled times. The D casual shirt has a shared longer hem fitted outside the actual waistband.
- After five appearance changes, the material cache contains 74 variants; source geometry/textures and the derived casual shirt are shared. No new model downloads are required.

## Checks and visual review

- The source D/F GLBs and hair library are unchanged and still validate with zero errors/warnings. The recorded rowing bake retains its 776 measurements per source and its palm/reach checks.
- The viewer browser suite passes at 1440x900, 1024x768 and 768x1024: view switching, face-only invariants, NPC activities, randomization, bounded caches, phase/playback, original facial controls and no HTTP/console errors.
- Main-app lint, architecture/source-hash checks and build pass. The architectural gate confirms the exact 533-vertex / 896-triangle / four-boundary-loop shirt and preserved source hashes.
- Directly reviewed [crew detail](crew-detail-1440.png), [NPC detail](npc-detail-1440.png), [NPC portrait](npcs-768.png) and the sampled animation poses.

## Scope

This is the existing asset inspection route. The cup race and its instanced map crowd are unchanged. The 18 full-resolution NPCs are a motion/appearance sample, not a replacement for thousands of map spectators. Physical-tablet frame rate has not been measured. See browser.json and public-files.json for the latest local/public verification and deployment identity.

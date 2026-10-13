# V20 — crowd variety, distinct buildings/vehicles and fitted athlete kit

The requested changes apply to the existing 50 m quality sample, at the same `?demo=studio` tablet URL. The full race and game remain available in the collapsed panel. This update does not claim that the entire Maspero course or all eight crews have been replaced.

## Delivered changes

- Eleven complete Quaternius CC0 civilian variants, seven men/four women, with different clothing, hair and hats. Source idle, wave and walk are preserved. Two people walk short promenade routes; others alternate source motions with explicitly authored clap, cheer and indication gestures. The latter are runtime arm/palm poses with eased transitions, not source motion capture or extra clips mislabeled inside the GLBs. The source faces remain stylized and some share a head family.
- Seven lots now use five structural families: older one-storey tiled dwelling with veranda, shutter/balcony shophouse, taller flat-roof townhouse and gate, open-front café/shop with depth/counter/tables, and a tin-roof local house. Windows, doors, roofs and heights differ. Licensed existing wall/roof maps use stronger restrained detail and UV projection appropriate to front/side surfaces. Buildings are authored regional approximations, not measured Maspero buildings or Google 3D tiles.
- A compact sedan and small pickup replace the rounded placeholder cars. New authored meshes include sloped glass, roof/hood/body volumes, wheel arches, tires/rims, mirrors, door seams, lights, bumpers and pickup bed. Exterior volume winding was corrected after an actual render exposed missing roofs; wheel rotation now matches the vehicle's local forward direction. Cars remain simplified game models rather than branded vehicle scans.
- Athlete vest is rebuilt as a garment pattern cut from the same licensed anatomical torso and skin-weight field. The previous synthetic cylinder could switch nearest arm/torso surfaces and produced shoulder flaps. The new surface has deliberate neck/arm openings, 1.8 mm thickness and four sewn bindings, with rebaked contact morphs. Shorts, cap, face, paddle and accepted hull remain consistent with the previous sample. `កូនខ្មែរ` is reprojected onto the new vest.

The civilian module keeps conservative animated bounds for culling; it does not multiply these detailed models across the full dense crowd. There is no physical-tablet performance claim.

## Editable sources and verification

`assets/blender/athlete-v20.blend` is the packed editable hero. `scripts/rebuild-hero-v20.py` and its garment helper reproduce the GLB, using the preserved original anatomical source and diffuse. `scripts/prepare-npc-v20.py` converts the documented CC0 source models. See the NPC manifest and `docs/npc-v20.md` for exact URLs/hashes. Cars/houses are source geometry in their Three modules and use no newly acquired third-party car/house model.

Affected checks: TypeScript lint, production build, persisted hero GLB validator/193 pose samples, direct front/back outfit renders across the stroke, direct NPC gesture/car close views, responsive production UI and continuous runtime. Runtime checks are not likeness scores. Source hero has zero glTF errors and sixteen inherited nested-skinned-mesh warnings; NPCs have zero errors and four/five inherited warnings each.

The sample still uses stylized civilian faces, simple glass/vegetation and representative car forms. Hands/fabric are authored animation and geometry, not simulated fabric or measured race biomechanics. Final direct images and reports, rather than topology counts alone, establish what was inspected.

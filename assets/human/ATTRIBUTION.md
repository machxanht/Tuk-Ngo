# Athlete assets and reference provenance

## Independently drawn 2D illustration (V5)

The default V5 illustration is original code-native Canvas2D artwork in `src/race/illustrated-ghe.mjs`. It uses separate drawn faces, garments, limbs and boat contours, with its own continuous rowing pose curve. It does not use the MakeHuman body, GLB geometry, 3D poses or rendered V4 atlas. The owner's existing livery WebP remains the only image used by this scene. No AI-generated reference image is used.

The real photograph captioned “Đội ghe Nam Tum Nup 2 (số 12)” in Nhân Dân's 15 November 2024 report was visually inspected for green tops, white caps, close seating and rowing posture: https://nhandan.vn/gan-1-trieu-luot-nguoi-du-le-hoi-ooc-om-boc-dua-ghe-ngo-soc-trang-nam-2024-post845131.html . The photograph is a reference and is not included in the game. Faces are generic drawn characters. The pose timing is authored rather than measured race timing.

The preserved MakeHuman model below remains active in the 3D comparison. The V4 atlas is historical material rather than V5's default artwork.

## Active MakeHuman athlete (V6 motion, V4 mesh)

The anatomical body, face, skin weights and 53-bone skeleton come from MakeHuman/MPFB assets, packaged and released under **CC0** by Innerscene. It is a generic character, not a portrait of a named athlete.

- Primary release: https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1
- Download: https://www.innerscene.com/api/library/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1/download
- MakeHuman asset license: https://static.makehumancommunity.org/makehuman/faq/are_makehuman_files_free.html
- CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode.en
- Retrieved 2026-10-10. Preserved source: `makehuman-athlete-base.glb` (4,994,640 bytes).
- Source SHA256: `7135e03b6259e970458deff3e0458610914d7c35164cae12611101361e4a5749`.

`makehuman-athlete.glb` is the clothed and simplified game derivative. `scripts/prepare-athlete.mjs` masks covered body faces, adds separate raised jersey/shorts meshes and edge binding, and retains the source skeleton and skin weights. Simplification preserves rig attributes. The runtime adds a cloth cap and small eye accessories, skin-color variation, seated leg poses, finger closure, torso motion and fixed-length arm IK. These additions are authored for this project. No AI image generation is used to construct or validate these assets.

The complete boat/crew GLB embeds the same derivative with baked rowing animation. The 2.5D WebP atlas is an offline render of that same rig and boat geometry through Three.js. It is not an AI-generated depiction or a separate anatomical reference.

## Preserved previous Quaternius asset (V3)

`quaternius-athlete.glb` and `QUATERNIUS-LICENSE.txt` remain for provenance and earlier versions. The default V4 scene does not load this character.

- Author: Quaternius — Universal Base Characters, Superhero Male, CC0 1.0 Universal.
- Author's page: https://quaternius.com/packs/universalbasecharacters.html
- Official pack: https://quaternius.itch.io/universal-base-characters
- Previous repack: https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/public/assets/character.glb
- Repack provenance: https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/ASSETS.md

## Real boat and festival references

The livery WebP is rectified from the graphic boat clip supplied by the owner: https://drive.google.com/file/d/1P4vzMy9rbXIHvB8kH6aNWpenhgbOcVoA/view . It is a design variant, not asserted to be the original Tum Nup 2 race livery from 2024. Existing press photographs in the project's evidence index guide uniform colors, seating and river setting. No press photograph/video is redistributed as a texture here.

The rowing loop is authored animation, not motion capture; preview cadence is adjustable and is not claimed to be a measured historical race cadence. The river, droplets and ripples are illustrations, not hydrodynamic measurements.

V6 retains the source body/garment mesh and skin weights. It changes the arm hinge orientation, fist/paddle path and phase interpolation to address the owner's rejection of the earlier rowing motion. The accepted 3D hull and original livery remain unchanged. The actual race video at https://www.youtube.com/watch?v=P5FvDeN7vow was viewed for broad sequence/rhythm; its distant view is not used to claim measured joint angles. V5's 2D illustration remains an unapproved experiment.

## V8 crowd and sprint derivatives

`crowd-near.bin/.json` and `crowd-far.bin/.json` derive from the same CC0 MakeHuman source. Mesh simplification and 16-frame standing cheer, standing clap and seated clap cycles are authored in `scripts/bake-crowd.mjs`; these are not video-extracted people or motion capture. Shirt, trousers, hair and skin are vertex regions on the licensed anatomical mesh. Near/far meshes contain 1,800/314 triangles.

The separate `ghe-ngo-crew-v8.glb` preserves V6 hull and ornament bytes and adds an authored sprint animation. Cadence 81–105 blends stronger torso/paddle movement while solving both hand grips. The owner-supplied VTV10 livestream https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s was inspected for real crew rhythm, spray and event appearance. No generated image was used as evidence.

## V9 skin, garment contour and Blender pipeline

The skin diffuse map is MakeHuman's `young_asian_male/young_lightskinned_male_diffuse3.png`, released as CC0 in September 2020 by Data Collection AB, Joel Palmius and Jonas Hauquier. It comes from the official [MakeHuman system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html). Source PNG SHA-256: `f50016a5507fc687dc8df06599c8ea48de950cd185de33a71cafc1319ddab4d5`. The original source material records those copyright holders and the CC0 release. This is a generic licensed character texture, not a photograph or a portrait of a named Khmer athlete.

`ghe-ngo-crew-v9.glb` embeds a 2048 × 1024 shared albedo/normal/roughness atlas. The skin normal detail derives from high-frequency detail in the licensed map; fabric weave and folds are analytically authored material details. Four warm skin tints, green jersey, red binding and navy shorts are project derivatives. The atlas is packed using `scripts/texture-athlete.py`; no AI-generated photograph is used. The 2020 [Quân đội nhân dân photo essay](https://www.qdnd.vn/phong-su-anh/dua-ghe-ngo-mon-the-thao-dac-trung-mien-song-nuoc-642925) was visually inspected for Tum Núp 2's sleeveless green tops, red trim, dark shorts and white caps. Its photographs are reference only and are not redistributed as textures.

The garment generator now splits triangles along continuous neckline and armhole boundaries, shares the smoothed skin/cloth contour, interpolates skin weights at new vertices and closes the raised cloth edge with binding. It preserves the 53-bone rig and authored base/sprint stroke. It is not a cloth simulation or motion capture. The accepted hull and owner livery remain the V8 baseline; `docs/qa/assets-v9.json` records the preservation check.

Blender is used headlessly to import the actual persisted crew, render a selected athlete with their paddle, and export that athlete back to GLB. The packed editable source is tracked at `assets/blender/athlete-v9.blend`; the standalone actor and paddle are `public/assets/human/athlete-rower-v9.glb`. Studio stills and verification reports are tracked in `docs/qa`. Tool binaries and source caches stay outside Git. See `docs/asset-pipeline-v9.md` for the reproducible build command.

## Detailed single athlete — 2024 study

`athlete-rower-study.glb` retains the detailed original MakeHuman/MPFB CC0 body and official CC0 skin source. The derived skin tint, stitched vest, binding, shorts/waistband, cap, wooden paddle, print geometry and rowing/contact-correction animation are authored in `scripts/build-athlete-study.py`. Editable source: `assets/blender/athlete-rower-study.blend`. Arial is converted to mesh lettering; the font file is not redistributed.

Green sleeveless kit with **green binding**, white print/caps, bare feet, brown paddle, pale transverse grip and blue tape are based on photos 8 and 11 in [Duy Tân's 15 November 2024 Thanh Niên report](https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm). Motion sequence was checked against boat 12 at 104–107 seconds in the [2024 Báo Sóc Trăng video](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/). Press images/video are reference only, not included as game textures/sounds. No generated image is used as evidence.

This is a generic athlete, not a scanned or identified participant. Paddle dimensions, skin tint, cloth folds and motion are authored approximations; small sponsor artwork is incomplete. The detailed actor is for inspection before preparing a crew LOD. See `docs/athlete-study-2024.md` for reference decisions, build and limits.

# Athlete assets and reference provenance

## Active MakeHuman athlete (V4)

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

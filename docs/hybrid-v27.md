# V27: correct skin UV export and smooth athlete surfaces

The primary tablet URL stays unchanged. V27 changes the athlete source and inspector; the V26 gameplay model and painted festival composition remain intact.

Two measured problems explained the flat, faceted close-up. `athlete-rig-v25.glb` did not contain `TEXCOORD_0` on its anatomical body, although the saved Blender body still had the original `UVMap` spanning approximately .01..99. Assigning the plain vertex-colour material had left the body UVs unused during GLB export. The previous runtime filled missing UVs with zeros, so a skin texture could only sample one location. Also, recalculating normals after export split 431 equal-position seam pairs into different normals, while Blender's original normals had zero such splits.

`export-skin-hero-v27.py` opens the preserved working V25 Blender prototype, attaches the existing official MakeHuman skin to the anatomical material, rebuilds the same seated-port action and exports a source GLB with its UVs. `build-skin-asset-v27.mjs` verifies the pinned original PNG hash, rejects missing/constant body UVs, packs the source into `athlete-rig-v27.glb` and saves provenance. The final prototype is 4,230,492 bytes, including the original 2,048×2,048 skin image. The runtime now loads this same downloadable file, reuses its embedded skin texture and merges the skin into the shared actor geometry. The standalone PNG is an optional source copy, not an additional first-load skin request.

The source PNG SHA-256 is `f50016a5507fc687dc8df06599c8ea48de950cd185de33a71cafc1319ddab4d5`, from the official [MakeHuman system CC0 assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html), `skins/young_asian_male/`. Pixels are unchanged. It is generic licensed anatomy detail, not a photograph of a tournament athlete. No image-generation reference, new paid service or account was involved.

The renderer preserves the source smooth normals and transforms head normals with the inverse of each local shape change. It avoids recomputing them independently at export seams. Skin detail affects only the anatomical zone; clothing, caps, eye surfaces, bindings and print retain their materials. Low-power mode returns to the simpler skin shading and lower resolution. The inspector can select twelve modest head/tone/cap variants and switch between whole-body and face framing; the main race camera is unchanged. These are variants of one generic face, not twelve distinct sculpted identities.

Rebuild:

```powershell
& '../tools/blender/blender-5.2.2-windows-x64/blender.exe' --background --python-exit-code 1 --python scripts/export-skin-hero-v27.py
node scripts/build-skin-asset-v27.mjs
node scripts/build-preview-v26.mjs
```

Actual close-up renders of all twelve variants and caller/controller/helm were inspected. Runtime UVs now span .00997..99189 and .03176..98993; all 431 seam pairs retain equal smooth normals. Skin shaders reported zero errors. The new GLB validator reported zero errors and sixteen inherited nested-skinned-node warnings. The source geometry counts remain unchanged at 13,743 triangles per merged actor. Rig continuity/contact checks, playable-race UI/records/audio and festival regression are rerun for this changed asset; physical tablet hardware performance is unmeasured.

The cap, paddle, shorts and ivory bindings remain authored generic choices. Repository records distinguish these from exact dated team costumes: the 2020 QĐND reference had red trim; previously inspected 2025 Tum Núp 2 kit records green rowers/white caps with different leadership colours. The current green/amber prototypes do not claim a complete historically verified team uniform. All real-video/photo references remain separate from approved generated style artwork.

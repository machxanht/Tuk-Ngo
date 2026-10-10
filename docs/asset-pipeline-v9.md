# Asset pipeline V9

V9 keeps the accepted 30.20 × 1.12 m hull and owner's embedded livery, and improves the existing MakeHuman athlete. It uses an official CC0 skin map, continuous garment cuts, closed trim, shared PBR atlas and authored tangents. These are generic game characters with authored base/sprint rowing, not scanned members of Tum Núp 2 and not motion capture.

## Installed and exercised tools

- Blender 5.2.2 LTS portable, downloaded from the [official release directory](https://download.blender.org/release/Blender5.2/). The Windows x64 archive is 404,453,484 bytes, SHA-256 `3849d17a682cba006075aaa3f3597ecb5c9c30ec31035b2e092c53e40679b535`, matching the publisher's checksum list. No account or paid plan is needed. It has been used to import the actual GLB, render a rower with their paddle, export that selection to GLB and save an editable, texture-packed Blender studio file.
- Existing Node.js and Python runtimes. The Python texture packer uses NumPy and Pillow. The pinned glTF Transform CLI 4.5.1 is a development dependency for constrained mesh simplification and lossless deduplication; it is not shipped as game code.
- No paid API, GPU subscription or AI image generator is required. The free pipeline does not depend on creating an Adobe/Mixamo account. Mixamo may be useful later for auxiliary NPC motion; it does not supply a faithful seated ghe Ngo stroke automatically.

The CLI's `braces`/`micromatch` dependency still has an unpatched deep-pattern denial-of-service advisory in the package audit as of this check. The build script passes fixed project file paths and does not accept remote glob patterns or run a public conversion service. This is a development-tool limitation, not a claim that the package audit is clean. See the [primary advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Rebuild on the configured PC

From the repository, run:

```powershell
npm ci
python -m pip install numpy pillow
powershell -NoProfile -File scripts/build-athlete-v9.ps1 -Render
```

The script expects the verified portable Blender at `../tools/blender/blender-5.2.2-windows-x64/blender.exe`, uses `../tools/asset-cache/young-asian-male` as its source cache and `../asset-studio` for intermediate files. Those tool binaries and cache files are outside Git; the scripts, current athlete derivative and completed crew GLB are tracked here. `fetch-athlete-skin.py` downloads only the relevant entries of the official system pack, checks ZIP CRC and the pinned source PNG SHA-256, and requires no sign-in.

The packed, editable athlete and paddle are tracked in `assets/blender/athlete-v9.blend`, with the two authored actions, three packed atlas images and a render camera. Blender's selected-object export is `public/assets/human/athlete-rower-v9.glb`. These are the actual imported game assets, not a separate illustration. Studio stills and the reopen report are in `docs/qa`.

The source skin is [MakeHuman's CC0 young Asian male material](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html). Its color map is reused as licensed source data. Skin normal detail is derived from its fine detail; fabric weave/normal/roughness are analytic authoring. No generated photograph is used as evidence. Atlas dimensions are 2048 × 1024, shared across the body, jersey, shorts and binding. The runtime retains UVs and tangents when combining those meshes into one skin draw call per actor, while keeping separate colors for the two crews.

Garment cuts split source triangles at a rounded neckline, armhole and hem. New vertices receive interpolated UVs and the strongest four normalized bone influences. Skin and cloth share a smoothed boundary, and the binding closes the raised cloth shell. The cap is fitted farther forward to cover the scalp. Tangents are added only to the athlete atlas primitives with Three.js, so processing does not reindex the accepted hull.

## Real references and scene scope

The [2020 Quân đội nhân dân photo essay](https://www.qdnd.vn/phong-su-anh/dua-ghe-ngo-mon-the-thao-dac-trung-mien-song-nuoc-642925) was visually inspected for green sleeveless tops, red trim, navy shorts, white caps and crew proportions. The [owner-supplied VTV10 2025 tournament](https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s) remains the primary reference for the two banks, stands, paddling and splash. The owner-provided graphic boat clip supplies the accepted ornament. Press photographs and YouTube pixels/audio are reference only, not redistributed as game textures or sounds.

V8's animated anatomical crowd, separate VIP/opposite stands, Khmer signs, moving water and CC0 crowd audio remain active. V9 reduces oversized white splash sprites, uses faster droplet fall and adds thin, fading irregular ripples. Higher cadence still blends the stronger stroke and emits more contact spray. National flags remain removed.

The festival reach between C247 and 30/4 is about 400 m according to [Tuổi Trẻ's river report](https://tuoitre.vn/vi-sao-song-maspero-o-can-tho-co-ten-tieng-nuoc-ngoai-100260819111310656.htm). V9 places the bridges 400 game metres apart near the finish stretch; the men's course still starts farther upstream and runs 1,200 m. This is an authored layout, not surveyed GIS. Buildings, trees and bridge decoration remain approximations. C247's teal portals have a real photograph reference; the 30/4 truss still uses the January 2022 construction photograph, so its finished decoration is not asserted to match 2025 exactly.

## Verification and limits

Use the persisted-asset checks with explicit output paths, so historical QA is retained:

```powershell
python scripts/check-assets-v9.py
node scripts/check-crew-glb.mjs public/assets/ghe-ngo/ghe-ngo-crew-v9.glb docs/qa/baked-rig-v9.json
node scripts/check-race-crews.mjs public/assets/ghe-ngo/ghe-ngo-crew-v9.glb docs/qa/two-crews-v9.json
npm run lint
npm run build
```

`assets-v9.json` checks the accepted hull attributes, indices, material and exact owner-livery bytes. The rig check samples 161 phases at base, half and full sprint. The crew check compares persisted and consolidated skin vertices, UVs, colors and accessories; image identity tokens are used solely because Node has no image decoder. Actual textures, shaders, motion, water and appearance must also be inspected in the browser. The official glTF validator report retains known nested-skinned-node warnings; it is not a reason to claim every target engine has been tested.

Studio stills verify material mapping and the garment in two views. They do not prove game performance. Browser stills/video and responsive viewport checks are separate evidence. A desktop browser viewport is not a physical tablet benchmark, and a generic CC0 body with new materials is not a photogrammetric reconstruction of a tournament athlete.

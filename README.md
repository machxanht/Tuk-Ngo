# Tuk-Ngo — 3D ghe Ngo and Maspéro race preview

React/Vite/Three.js project. V6 defaults to the **3D boat** the owner preferred. The hull geometry and owner-video livery are preserved; the crew's rowing loop has a forward grip path, source elbow hinge frames, straight wrist alignment and continuous phase velocity. V5's independent 2D illustration remains an experimental comparison after the owner rejected its appearance. The original reference panels and orbit-camera studio remain available.

Current two-boat tablet preview (V7): https://machxanht.github.io/Tuk-Ngo/?demo=studio

Single-boat asset inspection (V6): https://machxanht.github.io/Tuk-Ngo/?demo=art

## Run and build

```sh
npm ci
npm run dev
npm run lint
npm run build
```

Vite base is `/Tuk-Ngo/`. `?demo=art` and the existing `?demo=race` open the single-boat 3D preview. Choose full boat/close crew, pause/reset, cadence and splashes. “Xem từng pha chèo” pauses and scrubs the loop. Export a PNG, a 10-second WebM clip (supported browsers), or the 3D GLB. `?demo=studio` opens V7: two animated 3D crews, the photo-referenced Maspéro grandstand, urban banks, spectators, a 1,200 m preview course, four cameras and separate paddle-contact effects. Start near the grandstand; use “Đường đua & tùy chọn” to visit the start, midpoint or finish and select either crew. The amber-shirt team is a fictional test team. The root page keeps the reference dossier.

## Assets and effects

- `public/assets/human/makehuman-athlete-base.glb`: preserved MakeHuman/MPFB source, 53-bone rig, Innerscene CC0 release.
- `public/assets/human/makehuman-athlete.glb`: clothed and simplified derivative, 1.41 MB.
- `src/race/illustrated-ghe.mjs`: independently authored Canvas2D human, boat, river layers and pose curve. Its only bitmap is the owner's existing livery, `kbach-from-reference.webp`.
- `public/assets/ghe-ngo/sprites/`: preserved historical V4 WebP renders and phase/contact manifest. The current preview does not use them.
- `src/race/boat.mjs` and `design-profile.mjs`: boat, repository dimension constraints, owner-supplied graphic-reference shape/livery.
- `src/race/imported-athlete.mjs`: preserved body mesh/weights, separate garment surfaces/accessories, seated poses, fixed-length IK and finger closure.
- `src/race/river.mjs`: animated water and separate droplet/ripple pools triggered by each boat's paddle contact.
- `src/race/maspero-course.mjs`: authored 3D grandstand, shallow double-pitch roof/trusses, coloured seats, embankments, urban streets/houses, spectators, flags, bridges and signs based on real 2024 photos. Dimensions and placement are approximate.
- `src/race/race-crew.mjs`: loads the unchanged V6 GLB twice, consolidates skinned surfaces and instances moving accessories for the two-boat scene, plus tapered wakes.
- **GLB** downloads the prebuilt boat with 55 rigged athletes and a rowing loop (7.51 MB). Water particles are realtime app effects.
- `public/assets/human/ATTRIBUTION.md`: source, license and changes. The previous Quaternius files remain for provenance; V4 does not load that character.

Source is on `main`; the static production build is on `gh-pages`. Both animations are authored, not motion capture; the environment is an approximation. Tablet-size browser QA does not replace testing on a physical tablet. V7 is a two-boat scene/rowing trial, with no race scoring or new input gameplay. See `docs/maspero-scene-v7.md` for references, assumptions and checks, and `docs/rowing-motion-v6.md` for the unchanged stroke. V4 and V5 remain documented historically.

## Rebuild assets

The generator writes outside the Vite watch directory, checks the rig at the origin and after translation/rotation, and embeds the original WebP with glTF UV orientation. In PowerShell:

```powershell
$athleteBuild = node scripts/prepare-athlete.mjs | ConvertFrom-Json
npx --yes @gltf-transform/cli@4.2.1 weld $athleteBuild.output "$env:TEMP\tuk-ngo-athlete-welded.glb"
npx --yes @gltf-transform/cli@4.2.1 simplify "$env:TEMP\tuk-ngo-athlete-welded.glb" public/assets/human/makehuman-athlete.glb --ratio 0.22 --error 0.001 --lock-border true
$crewBuild = node scripts/export-crew.mjs | ConvertFrom-Json
npx --yes @gltf-transform/cli@4.2.1 dedup $crewBuild.output public/assets/ghe-ngo/ghe-ngo-crew.glb
```

Run the dev server, open `/Tuk-Ngo/art-bake.html`, export both views, and download each view's three WebP pages plus its manifest. Assemble with `node scripts/assemble-sprites.mjs C:\path\to\downloads`. The bake page checks the rig before enabling export, clips geometry below the waterline and uses the same model/light/pose functions as the 3D source.

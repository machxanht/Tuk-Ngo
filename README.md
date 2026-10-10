# Tuk-Ngo — ghe Ngo art preview

React/Vite/Three.js project. V5 defaults to independently drawn **2D illustration**: curved human silhouettes, painted clothing and faces, a drawn boat, layered river scenery, and a separate continuous rowing cycle. It does not load a GLB or the V4 rendered atlas. The 3D option preserves the current boat/MakeHuman crew as a comparison. Only phase, cadence and controls are shared; the artwork and pose functions are separate. The original reference panels and orbit-camera studio remain available.

Tablet preview: https://machxanht.github.io/Tuk-Ngo/?demo=art

## Run and build

```sh
npm ci
npm run dev
npm run lint
npm run build
```

Vite base is `/Tuk-Ngo/`. `?demo=art` and the existing `?demo=race` open the art comparison. Choose 2D illustration/3D, full boat/close crew, pause/reset, cadence and splashes. Export a PNG, a 10-second WebM clip (supported browsers), or the 3D GLB. `?demo=studio` retains the earlier orbit-camera river preview. The root page keeps the reference dossier.

## Assets and effects

- `public/assets/human/makehuman-athlete-base.glb`: preserved MakeHuman/MPFB source, 53-bone rig, Innerscene CC0 release.
- `public/assets/human/makehuman-athlete.glb`: clothed and simplified derivative, 1.41 MB.
- `src/race/illustrated-ghe.mjs`: independently authored Canvas2D human, boat, river layers and pose curve. Its only bitmap is the owner's existing livery, `kbach-from-reference.webp`.
- `public/assets/ghe-ngo/sprites/`: preserved V4 WebP renders and phase/contact manifest. V5's default illustration does not use them.
- `src/race/boat.mjs` and `design-profile.mjs`: boat, repository dimension constraints, owner-supplied graphic-reference shape/livery.
- `src/race/imported-athlete.mjs`: preserved body mesh/weights, separate garment surfaces/accessories, seated poses, fixed-length IK and finger closure.
- `src/race/river.mjs`: animated water, banks/trees/buoys, droplet/ripple pool triggered by paddle contact.
- **GLB** downloads the prebuilt boat with 55 rigged athletes and a rowing loop (7.51 MB). Water particles are realtime app effects.
- `public/assets/human/ATTRIBUTION.md`: source, license and changes. The previous Quaternius files remain for provenance; V4 does not load that character.

Source is on `main`; the static production build is on `gh-pages`. Both animations are authored, not motion capture; the river is an illustration. Tablet-size browser QA does not replace testing on a physical tablet. This revision implements the visual comparison stage, with no new race gameplay. See `docs/art-preview-v5.md`; V4 remains documented historically.

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

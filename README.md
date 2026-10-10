# Tuk-Ngo — 3D ghe Ngo and Maspéro race preview

React/Vite/Three.js project. V6 defaults to the **3D boat** the owner preferred. The hull geometry and owner-video livery are preserved; the crew's rowing loop has a forward grip path, source elbow hinge frames, straight wrist alignment and continuous phase velocity. V5's independent 2D illustration remains an experimental comparison after the owner rejected its appearance. The original reference panels and orbit-camera studio remain available.

Current two-boat tablet preview (V8): https://machxanht.github.io/Tuk-Ngo/?demo=studio&v=v8

Single-boat asset inspection (V6): https://machxanht.github.io/Tuk-Ngo/?demo=art

## Run and build

```sh
npm ci
npm run dev
npm run lint
npm run build
```

Vite base is `/Tuk-Ngo/`. `?demo=art` and the existing `?demo=race` preserve the V6 single-boat inspection. `?demo=studio` opens V8: two 3D crews, two different covered grandstands, dense animated anatomical spectators, Khmer signs, urban Mekong Delta banks and bridge inspection cameras. Cadence above 80 blends into a stronger sprint stroke and increases paddle-contact spray. Use “Bật tiếng cổ vũ” to enable the licensed crowd recording; sound pauses with the scene. “Đường đua & tùy chọn” provides start/midpoint/finish jumps, team selection, low-power rendering, PNG and 10-second WebM exports. The amber-shirt team is a fictional test team. The root page keeps the reference dossier.

## Assets and effects

- `public/assets/human/makehuman-athlete-base.glb`: preserved MakeHuman/MPFB source, 53-bone rig, Innerscene CC0 release.
- `public/assets/human/makehuman-athlete.glb`: clothed and simplified derivative, 1.41 MB.
- `src/race/illustrated-ghe.mjs`: independently authored Canvas2D human, boat, river layers and pose curve. Its only bitmap is the owner's existing livery, `kbach-from-reference.webp`.
- `public/assets/ghe-ngo/sprites/`: preserved historical V4 WebP renders and phase/contact manifest. The current preview does not use them.
- `src/race/boat.mjs` and `design-profile.mjs`: boat, repository dimension constraints, owner-supplied graphic-reference shape/livery.
- `src/race/imported-athlete.mjs`: preserved body mesh/weights, separate garment surfaces/accessories, seated poses, fixed-length IK and finger closure.
- `src/race/river.mjs`: animated water and separate droplet/ripple pools triggered by each boat's paddle contact.
- `src/race/maspero-course.mjs`: two distinct covered stands, concrete embankments, dense crowds, townhouses, coconut trees, bridges and Khmer signs based on the owner's real VTV10 footage and real photographs. National flags are removed. Dimensions and placement are approximate.
- `src/race/crowd.mjs` and `public/assets/human/crowd-*`: MakeHuman CC0 anatomical NPCs, three authored cheer/clap cycles, GPU interpolation and two mesh detail levels. `scripts/bake-crowd.mjs` rebuilds the pose data.
- `src/race/race-crew.mjs`: loads the separate V8 GLB twice, blends base/sprint animation, consolidates skinned surfaces and instances moving accessories, plus tapered wakes.
- **V8 GLB** contains the unchanged hull/livery, 55 rigged athletes and base/sprint clips (9.12 MB). The original V6 GLB remains unchanged. Water, crowd NPCs and buildings are realtime scene assets outside the boat GLB.
- `public/assets/fonts/`: self-hosted Noto Sans Khmer, SIL OFL 1.1. `public/assets/audio/`: CC0 real crowd recording and attribution; not a recording of this tournament or a Khmer chant.
- `public/assets/human/ATTRIBUTION.md`: source, license and changes. The previous Quaternius files remain for provenance; V4 does not load that character.

Source is on `main`; the static production build is on `gh-pages`. Animations are authored, not motion capture. V8 is a scene/rowing trial with no new scoring gameplay. See `docs/maspero-scene-v8.md` for the actual reference basis, checks and remaining approximations. In particular, 30/4 bridge decoration uses a 2022 construction photograph, not a verified current finished elevation. Browser-size QA does not replace a physical tablet benchmark. V4–V7 remain documented historically.

## Rebuild assets

The generator writes outside the Vite watch directory, checks the rig at the origin and after translation/rotation, and embeds the original WebP with glTF UV orientation. In PowerShell:

```powershell
$athleteBuild = node scripts/prepare-athlete.mjs | ConvertFrom-Json
npx --yes @gltf-transform/cli@4.2.1 weld $athleteBuild.output "$env:TEMP\tuk-ngo-athlete-welded.glb"
npx --yes @gltf-transform/cli@4.2.1 simplify "$env:TEMP\tuk-ngo-athlete-welded.glb" public/assets/human/makehuman-athlete.glb --ratio 0.22 --error 0.001 --lock-border true
$crewBuild = node scripts/export-crew.mjs | ConvertFrom-Json
npx --yes @gltf-transform/cli@4.2.1 dedup $crewBuild.output public/assets/ghe-ngo/ghe-ngo-crew-v8.glb
```

Run the dev server, open `/Tuk-Ngo/art-bake.html`, export both views, and download each view's three WebP pages plus its manifest. Assemble with `node scripts/assemble-sprites.mjs C:\path\to\downloads`. The bake page checks the rig before enabling export, clips geometry below the waterline and uses the same model/light/pose functions as the 3D source.

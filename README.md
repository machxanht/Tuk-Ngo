# Tuk-Ngo — 3D ghe Ngo racing on Maspéro

React/Vite/Three.js project. V6 defaults to the **3D boat** the owner preferred. The hull geometry and owner-video livery are preserved; the crew's rowing loop has a forward grip path, source elbow hinge frames, straight wrist alignment and continuous phase velocity. V5's independent 2D illustration remains an experimental comparison after the owner rejected its appearance. The original reference panels and orbit-camera studio remain available.

Playable tablet race (V10): https://machxanht.github.io/Tuk-Ngo/?demo=play&v=v10

Two-boat scene inspection (V9 assets): https://machxanht.github.io/Tuk-Ngo/?demo=studio

Single-boat asset inspection (V9): https://machxanht.github.io/Tuk-Ngo/?demo=art

## Run and build

```sh
npm ci
npm run dev
npm run lint
node scripts/check-gameplay.mjs
npm run build
```

Vite base is `/Tuk-Ngo/`. `?demo=art` and the existing `?demo=race` open the V9 single-boat inspection. `?demo=studio` opens V9: two 3D crews, two different covered grandstands, dense animated anatomical spectators, Khmer signs, urban Mekong Delta banks and bridge inspection cameras. Cadence above 80 blends into a stronger sprint stroke and increases paddle-contact spray. Use “Bật tiếng cổ vũ” to enable the licensed crowd recording; sound pauses with the scene. “Đường đua & tùy chọn” provides start/midpoint/finish jumps, team selection, low-power rendering, PNG and 10-second WebM exports. The amber-shirt team is a fictional test team. The root page keeps the reference dossier.

## Assets and effects

- `public/assets/human/makehuman-athlete-base.glb`: preserved MakeHuman/MPFB source, 53-bone rig, Innerscene CC0 release.
- `public/assets/human/makehuman-athlete.glb`: clothed and simplified derivative with continuous garment contours, 1.70 MB.
- `src/race/illustrated-ghe.mjs`: independently authored Canvas2D human, boat, river layers and pose curve. Its only bitmap is the owner's existing livery, `kbach-from-reference.webp`.
- `public/assets/ghe-ngo/sprites/`: preserved historical V4 WebP renders and phase/contact manifest. The current preview does not use them.
- `src/race/boat.mjs` and `design-profile.mjs`: boat, repository dimension constraints, owner-supplied graphic-reference shape/livery.
- `src/race/imported-athlete.mjs`: preserved body mesh/weights, separate garment surfaces/accessories, seated poses, fixed-length IK and finger closure.
- `src/race/river.mjs`: animated water and separate droplet/ripple pools triggered by each boat's paddle contact.
- `src/race/maspero-course.mjs`: two distinct covered stands, concrete embankments, dense crowds, townhouses, coconut trees, bridges and Khmer signs based on the owner's real VTV10 footage and real photographs. National flags are removed. Dimensions and placement are approximate.
- `src/race/crowd.mjs` and `public/assets/human/crowd-*`: MakeHuman CC0 anatomical NPCs, three authored cheer/clap cycles, GPU interpolation and two mesh detail levels. `scripts/bake-crowd.mjs` rebuilds the pose data.
- `src/race/race-crew.mjs`: loads the separate V9 GLB twice, blends base/sprint animation, consolidates skinned surfaces and instances moving accessories, plus tapered wakes.
- **V9 GLB** contains the unchanged hull/livery, 55 rigged athletes, a shared CC0 skin/fabric PBR atlas and base/sprint clips (10.85 MB). The editable athlete is `assets/blender/athlete-v9.blend`; its Blender GLB export is `public/assets/human/athlete-rower-v9.glb`. The original V6 GLB remains unchanged. Water, crowd NPCs and buildings are realtime scene assets outside the boat GLB.
- `public/assets/fonts/`: self-hosted Noto Sans Khmer, SIL OFL 1.1. `public/assets/audio/`: CC0 real crowd recording and attribution; not a recording of this tournament or a Khmer chant.
- `public/assets/human/ATTRIBUTION.md`: source, license and changes. The previous Quaternius files remain for provenance; V4 does not load that character.

Source is on `main`; the static production build is on `gh-pages`. Animations are authored, not motion capture. V10 adds playable rhythm racing at `?demo=play`, using the preserved V9 assets. Tap Chèo in the bright timing zone, choose recovery/steady/sprint, race an independent AI over 1,200 m, view results and replay. Space/Enter also activate the focused Chèo button. Three difficulties and browser-local winning records are included. Changing tabs pauses the race. See `docs/gameplay-v10.md` for the game rules and checks, and `docs/asset-pipeline-v9.md` / `docs/maspero-scene-v8.md` for the reference basis and remaining approximations. The game balance is authored, not an official race simulation. In particular, 30/4 bridge decoration uses a 2022 construction photograph, not a verified current finished elevation. Browser-size QA does not replace a physical tablet benchmark. V4–V9 remain documented historically.

## Rebuild assets

The configured free pipeline verifies the official CC0 skin download, rebuilds the crew and optionally renders it in the installed Blender. In PowerShell:

```powershell
npm ci
python -m pip install numpy pillow
powershell -NoProfile -File scripts/build-athlete-v9.ps1 -Render
```

See `docs/asset-pipeline-v9.md` for tool paths, source licenses, checks and limitations. The accepted hull geometry and embedded owner livery are verified against V8.

Run the dev server, open `/Tuk-Ngo/art-bake.html`, export both views, and download each view's three WebP pages plus its manifest. Assemble with `node scripts/assemble-sprites.mjs C:\path\to\downloads`. The bake page checks the rig before enabling export, clips geometry below the waterline and uses the same model/light/pose functions as the 3D source.

# Tuk-Ngo — 3D ghe Ngo racing on Maspéro

React/Vite/Three.js project. V6 defaults to the **3D boat** the owner preferred. The hull geometry and owner-video livery are preserved; the crew's rowing loop has a forward grip path, source elbow hinge frames, straight wrist alignment and continuous phase velocity. V5's independent 2D illustration remains an experimental comparison after the owner rejected its appearance. The original reference panels and orbit-camera studio remain available.

Playable tablet race: https://machxanht.github.io/Tuk-Ngo/?demo=play

Two-boat scene inspection: https://machxanht.github.io/Tuk-Ngo/?demo=studio

Asset inspection: https://machxanht.github.io/Tuk-Ngo/?demo=art

V13 continues the eight selectable men's quarter-finalists from Maspéro2025 and keeps the bow caller's feet **inside the open hull**. Actual numbered race footage corrects Tum Núp17's naga paint/role clothing and Kos Thum49's blue interior, orange/red caps and diamond/floral side. New finished-hull views improve Om Pou Year's black/lime side and Satharam's gold curling borders. Garment bindings are continuous, short sleeves have a tapered profile, and bibs read correctly on both banks. All eight downloadable GLBs contain the updated crew and two rowing clips. The crew has 8 seated pairs forward, 17 standing pairs aft, a caller, a coordinator and three helmsmen; Khmer back print remains **កូនខ្មែរ**, with mixed cap directions. Sixteen spectator profiles and the existing game/course remain. See [V13 changes and limits](docs/crew-v13.md), [2025 results](docs/top-eight-2025-results.md), [numbered race binding](docs/top-eight-2025-hull-binding-followup.md), and [Om/Satharam details](docs/top-eight-2025-om-satharam-followup.md). Eight exact tournament replicas are still not established: Om/Satharam land-to-bib binding, hidden brushwork and individual hull measurements remain unresolved. The same three links above are retained.

## Run and build

```sh
npm ci
npm run dev
npm run lint
node scripts/check-gameplay.mjs
node scripts/check-role-crew.mjs
node scripts/check-role-runtime.mjs
node scripts/check-team-assets-2025.mjs
npm run build
```

Vite base is `/Tuk-Ngo/`. `?demo=art` and `?demo=race` open the detailed athlete and whole-boat inspection. `?demo=studio` loads the V12 crew. “Chọn đội 2025 · Hai ghe” selects a team for each lane and downloads that team's baked GLB. “Người trên ghe & khán giả” offers close views of seated/standing rowers, bow caller, coordinator, stern steering and the opposite bank. The existing grandstands, river, Khmer signs and bridges remain. “Đường đua & tùy chọn” provides start/midpoint/finish jumps, camera focus, low-power rendering, PNG and 10-second WebM exports. Enable “Bật tiếng cổ vũ” for the licensed recording. Game selection is available before starting and while paused. The root page keeps the reference dossier.

## Assets and effects

- `public/assets/human/makehuman-athlete-base.glb`: preserved MakeHuman/MPFB source, 53-bone rig, Innerscene CC0 release.
- `public/assets/human/makehuman-athlete.glb`: clothed and simplified derivative with continuous garment contours, 1.70 MB.
- `src/race/illustrated-ghe.mjs`: independently authored Canvas2D human, boat, river layers and pose curve. Its only bitmap is the owner's existing livery, `kbach-from-reference.webp`.
- `public/assets/ghe-ngo/sprites/`: preserved historical V4 WebP renders and phase/contact manifest. The current preview does not use them.
- `src/race/boat.mjs` and `design-profile.mjs`: boat, repository dimension constraints, owner-supplied graphic-reference shape/livery.
- `src/race/imported-athlete.mjs`: preserved body mesh/weights, separate garment surfaces/accessories, seated poses, fixed-length IK and finger closure.
- `src/race/river.mjs`: animated water and separate droplet/ripple pools triggered by each boat's paddle contact.
- `src/race/maspero-course.mjs`: two distinct covered stands, concrete embankments, dense crowds, townhouses, coconut trees, bridges and Khmer signs based on the owner's real VTV10 footage and real photographs. National flags are removed. Dimensions and placement are approximate.
- `src/race/crowd.mjs` and `public/assets/human/crowd-v10-*`: 16 MakeHuman CC0 spectator profiles, six watch/cheer/clap/wave activities, GPU interpolation and two mesh detail levels. See [crowd attribution](public/assets/crowd/ATTRIBUTION-v10.md).
- `src/race/race-crew.mjs`: loads V13 twice, retains role metadata and distinct team kit, instances moving accessories and adds wakes.
- `public/assets/ghe-ngo/ghe-ngo-crew-v13.glb`: 55 actors with explicit roles, shared mesh derivatives, Khmer back print, forward/backward caps and separate rowing/calling/coordination/steering motion. Editable crew: `assets/blender/crew-v13.blend`.
- **V9 GLB** contains the unchanged hull/livery, 55 rigged athletes, a shared CC0 skin/fabric PBR atlas and base/sprint clips (10.85 MB). The editable athlete is `assets/blender/athlete-v9.blend`; its Blender GLB export is `public/assets/human/athlete-rower-v9.glb`. The original V6 GLB remains unchanged. Water, crowd NPCs and buildings are realtime scene assets outside the boat GLB.
- `public/assets/fonts/`: self-hosted Noto Sans Khmer, SIL OFL 1.1. `public/assets/audio/`: CC0 real crowd recording and attribution; not a recording of this tournament or a Khmer chant.
- `public/assets/human/ATTRIBUTION.md`: source, license and changes. The previous Quaternius files remain for provenance; V4 does not load that character.

Source is on `main`; the static production build is on `gh-pages`. Animations are authored, not motion capture. The V10 rhythm game now loads the V13 role crew at `?demo=play`. Tap Chèo in the bright timing zone, choose recovery/steady/sprint, race an independent AI over 1,200 m, view results and replay. Space/Enter also activate the focused Chèo button. Three difficulties and browser-local winning records are included. Changing tabs pauses the race. See `docs/gameplay-v10.md` for the game rules and checks, and `docs/asset-pipeline-v9.md` / `docs/maspero-scene-v8.md` for the reference basis and remaining approximations. The game balance is authored, not an official race simulation. In particular, 30/4 bridge decoration uses a 2022 construction photograph, not a verified current finished elevation. Browser-size QA does not replace a physical tablet benchmark. V4–V9 remain documented historically.

## Rebuild assets

The configured free pipeline verifies the official CC0 skin download, rebuilds the crew and optionally renders it in the installed Blender. In PowerShell:

```powershell
npm ci
python -m pip install numpy pillow
powershell -NoProfile -File scripts/build-athlete-v9.ps1 -Render
```

For the current role crew, use `powershell -NoProfile -File scripts/build-role-crew.ps1`; add `-RebuildStudy` to rebuild the detailed athlete first. See `docs/crew-v11.md` for the current pipeline and checks. The commands above and `docs/asset-pipeline-v9.md` document the earlier V9 pipeline. The accepted hull geometry and embedded owner livery are preserved.

Run the dev server, open `/Tuk-Ngo/art-bake.html`, export both views, and download each view's three WebP pages plus its manifest. Assemble with `node scripts/assemble-sprites.mjs C:\path\to\downloads`. The bake page checks the rig before enabling export, clips geometry below the waterline and uses the same model/light/pose functions as the 3D source.

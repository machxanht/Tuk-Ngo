# Tuk-Ngo — hybrid ghe Ngo racing on Maspéro

The canonical tablet entry is **https://machxanht.github.io/Tuk-Ngo/**. The Việt/Khmer menu offers **solo practice**, **a selected AI opponent**, and a **61-team festival cup**. Hold Chèo (or Space) with default rowing assistance, steer with the left/right buttons (or A/D/arrows), conserve stamina and use Đạp in the final 250 m. Rowing/steering assistance can be switched off independently of AI difficulty. Practice has four milestones, no timeout and a saved personal best. The seeded knockout draw has three byes, two boats per heat, results, tie replay and a locally saved cup. Eight researched kits/liveries are retained; the other 53 are labelled game samples, all using the current shared athlete/hull meshes. This combined festival format is authored for the game, not the official divided 2025 draw. **Xem mô hình** retains the automatic two-boat 1,200 m trial, single-boat and athlete inspection, plus the existing eight-team cup. Two full riverbanks, the large right-bank stand, upstream bridge and central referee cargo boat remain. Actual blade contact creates droplets, foam and spray fans; final sprint/surge makes the water stronger. See [modes, controls and checks](docs/race-modes.md), [fidelity limits](docs/festival-game.md) and [course references](docs/rowing-course.md). Runtime modules use canonical unversioned names.

The race has three phases: explosive start (0–200 m), cruise (200–950 m), and final sprint (950–1,200 m). Chèo timing gives PERFECT / GOOD / BAD. PERFECT builds the charge for **Đạp**; its four-second final-phase surge requires 60% charge and 24% stamina. AI has its own cadence, stamina and charge. Team identity changes appearance only.

`npm run build` rebuilds the canonical browser bundles and React tools. `npm test` checks imports, protected shirt/rig hashes, asset transfers, race balance, cup progression and stroke timing. `npm run lint` checks active source and Vite configuration. Browser gates are `python scripts/check-game-ui.py` and `python scripts/check-runtime.py`, using the local static server on port 4255. See [architecture](docs/architecture.md), [module map](docs/module-map.json), and [cleanup evidence](CHANGELOG.md).

The material below retains the asset development history. The canonical commands and module names above describe the current runtime.

V29 adds twelve illustrated spectator pose pairs (24 total looks), fixes Kos Thum's blue interior, and links the existing 61-entry Việt/Khmer registration table into the same game. The eight 2025 team appearances and playable race remain on the stable URL below. See [V29 integration and limits](docs/hybrid-v29.md).

V31 adds localized athlete face/hair variants, current portable rower/caller GLBs, corrected cuff surface motion, and an eight-boat cup using the same touch race. [Implementation, checks and remaining asset work](docs/hybrid-v31.md) distinguish completed features from unverified visual fidelity. The tablet URL stays unchanged.

The previous **bright hybrid preview**, preserved at `assets/illustrated-v22/race.html`, uses actual 3D hull and skinned rowers on the approved painted festival. One renderer serves automatic racing, rhythm practice, close-athlete inspection and the V26 playable 1,200 m race. The tested existing gameplay model supplies timing, endurance, an independent opponent and finish results. Its preserved race entry is:

https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/race.html

Use **Đua nhanh → Bắt đầu → Chèo** in the bright timing zone. Recovery/steady/sprint, three difficulties, pause/resume, replay, local winning records, fullscreen controls, optional licensed crowd ambience and a low-power setting are available. V27 restores skin UVs/smooth normals; V28 adds the eight 2025 quarter-finalist hull/kit choices, with the player in the near lane. A short automatic race remains available for asset review. The artwork is compressed and approximate; exact 2025 tailoring and several hull/bib matches remain unresolved. See [current direction](public/assets/illustrated-v22/game-direction.md), [V26 gameplay](docs/hybrid-v26.md), [V27 skin](docs/hybrid-v27.md) and [V28 teams](docs/hybrid-v28.md).

The React/Vite/Three.js routes below remain historical 3D references, separate from the current primary preview. Their assets and working functionality are preserved.

Playable tablet race: https://machxanht.github.io/Tuk-Ngo/?demo=play

Two-boat scene inspection: https://machxanht.github.io/Tuk-Ngo/?demo=studio

Asset inspection: https://machxanht.github.io/Tuk-Ngo/?demo=art

V15 smooths the bow/stern upper curves without changing the occupied crew region and rebakes all8 team GLBs. Licensed OpenStreetMap bank/bridge coordinates define the focused C247–30/4 layout; banks/ground are continuous, inverted house roof slopes are repaired, and distant scenery is simpler. Main/opposite stands retain their real-video/photo basis. This is an authored game scene with a scaled layout, not exported Google3D mesh or a surveyed replica. See [V15 evidence, pipeline and limits](docs/course-hull-v15.md) and [map attribution](public/assets/maps/ATTRIBUTION.md). The studio starts unobstructed with one controls button.

V14 finished-paint detail remains from the owner's [Trường Dương channel](https://www.youtube.com/@mrchanhung72): Tum Núp's black-outlined scales, curled yellow crest/pink belly border, and Trà Tim's pink/gold flame flowers with cyan centres. The [kbach gallery](https://machxanht.github.io/Tuk-Ngo/assets/ghe-ngo/kbach-studies/index.html) links all eight race-team drawings to sources and includes separate Khleang/gold and Trà Tim/diagonal studies. [Channel review](docs/chanhung-finished-kbach-catalog.md) records title searches across1,779 Videos entries and inspected relevant frames, not an end-to-end watch of every upload. Other teams retain verified2025 sources. Hidden brushwork and some numbered hull bindings remain unverified.

V13's 55-person template remains: bow caller feet **inside the open hull**, eight seated pairs forward,17 standing pairs aft, caller/controller/three helmsmen, continuous garment bindings, tapered sleeves, mixed cap directions and Khmer back print **កូនខ្មែរ**. All eight downloadable GLBs retain two rowing clips; Tum Núp and Trà Tim are rebaked with the V14 paint. Sixteen spectator profiles and existing course/game remain. [V13](docs/crew-v13.md), [2025 results](docs/top-eight-2025-results.md), [numbered race binding](docs/top-eight-2025-hull-binding-followup.md) and [Om/Satharam detail](docs/top-eight-2025-om-satharam-followup.md) record the previous evidence and limits. The same three links above are retained.

## Run and build

```sh
npm ci
npm run dev
npm run lint
npm test
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

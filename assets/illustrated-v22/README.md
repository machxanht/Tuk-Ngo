# Ghe Ngo hybrid V26

Stable tablet/game URL: https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/

The canonical project root opens this same version. The shared visual direction is [game-direction.md](game-direction.md): bright painted festival banks, real 3D hull/athletes, fixed elevated bank view and right-to-left racing. Explicit legacy `demo` URLs remain references.

## Play and inspect

- **Đua nhanh**: choose a difficulty, start, and tap Chèo when the marker enters the bright timing zone. Green is the player crew; amber is an illustrative opponent. Recovery/steady/sprint change cadence and endurance. The existing tested rules model runs a 1,200 m race with an independent AI, actual bow crossings, results and replay.
- **Đua tự động**: an approximately 46-second two-boat start-to-finish asset demonstration, with its own countdown and late sprint.
- **Tập chèo**: one-boat timing practice at a chosen cadence.
- **VĐV cận**: inspect seated/standing/caller/controller/helm motion, jersey colours and any point in the continuous cycle. This tool is hidden during a player race.

Stroke controls sit outside the picture, including in fullscreen. Short landscape screens place them beside the scene. Pause/resume freezes the player race; switching away from the page pauses it automatically. Winning records are local to this browser, with an in-memory fallback if storage is unavailable; they do not sync between devices. Optional licensed crowd ambience starts only after a sound-button gesture. Chế độ nhẹ lowers 3D resolution and the draw target to 20 fps.

## Assets and animation

Eight shared pose rigs animate 55 athletes per boat: eight seated pairs, seventeen standing pairs, caller, controller and three helmsmen. The preserved CC0 anatomical mesh has regenerated sewn vest/shorts, continuous bindings, fitted forward/backward caps, fingers and eyes. The 97-sample authored clips interpolate continuously. Hands grip the paddle, feet sit on real internal supports and the hull occludes the legs. Twelve modest geometric head/skin-tone variants derive from one body, not independently sculpted or scanned identities.

The source hull retains the accepted 3D shape. Runtime UVs sample the approved painted hull illustration. The raw downloadable hull GLB retains its original source texture; its in-game paint is applied by the renderer. `hybrid-v25-manifest.json` lists the unchanged ten GLBs totaling 5,330,236 bytes. Boat colours are illustrative, not verified assignments to historical teams.

The scene contains 1,949 placed spectators, 64 walkers, 16 vehicles and ten stalls, plus two stands and one visible upstream bridge. These are authored placement counts. Twelve painted spectator identities have two source poses each, independent cheer windows and gentle body motion around fixed foot anchors. Walking still uses four painted steps; riders are painted into the moving vehicle sprites. Water has coherent drifting ripple/glint layers and paddle-contact droplets, denser at sprint cadence.

Approved raster sources, prompts, atlas anchors, hashes and optional PNG downloads remain in this folder. Four-pose rower PNGs are style references, not the live athlete animation. The art is original generated illustration, not evidence of historical kit or exact Maspéro architecture. Khmer banners use the bundled Noto Sans Khmer font; no national flags are present. Wording has not received a native Khmer editorial review. See [model/audio attribution](HYBRID-ATTRIBUTION.md) and [font attribution](FONT-ATTRIBUTION.md). Audio is a CC0 concert crowd recording, not Khmer chants or a tournament recording.

## Rebuild and checks

The source remains in the existing repository. `src/race/gameplay.mjs` supplies the same tested game rules as the legacy 3D version. `src/race/hybrid-boats-v25.mjs` supplies shared geometry/depth/animation; `preview.js`, `quick-race-v26.js`, `race-demo.js` and `festival-scene.js` compose the game and festival. Run `node scripts/build-preview-v26.mjs` after changing the game wrapper or hybrid renderer. The V25 Blender/packing scripts rebuild the geometry; rebuild V26 browser bundles after running the V25 packer.

Affected browser checks cover actual buttons, repeat-input prevention, pause, endurance, independent AI, fullscreen, replay, records after reload, win/DNF results, rig continuity/grip contact, frame changes and layouts. A real browser-clock automated-button race finished with 275 perfect strokes and a 3:10.60 player time; that is a test run, not a human playtest. Detailed current evidence is in `docs/hybrid-v26.md` in the repository. Physical tablet performance has not been measured.

The publisher updates this same folder and canonical root on the latest Pages tree, preserving legacy bundles and unrelated working changes. The playable quick race is implemented. A multi-round tournament, fully rigged close crowds, uniquely sculpted faces, complete verified 2025 hybrid team kits/kbach and a surveyed town reconstruction remain unfinished.

# Race architecture

The project retains two browser paths. `src/main.tsx` sends the default and `?demo=2d` entry to `public/assets/illustrated-v22/`; other demo parameters mount `src/App.tsx` and the React tools. The static illustrated page loads the `game-engine.js` and `hybrid-boats.js` bundles produced by `scripts/build-preview.mjs`. Their authored roots are `src/race/game-engine.mjs` and `src/race/hybrid-boats.mjs`.

Module filenames in `src/race` are canonical and have no version suffix. Versioned asset names remain source identifiers for the approved GLB, JSON, images and existing public path. Rebuild the existing bundles after source changes; do not create a parallel version of a module or browser entry.

```mermaid
flowchart TD
  main[main.tsx] --> app[App.tsx: React tools]
  main --> static[assets/illustrated-v22/index.html]
  app --> tablet[TabletRaceDemo]
  app --> sample[CoherentSample / race-sample]
  app --> art[ArtPreview / art-preview]
  tablet --> river[river / maspero-course]
  tablet --> crew[race-crew / team-livery]
  sample --> river
  sample --> crowd[crowd / traffic]
  art --> river
  static --> engine[game-engine bundle]
  static --> hybrid[hybrid-boats bundle]
  engine --> gameplay[gameplay]
  engine --> cup[tournament]
  cup --> teams[teams]
  crew --> teams
  hybrid --> style[team-style / teams]
  hybrid --> shirt[athlete-shirt]
  hybrid --> faces[athlete-faces]
  hybrid --> animation[rowing-effort / crew-animation]
  hybrid --> transfer[asset-transfer]
```

## Canonical module map

| Responsibility | Authored modules and callers |
| --- | --- |
| Rules and cup | `game-engine` exposes `TukNgoGameRules` and `TukNgoTournament`; `gameplay` and `tournament` consume the existing eight-team roster in `teams`. Cup behavior retains quarterfinals, semifinals and final, together with ties, retry and persisted-history validation. |
| Illustrated athletes | `hybrid-boats` loads the athlete/hull sources, eight role motions and connected shirt; `team-style`, `athlete-faces` and `rowing-effort` supply appearance and motion. |
| Pose reuse | `crew-animation` owns per-view transform snapshots, update/restore counters and `clear()`. The caller supplies `frameId`, `viewKey`, distance and nearest status. Far views can reuse alternate frames; the nearest view continues updating. |
| Other boat paths | `race-crew`, `team-livery`, `boat`, `imported-athlete` and `design-profile` retain React sample and authoring functionality. |
| Course and festival | `river`, `maspero-course`, `maspero-layout`, `river-bank`, `festival-crowd`, `festival-street`, `festival-traffic`, `bank-materials` and `crowd-audio` retain the course, surroundings and audio paths. |
| Crowd compatibility | `crowd` preserves both `loadCrowdAssets`/`buildCrowd` with identity/gesture helpers and `createCoherentNpcs`. |
| Traffic compatibility | `traffic` preserves both `trafficRoad`/`trafficPose`/`buildTraffic` and `buildCoherentVehicles`. |
| Preview tools | `art-preview`, `athlete-study-preview` and `illustrated-ghe` support React artwork previews; `bake-sprites` is the separate `art-bake.html` entry. |

## Asset and renderer lifecycle

`assetBytes(url, {attempts, stallMs, onRetry, fetcher})` caches a Promise per normalized URL and fetcher. Concurrent consumers deduplicate the network work; each receives its own `ArrayBuffer`. At most three transfer attempts run concurrently. `stallMs` measures inactivity while waiting for headers or body bytes, so a progressing download can run longer overall. GLB magic, version and declared length are checked, and JSON must parse. Transient HTTP errors, corrupt responses and stalled transfers have bounded retries; failed cache entries are removed for manual retry.

`releaseAssetBytes(url, {fetcher})` releases an individual raw asset; `clearAssetBytesCache({fetcher})` clears a fetcher's assets, or all assets when omitted. Releasing an in-flight entry preserves deduplication until it settles and then removes the completed bytes. The hybrid renderer's `dispose()` releases its transfer entries along with animation snapshots, mixers, skeletons, geometry, materials, textures and renderer resources. Team appearance caches and geometry variants remain shared within their owning renderer. `getDrawStats()` exposes pose update/restore counts, geometry/material/texture counts and draw-call/triangle information for measured performance checks.

The connected shirt module is required to remain byte-identical to the approved original `athlete-shirt-v32.mjs`. Its runtime JSON retains 533 vertices, 896 triangles, one component and four boundary loops. The portable `docs/runtime-invariants.json` stores the approved SHA256 values copied from the original baseline for exactly twelve files: the canonical shirt module, runtime shirt JSON, athlete body GLB, hull GLB and all eight role-motion GLBs. The gate compares every source byte hash with this manifest. Changing the manifest requires an intentional review of the preserved artwork; rebuilding output must not update it automatically.

## Dependency and preservation gate

Run `node scripts/check-architecture.mjs` from the project. It uses the already installed TypeScript parser to resolve static import/export dependencies and literal dynamic imports in `src` and `scripts`, and module scripts in authored root/public HTML. It resolves relative paths against the actual file directory, `/src` and `/scripts` against the project root, public URLs against `public`, and historical `/Tuk-Ngo/` HTML URLs against that deployment prefix. External package imports are not copied into the project graph.

The command checks unresolved local references, versioned race filenames, both merged crowd/traffic APIs, exact connected-shirt source bytes, runtime index validity and measured boundary loops, and all twelve preserved source hashes. It reports modules outside the runtime roots and modules with no incoming authored imports. Add `--graph` to print the dependency graph rooted in `main.tsx`, `App.tsx`, `game-engine.mjs` and `hybrid-boats.mjs`.

The default check needs only this repository and installed project dependencies; it runs on other machines and CI without the external authoring workspace. Optionally set `UM_TUK_ARCHITECTURE_BASELINE` to an external approved baseline directory to additionally compare the shirt module directly with `originals/src/race/athlete-shirt-v32.mjs`. That external directory is never required for the default gate.

The current inventory has **no truly unreferenced race module** across the authored module/HTML imports. Four modules lie outside the selected runtime roots but still have tool callers:

| Module | Preserved caller |
| --- | --- |
| `athlete-identity.mjs` | `scripts/export-festival-crew-v21.html` |
| `athlete-kit.mjs` | `scripts/export-festival-crew-v21.html` |
| `maspero-buildings.mjs` | `scripts/check-course-v16.mjs`, `scripts/check-world-v17.mjs` |
| `bake-sprites.mjs` | root `art-bake.html` |

This gate checks source dependencies and preservation invariants. It does not establish that a generated bundle is fresh, a network service is working, or a renderer is visually correct. Build, affected behavior tests and direct browser inspection remain separate acceptance evidence.


## Online runtime

`server/online.mjs` is a separate Worker entry, configured by `wrangler.jsonc`. A Durable Object owns each live race; per-course directory objects own queues and durable Elo tables. The browser's canonical `online-client.mjs` adapter forwards offline methods to the existing game and accepts online snapshots only from the authenticated socket. `online-rules.mjs` reuses the original player physics for both human lanes. No 3D asset generation or schema migration of the offline cup is involved. See [online lifecycle and external verification](online.md).

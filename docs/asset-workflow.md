# Blender asset workflow

## Current delivered milestone

The first asset milestone is an editable single athlete, an animated standard
GLB, and the same authored equipment in the existing race. This milestone does
not rebuild the river banks, architecture, crowd or the whole game into a new
3D scene. The existing illustrated race still composites live Three.js boat
renders over the illustrated festival. Its cup, controls and URL are retained.

- Editable source: `art/athlete/athlete-master.blend`, with packed textures.
- Downloadable one-athlete proof: `public/assets/athlete-master/athlete-master.glb`.
- Runtime equipment: `public/assets/athlete-master/athlete-details.glb`.
- Race integration: `src/race/hybrid-boats.mjs`.
- Collar appearance: `src/race/athlete-finish.mjs`.
- Standard GLB inspection: the existing `?demo=art` mode; the game asset gallery
  links to this mode. The existing tablet game URL stays unchanged.

The details contain a sewn-panel baseball cap with curved brim/rear strap,
scalp-fitted short hair, and a rounded wooden paddle. Cap direction is forward
in nine of the twelve appearance variants and backward in three. Runtime hair
length/wave and facial geometry vary within the existing twelve cached
identities. The new details merge into the existing body cache and paddle batch.
They do not introduce a new mesh draw for each athlete accessory.

The source MakeHuman body and the eight original motion files are retained.
This is an authored character, not a scan or likeness of a named athlete. Motion
remains authored animation, not motion capture. The shirt geometry and endpoint
skinning module remain byte-identical to the protected manifest. The new finish
only adds a distance attribute and replaces the collar's colour mask.

## Real references and provenance

- [Thanh Niên: Tum Núp wins men's and women's races, 15 November 2024](https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm):
  white baseball caps, team clothing and photographed crew proportions. Existing
  local references are recorded in `asset-studio/athlete-real-references/sources.json`
  outside this repository. These photographs are reference, not game textures.
- [Báo Sóc Trăng: Tum Núp race video](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/):
  existing local frame sequences for seated/standing rowing and crew roles.
- [User-supplied tournament](https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s)
  and [Mr Chấn Hưng](https://www.youtube.com/@mrchanhung72) remain course and
  boat-decoration references for subsequent environment work. This delivery
  does not claim a new complete analysis of their full video catalog.
- The body/skin/rig retain the existing MakeHuman CC0 provenance in
  `public/assets/human/ATTRIBUTION.md`. Equipment geometry is authored for this
  project; the hair shell is fitted from that existing anatomical surface.
- The Khmer shirt print is the existing owner-requested `កូនខ្មែរ`, rasterized
  with the existing Noto Sans Khmer font. It is not asserted to reproduce a
  historical sponsor print. No generated photograph is used as evidence.

## Reproducible authoring

Run `scripts/author-athlete.py` in Blender to author equipment and recreate the
editable source around the preserved anatomical reference. Rasterize the
existing shirt print into `public/assets/athlete-master/kit-print.png` (the
delivered PNG is included), then run `scripts/assemble-athlete.py` in Blender.
Both scripts resolve the repository from their own location under normal
Blender CLI execution; the current local MCP execution also has a workspace
fallback. Neither script overwrites an approved body, hull, motion or shirt file.

The local authoring was executed through the reviewed community
[MCP for Blender](https://github.com/ahujasid/mcp-for-blender), checkout
`7a0373ec9199183cb460068c4f96aed9c579fb4f`, in `E:/AI/Um Tuk/tools/blender-mcp`.
The installed bridge was queried with `get_scene_info` and used with
`execute_blender_code` through a standard MCP client. The local add-on listens
on localhost; telemetry is disabled and external asset/generation integrations
are disabled. The existing Codex configuration gained only the `blender` server
entry pointing to that local executable. No paid generation service or login
was used. The current session can call it through the local MCP client; the
registered tools are available to a newly loaded Codex MCP session.

The standalone GLB samples the exact shirt endpoint calculation into 49 morph
targets over one stroke; runtime still uses the original exact shader. Body,
cloth and paddle channels are combined into one GLB animation, so standard
viewers cannot play only the body. This sampled export is a viewing artifact;
it is not a replacement for the eight protected runtime rigs. Its texture has
coherent UV islands and padding to prevent collar/letter mip bleeding.

## Acceptance checks

- `npm run lint`, `npm test`, `npm run build`.
- `npx --no-install gltf-transform validate public/assets/athlete-master/athlete-details.glb`.
- `npx --no-install gltf-transform validate public/assets/athlete-master/athlete-master.glb`.
- `python scripts/check-athlete-browser.py`: real Edge renderer, roles and
  phase samples, paddle lengths, measured sole clearance, inspection angles,
  tablet viewport layouts, and the exported GLB in the existing 3D viewer.
  Serve the existing game assets on port 4256 and the production Vite preview
  on port 4173; use `--url`/`--studio` to select other servers. `--record`
  captures the actual 10-second 3D viewer output.
- `python scripts/check-runtime.py --url http://127.0.0.1:4256/assets/illustrated-v22/ --out docs/qa/athlete-master/runtime`:
  existing shared-pose/cache/disposal regression gate.

Visual evidence is stored under `docs/qa/athlete-master`. Physical tablet frame
rate is not established by headless Edge or viewport emulation. A visual quality
percentage is not measured. This proof must be assessed before extending the
style to all river assets. Remaining environment work is the shared short
Maspéro reach, stands/bridge/streets, crowd/traffic variety and measured device
budgets; these are not claimed complete by the athlete milestone.

## Measured local result

The browser sampled twelve stroke phases for all eight role masters. The sole
clearance stayed at approximately 2 mm; palm-to-grip marker distance stayed
below 1 mm. These are sampled geometric checks, not a claim of scanned anatomy.
Paddles measured 1.52 m seated, 1.75 m standing and 4.20 m steering. The exported
GLB's wrist travelled 0.151 m in the animation check and its cloth morph weights
changed, confirming both tracks actually animate in the standard viewer.

Both new GLBs pass glTF validation without errors, warnings, infos or hints.
The inspection hull is cropped and batched at load time to about 21,919
triangles/19 draws including the athlete, rather than submitting the full
30 m hull behind clip planes. The game renderer retained eight masters, exact
far-pose restoration, 90 pose evaluations/30 frame reuses over 120 boat renders,
and zero retained GPU geometries/textures after disposal. Edge headless measured
31.6 FPS on this host; it does not establish physical tablet performance or a
speedup over the previous host-limited measurement.

## Public verification

Source commit `5c015960df8faf4679e71dbf582ea8827178d98b` was pushed to `main`.
Pages commit `c0ecfaa84f7f9a672900741cc1b9465f77f70be7` deployed successfully
in GitHub Actions run `38961184883`. The existing tablet entry remains
`https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/`.

The same athlete browser gate was run against that public game and its existing
`?demo=art` inspection mode. Roles, grip/sole samples, desktop/tablet layouts and
actual body/cloth animation passed without browser errors. Fourteen downloaded
runtime assets matched the local SHA256 bytes, including both new GLBs and all
eleven protected public source files. Evidence is under
`docs/qa/athlete-master/public`. The source-only protected shirt module remains
covered by the local invariant gate.

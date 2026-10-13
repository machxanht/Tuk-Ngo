# Additional illustrated spectators V29

This bounded update changes `public/assets/illustrated-v22/festival-scene.js`, adds `festival-crowd-atlas-v29.json`, copies the supplied `spectators-extra-12-2poses-v29.png`, and adds `scripts/check-crowd-v29.py`. Preview, scene configuration, versioning, teams, hull/athlete renderer and publishing are parent-owned.

## Source and extraction

The supplied PNG was inspected directly and copied **byte-identically**, without background removal, alpha normalization, cropping/re-encoding or pixel edits. SHA256 remains `a146867736cf125dbd19e8f47778e6e988962de84363d2bc8cc3a90fefef3b0f`. It is 1024×1536 RGBA, alpha0..254. Hidden brown RGB under transparent pixels is intentional; browser Canvas alpha draws correctly. Parent owns the exact generation prompt/provenance record.

Although the picture contains four columns and six figure rows, its painted row boundaries are not uniform256px. For example, first-row feet reach approximately y288 and second-row feet y578. Uniform square extraction would cut legs and sample another figure. Connected-component analysis of alpha>32 found exactly24 complete figures, six per column. Metadata uses padded per-figure bounds, alpha-weighted foot centers and a foot baseline. Ten cells whose padded bounds intersect neighboring figures use expanded component row-interval clips when the renderer caches the sprite. This prevents neighboring shoe/finger fragments appearing while retaining the original PNG. It is renderer atlas slicing, not a new bitmap asset.

The source has12 illustrated identity pairs: six front-facing and six rear-facing. Styling includes masculine/feminine characters, floral/check shirts, gray hair, cap/straw hat, bags, younger figures and two children. Local new IDs5 and10 use relative scale.75. Phone/clap pairs are very similar; there is no claim of12 new motions or new rigs. Across both atlases there are24 source identities with two source poses each, not48 unique animations.

## Integration

The original placement generation and random sequence remain unchanged. After placements exist, an independent salted hash of ID and coordinates chooses a source identity. The selection does not use row number, color sequence or ID modulo pattern.

- Far bank, main stand and bridge pool: old IDs0..7 plus new global IDs12..17 (**8 old +6 new**).
- Near bank and near stand pool: old IDs8..11 plus new global IDs18..23 (**4 old +6 new**).
- Vendors and stall patrons use the front-facing pool; they retain the existing clipping/counter layout.

Raster cache keys include atlas, local identity, pose and quantized height. New sprites load from the supplied PNG directly; existing atlas runtime files are unchanged. Only one source pose is drawn per person at a time. Existing V26 body shear/breathing, irregular activity windows and `setActivity` API remain unchanged. Paired reference height and individual foot anchors keep both poses aligned. `identityAt(person)` and `stats.identityMix` expose the selection for QA.

## Evidence and checks

`python scripts/check-crowd-v29.py --build-metadata` reproduces the byte-copy and metadata analysis. Run without that flag against the local preview for browser checks. It exposes the actual private raster cache only in the test browser response, then composes galleries from those cached images; it does not replace the rendering implementation or write preview files.

External evidence: `E:/AI/Um Tuk/asset-studio/festival-crowd-v29/qa/`:

- `sprites-extra-110.png` and `sprites-extra-220.png`: all24 new cells rendered through the actual cache, with foot baselines.
- `desktop-time2.png`, `desktop-time6.png`, `tablet-time2.png`, `tablet-time6.png`: actual integrated scene captures.
- `report.json`: source identity distribution, placement/motion preservation, anchor and browser checks.

Both galleries and desktop/tablet scene captures were inspected. In particular, the rear floral woman's feet and the following raised-arm red-cap sprite are separated cleanly; no shoe/finger fragment from another figure is visible. Near-bank profiles read as varied rear views rather than repeated white caps. Parent independently reviewed the220px gallery and tablet scene and accepted their completeness/tone.

The generated placement records remain byte-for-byte equal to HEAD: **1,949 spectators,64 walkers,16 vehicles,10 stalls**, SHA256 `eafed1d57e81420e10816d4d4bf726f7a764a9be7d70355f0bcc0b798fd2479f`. Motion outputs at t0,2,6,13 for every spectator at activity.4 also matched V26 exactly. All24 source IDs occur in the scene; the far bank uses all14 eligible IDs and near bank all10. Among1,907 adjacent placement pairs,140 repeated an identity (**7.34%**), consistent with independently mixed pools rather than uniform rows.

All instrumented Canvas draw-transform arguments were finite. Metadata/cache foot-anchor alignment error was0 for both poses at110px and220px nominal height. Actual Edge headless D3D11 checks reported **zero page errors**. With native Canvas methods restored, five-second measurements were **29.96FPS desktop1440×1080** and **29.72FPS tablet-sized1024×768**, near the existing30FPS cap. These are desktop GPU viewport measurements, not physical tablet guarantees. JavaScript syntax check passed.

Limits: some source pairs have minimal pose differences; arms are painted pose cuts with V26 whole-sprite sway, not articulated joints. Two atlases do not create new procedural facial expressions. Source profiles necessarily repeat within the dense crowd. No additional gameplay/team/renderer regression gate, commits or publishing were performed by this agent.

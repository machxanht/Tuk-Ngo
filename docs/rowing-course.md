# Current 3D crews and 1,200 m trial

The canonical tablet URL is https://machxanht.github.io/Tuk-Ngo/. The root opens two current 54-person crews in a single WebGL scene, with independent eight-role animation sets. The automatic trial has a three-second start, distance-dependent start/cruise/sprint cadence, separate finish crossings/times, pause, restart and optional 3× viewing. This is a simulation for inspecting the current assets, not a recording or a reconstruction of the official result. The existing eight-boat cup remains available from its existing link.

## Arm contact diagnosis and correction

The previous placement separated rower roots by 48 cm, but the inboard elbow pole still flared into the paired rower. At approximately 42.7% of the stroke the two elbow centres were only 8.28 cm apart. Moving the roots again would not address that arm trajectory and would push the crew farther outside the narrow hull.

The inboard arm now folds towards its own paddle with an outboard elbow pole. The same two-hand shaft targets and reach limits are retained. Actual skinned upper/lower-arm vertices were sampled at 96 phases, for both seated and half-kneeling pairs on both current boats. The minimum empty lateral gap between arm surfaces is 8.43 cm; minimum elbow-centre distance is 47.38 cm. This measures the arm surfaces, not just bone/root placement. Exact sampled values are in `qa/athlete-master/course/checks.json`.

The canonical motion bundle and editable Blender master/standalone GLB were rebuilt from these trajectories. The original eight motion files, original body/hull files and protected shirt module remain unchanged. The shirt remains 533 vertices, 896 triangles and four boundary loops. Existing sole/thwart/knee, paddle reach, two-hand grip and standalone-versus-runtime checks still apply.

Moving boats exposed another attachment issue: paddle instance matrices contained world transforms, then inherited the moving boat's transform again. They now store boat-local transforms. Browser checks compare the actual instanced paddle mesh against its animated attachment on both translated, reversed boats.

## Real visual references

- [Báo Sóc Trăng — Háo hức chờ ngày khai hội, Thạch Pích, 13 November 2024](https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/hao-huc-cho-ngay-khai-hoi-67c01d9/). The front and interior photographs were fetched and visually inspected for this change. The front photograph has a 2023 event banner: it is an archival architectural reference, not a newly captured 2025 photograph. Observed features are the long pale grey-green shallow pitched sheet roof, white concrete base/pillars, open steel webs, blue side seats, central white chair covers with red sashes, aisle partitions, low officials' building and separate central ceremony canopy. These features guide the enlarged right-bank model.
- [VTV — Giải Đua ghe Ngo Cần Thơ 2025 khép lại…, Ngọc Hân, 5 November 2025](https://vtv.vn/giai-dua-ghe-ngo-can-tho-2025-khep-lai-voi-nhung-chien-thang-ngoan-muc-100251105191556441.htm). The original crowd photograph ending `chung-ket-12-15577412051447916204393.jpg` was fetched and visually inspected: dense mixed civilian clothing, hats, umbrellas, trees and metal-roof frontage behind the retaining wall.
- [DNTT — Kịch tính màn Đua ghe Ngo trên dòng sông Maspéro, 4 November 2025](https://doanhnghieptiepthi.vn/kich-tinh-man-dua-ghe-ngo-tren-dong-song-maspero-161251104155115212.htm). The original `dsc00246` photograph was fetched and visually inspected. It shows the crowded ordinary bank, tin roofs, a blue gabled warehouse/shop frontage, trees, electrical cables and broad low banners. It does not establish the main grandstand's dimensions.
- [Official 2025 tournament plan](https://duaghengo.cantho.gov.vn/uploads/filedinhkem/nvchon_04%20KH-BTC%2009102025%20%28FINAL%29.pdf) specifies the men's 1,200 m distance. Race units and bow crossings use that full distance.
- The owner's [full tournament video](https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s) and bridge references previously inspected are recorded in `maspero-scene-v8.md`. The existing C247 teal portal and 30/4 silver-arch models are retained. This run could not reopen the YouTube video through the web fetcher; the new stand/bank work uses the actual photographs above. Current finished bridge decoration is still approximate.

No generated images were used as evidence. Press photographs are references only; their pixels and audio are not shipped in the scene. World banners use Khmer at the owner's request, so their wording deliberately differs from photographed Vietnamese banners. No national flags are placed.

## Course and fidelity limits

The former bounded inspection reach has been replaced at the root by the existing canonical full-course environment, populated with current compact NPC assets. It contains continuous quays, promenades and roads along the 1,200 m trial; 55,905 placed spectators/sidewalk patrons, 11 animated civilian models, 384 upper/bottom/shoe combinations, 432 detailed frontage lots across five architectural families, five tree silhouettes, food stalls and moving cars, pickups, scooters, motorcycles and bicycles. Distance budgets select detail and visible population; all 55,905 are not drawn simultaneously.

The main grandstand is authored at 128 m long, eight tiers, with an approximately 16 m ridge, shallow double-pitch roof, structural webs, covered red/white central seats, blue side seats, aisle walls and a separate low centre platform. The roof's clearance above the upper seating was increased to follow the open-frame proportions visible in the reference photographs. It is on the right in the race direction. The opposite covered platform remains lower and structurally distinct. These dimensions, numbers of bays/seats, heights, city facades, bridge heights and positions are estimates, not surveyed measurements or a claim of exact photographic matching.

The inherited bank outline/bridge angles use licensed [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL, from `public/assets/maps/maspero-osm-layout.json`. Its mapped focus is around the bridges; the upstream continuation needed for the full race is an authored approximation. This is not Google photogrammetry or a surveyed digital twin. The older `race-course/2025-race-course-reference.md` has conflicting orientation and unsupported “CONFIRMED” geometric labels; those labels are not adopted here.

## Verification

Run the proportionate gates:

    npm run lint
    npm test
    npm run build
    python scripts/check-course-browser.py
    python scripts/check-athlete-browser.py --out docs/qa/athlete-master/boat
    python scripts/check-game-ui.py --url http://127.0.0.1:4173/Tuk-Ngo/assets/illustrated-v22/race.html --viewport 1024x768 --out docs/qa/athlete-master/cup

The course browser gate loads the production build, runs real requestAnimationFrame movement plus the complete same race integrator, samples actual skinned arm clearance and moving paddle instances, checks both 1,200 m bow crossings, pause/restart/touch controls, both independent animation clocks, the wide course render and three tablet viewport layouts. It captures the actual scene and checks browser errors. Resource accounting verifies all application geometry/textures are disposed; Three r185 retains its own globally cached 16×16 `DFG_LUT` (see its local `DFGLUTData.js`). This renderer-owned table is recorded explicitly rather than misreported as an application leak or zero total textures.

Desktop Edge tests and screenshots do not establish performance on the owner's physical tablet. Public deployment evidence is recorded only after GitHub Pages succeeds and the shipped scene passes the same public checks.

Verified deployment: runtime source `69ea1d0`, Pages `a9cc91249bf271720eb40e61928e83810d87738f`, [successful Pages run](https://github.com/machxanht/Tuk-Ngo/actions/runs/39023994354). `qa/athlete-master/public-course/` contains the actual public browser report/screenshots, 17 matching asset hashes and canonical/legacy route responses. The public run also completed 120 wall-clock seconds of continuous 3× playback through both finish crossings; the camera-to-target offset stayed stable, both boats reached exactly 1,200 m, and no browser errors were recorded. Three touch-capable tablet viewports passed without scene/control overlap. The local standalone GLB, original eight-role/geometry invariants and three-round cup/browser cache checks passed separately.

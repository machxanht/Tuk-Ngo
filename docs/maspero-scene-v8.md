# Maspéro V8 — spectators, two banks, Khmer signs and sprint water

Owner request: human NPC crowds that move and cheer, remove Vietnamese flags, match the supplied real tournament video especially both stands and bridges, Khmer world banners, visibly moving river and stronger sprint stroke/spray. Existing boat shape and gameplay architecture are retained. No generated-image references are used.

## Real references actually inspected

- [Owner's VTV10 full 2025 tournament video](https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s): 00:00/00:10 show the distinct large VIP roof and opposite low single-pitch canopy; 04:57 shows seated spectators; 05:27 shows bank railing/crowds; 19:36 shows an active close crew and contact spray; 1:28:58–1:32 show dense banks, houses, trees, umbrellas, muddy water and crews. These support visual character, not surveyed measurements or motion capture.
- [C247 actual photograph, 2022 exhibition](https://mientay.giadinhonline.vn/do-thi-soc-trang-xua-va-nay-qua-anh-d8340.html): the image named `img_20220417_202023-1437.jpg` was opened and inspected. Teal curved portal decoration, high transverse members and slim silver rods are the reference for the revised C247 model.
- Cầu Cao/30/4 was located on [Google Maps](https://www.google.com/maps/search/C%E1%BA%A7u+30%2F4+S%C3%B3c+Tr%C4%83ng/), at the returned Cầu Cao place. Its January 2022 photograph by THẮNG NGUYỄN TV was opened and visually inspected: concrete deck/piers, arched silver lattice frames being installed, neighbouring townhouses and tall trees. V8 models these broad structural features. **This is a construction photograph: finished cladding, exact geometry and current colour are still unverified.** The unnamed rainbow-lit press photograph was not assumed to be 30/4.
- [Official tournament plan](https://duaghengo.cantho.gov.vn/uploads/filedinhkem/nvchon_2025926%20KH%20le%20hoi%20oc%20om%20boc.pdf) identifies the Maspéro event section between C247 (cầu Quay) and 30/4 (cầu Cao). Local scene coordinates are authored game coordinates, not GIS orientation.
- Native Khmer festival/boat terminology was checked against [Báo Cần Thơ Khmer](https://baocantho.com.vn/khmer/detail-a177897.html), with original `អកអំបុក` / `ប្រណាំងទូក-ង` terms. World banners, shop welcomes, referee/start/finish signs and numeric distance markers use Khmer with self-hosted Noto Sans Khmer. UI controls remain Vietnamese. Authored wording has not received a native-speaker editorial review.
- Earlier visually inspected [2024 main-stand photos](https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/hao-huc-cho-ngay-khai-hoi-67c01d9/) support concrete tiers, double-pitch roof/bracing, red/white VIP seats and blue side seats; see the preserved V7 document.

Press photographs and YouTube frames are reference evidence only; no pixels/audio were copied from them into the game. The accepted owner-video hull livery remains embedded unchanged.

## Implemented assets and behaviour

- 12,213 authored NPC placements along both banks and in two stands. Anatomical MakeHuman CC0 body, trousers/shirt/hair regions, hats, variation of height/width/colour and phase. Standing cheering, standing clapping and seated clapping cycles are baked into two vertex-animation levels: 1,800 and 314 triangles. GPU interpolation shares poses across instances and selects detail by camera distance.
- Real CC0 crowd recording, explicitly enabled by a user gesture and paused with the scene. Higher cadence/near-finish increases volume. This is benfree's generic crowd recording, **not Khmer speech or this tournament's audio**; see `public/assets/audio/ATTRIBUTION.md`.
- Vietnamese national flags and star meshes removed. Two distinct roofs rather than mirrored stands: tall concrete VIP tiers/double-pitch roof, and opposite long low single-pitch platform. Dense frontage, umbrellas, metal railing, townhouses/porches/balconies/metal roofs, irregular broadleaf crowns, feathered coconut fronds and drifting water plants.
- All world signs/banners are Khmer. Canvas texture proportions match the sign geometry; Khmer glyph shaping loads the bundled licensed font before scene construction.
- Flowing sediment noise, irregular moving water normals, low waves and drifting plants. Separate contact droplets/rings for each boat. Cadence 80 is the preserved base; 81–105 increases strength continuously. Full sprint adds 25% torso lean amplitude, 19% paddle sweep amplitude, deeper drive, phase-specific hand correction and more/wider/higher spray.
- Separate `ghe-ngo-crew-v8.glb` has 55 athletes plus base/sprint clips. Original hull position/normal/UV/index and original WebP bytes match V6 exactly. V6 inspection and old asset remain available. Seven camera views include crowd and each bridge; touch/orbit controls, PNG and 10-second WebM exports remain.

## Limits and checks

This is a scene/rowing trial, not a finished racing game or a surveyed digital twin. Houses, tree species, placements, dimensions, finish/start layout and overall geography remain approximations. Bridge 30/4's finished decoration needs a recent close reference before claiming a near-identical replica. Two stands follow observed silhouettes and components, not exact measured drawings. The amber crew is a fictional test team.

Checks include the actual persisted V8 GLB at 161 phases and base/half/full sprint blends; maximum hand-grip error below 1 mm, elbow range about 61.6–158.3 degrees and no pose/clearance errors. Two-crew consolidation preserves sampled skin positions and jersey colours. Hull preservation is a binary comparison, not a render-only assumption. See `docs/qa/baked-rig-v8.json`, `two-crews-v8.json`, `hull-preservation-v8.json`, `rig-sprint-v8.json` and `crowd-bake-v8.json`.

Actual browser captures and responsive/audio/spray checks accompany these reports. Reported browser FPS depends on this PC/browser and is not a physical tablet benchmark. The existing large app bundle and substantial crew triangle count remain limitations on older tablets.

Final TypeScript check and Vite production build passed. glTF Validator reports zero errors and 275 `NODE_SKINNED_MESH_NON_ROOT` warnings for the existing nested athlete meshes. The actual Three.js game transforms and hand grips were checked on the persisted file; these warnings are not silently described as a completely warning-free generic-viewer export.

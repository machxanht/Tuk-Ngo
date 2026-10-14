# V32: connected athlete kit and completed shared game route

The same tablet URL remains `https://machxanht.github.io/Tuk-Ngo/assets/illustrated-v22/`; the project root opens this route. The agreed direction combines continuous skinned 3D boats/athletes with the approved bright painted Maspéro festival banks. This release completes integration of the current asset/game scope rather than creating another prototype URL.

## Athlete clothing and motion

The former separate tank/sleeve surfaces left raised shoulder edges. `src/race/athlete-shirt-v32.mjs` replaces sleeved palettes with one 533-vertex, 896-triangle connected shirt, with four boundary loops and no nonmanifold edges. Neck trim and the custom `កូនខ្មែរ` back print are rendered from the bundled Khmer font; shirt colours remain sourced team palettes. Original vest and binding surfaces/decals are hidden only for sleeved kits. Sleeveless palettes retain their existing vest.

Runtime garment points interpolate original anatomical endpoints **after** skinning. The source JSON was extracted from the exact currently used V27 GLB; source SHA256 is recorded. It shares the eight existing master rigs, not 97 morph arrays per face variant. The separate shader keeps total vertex attributes within the measured 14/16 device limit.

`check-shirt-v32.py` tests eight masters at 17 phases with steady and sprint timing: maximum source-surface offset 5.51783 mm, maximum packed endpoint error 0.04411 mm, zero shader/page errors. This is correspondence to the posed anatomical source, not a universal self-collision proof. Actual seated, standing, caller, controller and helm renders were inspected. The original source's folded armpits make a global nearest-face signed-distance test unreliable; the failing diagnostic remains documented in `shirt-v32.md`.

`rowing-effort-v32.mjs` advances the pull within the same trajectory and slows recovery at sprint effort. The cadence remains 105 at sprint. Per-boat effort eases into the phase change. The catch stays on the beat, both hands retain the calibrated grip, and feet keep their supports. Existing moving river, contact sprites and extra sprint droplets remain in the shared renderer.

Four portable GLBs contain ordinary PBR materials, the current generic face/cap/kit, paddle where appropriate, and one scene clip with bone plus 97 shirt-correction tracks. They are downloadable assets, not part of initial game load. A triangle colour atlas produced visible speckles after GLB reload; a no-map diagnostic isolated the issue to texture sampling. Final exports use clothing vertex colours and a separate conforming alpha print, with clean front/rear renders. The thin runtime collar line is omitted in these portable files; back text and team sleeve colours remain. Hard-coded Tum Nup front lettering is hidden for other teams and for new sleeved shirts. Reload checks and glTF validation are recorded in `athlete-v32-manifest.json`.

## Festival and reference checks

The scene retains 1,949 spectator placements, 64 walkers, 16 vehicles, ten stalls, two stands and one visible C247 bridge. Four additional identities have four source action phases each: clapping, waving, phone photography and child cheering. The total is 28 identities and 64 painted frames. Existing placement records and old motion output are unchanged; the new profiles use the existing independent activity windows and anchored continuous body motion. Sprite action transitions remain discrete source-frame cuts. See `crowd-actions-v32.md` for hashes and raster/foot-anchor evidence.

An actual cached official 2025 frame (`official-11120s.jpg`, linked to https://www.youtube.com/watch?v=crZF3hghbgQ&t=11120s) shows continuous rail-edge crowds, umbrellas and irregular bank vegetation. The compact illustrated layout preserves that relationship, puts stalls behind the spectator edge, and keeps the two bridges at separate course ends. It is an authored visual approximation, not measured reconstruction of every building.

Current Khmer terminology was checked against primary pages: https://baocantho.com.vn/khmer/detail-a177897.html and https://baocantho.com.vn/khmer/detail-a73852.html attest Ok Om Bok and Ghe Ngo terminology; https://tourism.gov.kh/ attests the welcome wording; https://www.interior.gov.kh/en/news/vsGL41X6OPI1 attests celebration wording. No compulsory spelling change was established. Generated illustrations supply style and assets, never historical evidence. No national flags appear.

Eight source-based teams and known role kit colours remain selectable. The same route links 61 registrations, including 55 sourced Vietnamese/Khmer pairs; six unresolved Khmer names are marked. This exceeds the requested 50 bilingual entries without inventing names or equating roster rows with completed team models.

## Game completion and verification

The shared route includes automatic two-boat start-to-finish demonstration, touch quick race, timing practice and the eight-team cup. Quick race uses independent AI, stamina/cohesion, recovery/steady/sprint pace, finish crossings and local records. The cup uses quarterfinal/semifinal/final, replay on ties, elimination and saved completed rounds. Local storage does not sync across devices. Stale `planned` tournament metadata and old unfinished-cup direction text were corrected.

The affected quick-race browser check passed at 1024×768, 768×1024, 390×844 and 834×480: actual button input, repeated-input rejection, pause, controls outside the canvas/fullscreen, win/DNF and record restoration. Cup checks passed at three responsive sizes, including three wins through championship, reload continuation, tie fixture, elimination and network retry. Clock-accelerated race checks validate the rules/UI, not human play or real-duration performance. A previous real browser-clock button race remains valid for unchanged game rules.

Final checks also cover eight-team kit selection, shader/garment fit, asset atlas frame isolation and exported GLB reload. The real browser ran for 195 seconds, rendering 5,841 frames with camera fixed at (9,13.2,-28) and no errors; this exceeds the reported 2–3 minute camera failure. Actual steady/sprint rowing and all three helm grips retain hands within 2.483 mm of the shaft and have zero measured ankle drift. The final gate checks the served Pages revision. Evidence is retained in `docs/qa/hybrid-v32/` and the public portable manifest. Physical tablet performance and perfectly matched historical tailoring/architecture are not claimed.

## Public cold-load repair (32.1)

The first public capture rendered correctly, but repeated fresh starts sometimes stayed in the loading state. Request tracing identified the two large source GLB transfers still pending, with no application error and no font load started. The same file's HTTP HEAD returned 200 with the expected 4,230,492-byte length; this did not prove that a stalled body transfer finished. No garment or gameplay failure was established.

`asset-transfer-v32.mjs` reads GLB/JSON transfers with a 25-second inactivity deadline, reset on every received chunk. It allows a slow progressing download to finish, aborts an idle transfer, and retries at most three times with cache reload and a per-asset retry URL. GLTFLoader parses the same binary files after transfer. The page reports retry activity and exposes a reload button after final failure, rather than remaining indefinitely blank. Script cache keys advance to 32.1; the game URL and displayed Bản 32 remain unchanged.

Node checks cover a stalled stream, successful retry, progressing transfer longer than the inactivity deadline, and bounded failure. An actual browser fixture aborts the first model request, checks successful initialization on retry, then aborts every attempt, checks the visible retry button and clicks it to recover. These are explicitly controlled network fixtures, not claims of external success. Actual served-page cold starts are checked separately after deployment.

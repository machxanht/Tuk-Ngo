# Current game: two actions and tilt steering

The main game uses simpleControls. It has ROW and SPEED UP. Hold either
button to row; SPEED UP increases cadence and speed. Release both to rest.
Pace selection, timing grades, surge charge, the 950 m unlock gate and
left/right steering buttons have been removed from the playable interface.
Vietnamese, Khmer and English remain available in Settings. Practice, AI and
the saved 61-team cup share this control scheme.

## Stamina

Only one stamina bar is shown. Normal rowing drains slowly. SPEED UP drains
roughly nine percentage points per second plus stroke costs. Rest recovers
six points per second and rowing power decays quickly. Below eight points,
boosting stops; recover above twenty before boosting again. Independent finger
contacts survive releasing the other action. Pause, blur, cancellation and
finishing release held actions. Practice bests have a separate simple key.
Legacy engine presets remain for historical demos and regression checks.
They do not expose extra controls in the main game. Online is not implemented.
Future online races need equal boat stats, an authoritative match server,
sequenced inputs, a latency policy and server-confirmed bow crossing times.

## Tilt steering

Orientation permission is requested directly from Start, before team downloads.
Listeners are registered before the permission promise settles, so the initial
sample is not lost. Screen-relative gravity projection supports portrait and
landscape. The first valid sample sets a neutral holding angle. Settings can
re-centre. A two-degree dead zone and low-pass filter reduce jitter. Stationary
valid readings remain valid. Missing initial readings show a fallback hint;
denial detaches listeners. Desktop uses A/D, Space and Shift. Dragging the river
also steers when orientation is unavailable.

Permission requires HTTPS and a user gesture on supporting browsers:
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static).
Tests emulate native orientation in Chromium. Physical tablet operation and FPS
have not been verified.

## Rendering and downloads

Original athlete body files, eight source rigs and the connected 533-vertex,
896-triangle shirt with four boundary loops remain protected by hash/topology
tests. Display-only body LOD starts beyond 42 m. Beyond 48 m, coloured face LODs
replace individual face parts; unused full face hierarchies leave scene traversal
until needed nearby. Inspection/nearby views retain full geometry. Distant trees
have compact LODs. All crowd placements remain, with fewer medium-detail people.
Rigid hull fittings sharing a material are merged without moving their geometry.

Live racing disables preserved drawing buffers, MSAA and canvas transparency.
Inspection defaults retain them. Explicit capture renders before exporting.
Pixel ratio caps are 1 (Automatic), .9 (Balanced), .7 (Lighter); Automatic adapts
downward under sustained slow frames. Fixed simulation remains 240 Hz.

Ceremony display VAT pixels use float16 instead of float32. The build checks
maximum quantisation error below 1.5 mm. Source motion and shirt-fitting math
remain unchanged. JSON drops from 8,853,940 to 4,709,827 bytes before compression.
Near clothing and far painted-body silhouettes keep separate LODs.

Before this change the published tree was 879,747,775 bytes (about 880 MB).
A cold menu transferred 18,822,049 bytes, and entry to an AI race reached
20,550,104 bytes during the sampled interval. These are different measurements.
Historical samples and assets contribute to the tree, while gameplay loads a
subset. Tracked working files were about 1.34 GB, excluding Git and dependencies.
Unrelated reference files are preserved.

The verified public release (59cfed190051c530ba20ec6afd98122690e5da36)
contains 876,633,359 bytes. Cold menu transfer is 16,472,261 bytes; entering an
AI race reaches 18,199,861 bytes. Menu decoded bodies total 24,193,629 bytes.
The current public folder is 846,613,413 bytes and tracked working files total
1,336,442,899 bytes, excluding Git and installed dependencies. The release tree
includes historical assets and hashed bundles that the main game does not fetch.
The inventory reports pin exact deployment commits: local remote-tracking refs
were stale during collection, and only the tree totals were corrected later.
The browser transfer samples are unchanged.

The public race sample submits 3,156,845 triangles in 599 draw calls, compared
with 5,722,711 triangles in 911 calls in the baseline sample. Camera position
and distance LOD affect these counts; they are not worst-case course budgets.
The desktop GPU is a GTX 1650. These observations do not establish tablet FPS.

The reports under docs/qa/simple-controls record full size inventories,
transfer/decode sizes and submitted geometry. Compare public transfer with
public transfer: local compression differs. Camera samples are not course maxima.
Desktop frame measurements do not establish real tablet FPS.

## Checks

- npm run lint, npm test, npm run build.
- test-simple-controls.mjs: stamina, boost exhaustion/recovery, independent
  contacts, pause, 15/30/60 FPS determinism, sensor calibration/permissions,
  stationary readings, missing sensors and display-LOD source isolation.
- check-simple-race.py: native browser sensor emulation, landscape steering,
  two fingers, one stamina bar, VI/KM/EN at four viewport sizes, unobscured touch
  targets, canvas capture, practice/AI finishes and six cup rounds with restore.
- Historical browser check entrypoints share this current gate instead of
  expecting the intentionally removed controls.

Public verification completed after the Pages workflow succeeded and the root
HTML SHA-256 matched the published artifact. The real website passed the same
two-finger, native browser sensor emulation, stamina and three-mode checks with
zero browser errors. Measured boost changed stamina from 99.37 to 79.43, and
rest recovered 78.25 to 91.50. Practice/AI finishes and six cup rounds were
scripted through the real engine; orientation came from Chromium CDP, not a
physical device. Reports are in docs/qa/simple-controls/public/checks.json and
docs/qa/simple-controls/after-size.json.

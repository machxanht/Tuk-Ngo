# Interface, controls and runtime work

The playable game has Vietnamese, Khmer and English menus, instructions,
setup, race controls, settings and results. Team names and quoted broadcast
recordings retain their source language. English commentary has not been made.

## Two kinds of result

- **Casual / automatic timing:** hold ROW, choose pace, steer and decide when
  to recover or surge. Automatic strokes are labelled automatic in results.
- **Skill / manual timing:** turn off automatic timing before starting.
  `ngo-skill` fixes PERFECT to ±100 ms and GOOD to ±230 ms on every AI level.
  Each beat accepts at most one stroke. An early failed tap can be corrected;
  repeated mashing loses momentum. Results include mean accepted-stroke timing
  error, missed beats, streak, flow riding and lane control.

The winner is the boat whose bow crosses 1,200 m first, using interpolated
crossing times. Precision affects propulsion, cohesion, charge and fatigue;
it is not an additional score that overrides the finish. Steering into the
visible favourable flow earns up to 4.5% speed. Recovery and the final surge
create decisions besides tapping quickly. Practice bests are stored separately
for assisted and skill runs.

Controlled simulation examples in `scripts/test-gameplay.mjs` currently finish
at 185.14 s for accurate steady strokes, 183.01 s with well-used surges,
211.30 s with mainly GOOD strokes, and 227.51 s when sprinting throughout and
exhausting stamina. These are scripted balance examples, not human playtests.

## Input and rendering

Input handlers advance the fixed 240 Hz simulation to the current input
callback before judging a stroke or changing the rudder. In skill mode, a
trusted browser event timestamp compensates up to 80 ms of local dispatch
delay. Resolution waits for this bounded grace period; the actual PERFECT/GOOD
windows do not grow. Remote clients cannot be trusted to self-report this
compensation in future online matches. The previous 50 ms
per-render catch-up cap is now 250 ms. Independent fingers retain separate
rowing/steering contacts. A receipt distinguishes accepted, already-consumed,
early and late input. No event-handler measurement proves physical touch-to-
photon latency.

Settings exposes Automatic / Balanced / Lighter render resolution. Automatic
adjusts pixel ratio gradually when sustained frame intervals warrant it.
These options do not change simulation tick rate or timing rules. The optional
settings readout shows FPS, draw calls, submitted triangles, received race
inputs, p95 event dispatch delay and p95 time until the next rAF callback.
The latter is not a GPU-completion or display-photon measurement.

Scene changes keep the authored crowd and traffic populations. They cull
offscreen decoration with conservative bounds, use spatial crowd buckets,
cache static street transforms, omit distant wheel detail, and instance face
parts sharing geometry/material. Static riverside structures have local
sector bounds. Original athlete body files, shirt topology and master rigs
are protected by the existing hash/topology tests.

## Before building online play

Online play is not implemented by this change. The current second boat is AI.
The next implementation needs:

1. Extract per-boat simulation state so two authenticated players use the same
   physics, boat statistics, course seed and rules. Team art remains cosmetic.
2. An authoritative match server decides start, allowed inputs and finish.
   Clients send sequenced input intentions; never accept client-supplied speed,
   distance, stamina, PERFECT counts or declared wins.
3. Separate casual and skill matchmaking/results. Lock assist flags and rules
   for the whole match. Reject duplicates, impossible input rates, invalid
   state transitions, future timestamps and stale commands.
4. Server clock synchronisation, a bounded jitter/latency policy, local input
   prediction, reconciliation and remote interpolation. Client timestamps
   alone cannot prove honest timing. Test high RTT and jitter before ranking.
5. Replayable input logs and authoritative race seeds, with equal-input tests
   across render rates, disconnect/reconnect rules and explicit dead-heat rules.

This follows the need for server authority in competitive games described by
[Unity Multiplayer](https://docs.unity.com/en-us/multiplayer/game-types/competitive-games).
Draw-call batching and local culling follow the
[Three.js InstancedMesh documentation](https://threejs.org/docs/pages/InstancedMesh.html).

## Evidence

`docs/qa/runtime-response/baseline.json` and `after.json` use the same desktop
Edge headless 1,024 × 768 scene script and GPU. They include render submission
CPU time, frame intervals, triangle/draw counts and the detected renderer.
Results are samples at a moving viewpoint, not whole-course maxima.

| 1,024 × 768 desktop sample | Before | After |
| --- | ---: | ---: |
| Race submitted triangles | 10,720,025 | 5,720,939 |
| Race draw calls | 1,428 | 910 |
| River update CPU p95 | 15.7 ms | 6.3 ms |
| Render submission CPU median | 5.4 ms | 4.9 ms |
| rAF interval p95 | 31.6 ms | 31.6 ms |

This run measured less work, not a demonstrated FPS increase. Headless frame
cadence stayed around 32 FPS. GPU completion time was not measured.
Browser checks cover VI/KM/EN touch actionability, independent two-finger
controls, English persistence, judgement receipts, quality preferences and
actual-engine results. A separate mode gate exercises practice, AI and a full
61-team cup with restored progress. Physical tablet performance and internet
multiplayer have not been tested.

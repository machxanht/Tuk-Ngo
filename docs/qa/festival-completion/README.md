# Festival completion verification

24 October 2026. Covers the changes in the completion pass, with remaining
acceptance work tracked in [the completion plan](../../game-completion-plan.md).
The source release and exact public-file verification are recorded separately
in `deployment.json` after publishing. No guest export or secret is included.

Published runtime source: `48e7d34`; Pages:
`c830a5bbf76859022094e9ebb6e3af0dc61c793b`.
[Pages Actions run 40090096833](https://github.com/machxanht/Tuk-Ngo/actions/runs/40090096833)
completed successfully. Final verification fetched the seven changed dashboard
artifacts; 128 unchanged files retain the previous successful full public hash
verification and match the new commit byte-for-byte. `deployment.json` identifies
reused evidence explicitly. Public audio nine-case and slow-fetch regressions
cover the unchanged game runtime; `public-dashboard.json` verifies the last
dashboard update, with actual wide/phone screenshots. The stable game and
dashboard URLs did not change.

## Gates and evidence

- `npm run lint`, `npm test`, `npm run build` passed. The architecture gate
  confirms the exact protected shirt module, 533 vertices / 896 triangles /
  four boundary loops, and twelve preserved source hashes including the eight
  master rigs. The test command includes `test-completion.mjs`.
- `shirt-batching.json`: 24 native-versus-instanced real WebGL comparisons,
  two hull types, close camera with asserted shirt pixel coverage. At least
  46 draw calls saved per visible boat. `shirt-closeup.png` is the actual
  compared crew. Mesh, approved skinning math and skeletons are unchanged.
- `crew.json`: the actual loaded canonical crew passes 96-phase clearance
  checks for plywood and dugout construction. This is a geometric gate, not
  certification of the appearance of every source team.
- `controls-and-banners.json`: three distinct event identities, readable canvas
  text bounds, held input buffered across GO, release/touch-cancel, native DPR2,
  on-device report download without profile data. A deliberate 400 ms foreground
  stall remains visible in the exported report; it is not a real measured lag
  event. Hidden-tab resume intervals are excluded from those diagnostics.
- `narration.json`: nine real game/Web Audio cases, VI/KM/EN at all three
  venues. Correct language, original Vietnamese broadcast provenance, scoped
  team names and venue paragraphs, decoded audio and nonzero output RMS.
  All 42 new file hashes/technical levels are also checked by the unit gate.
- A public playback pass exposed a missed English introduction after skipping
  the camera. A controlled four-second delay of the real intro MP3 reproduced
  it locally: the cue was emitted, audio decoded without errors, but the old
  nine-second queue deadline rejected it after the prior sentences. The fix
  gives participant introductions 22 seconds while limiting them to the start
  stage. `check-venue-narration.py --intro-delay-ms 4000 --venue maspero
  --language en` retains that regression. Delayed network transport is simulated;
  the fetched MP3 and Web Audio decoding/playback are real.
- `dashboard-regression.json`: 21 legacy browser cases. `dashboard-venues.json`:
  real playback of the new pack, venue/language filtering, stop on changes,
  persisted selection and exported review of all 42 files.
  `dashboard-final.json` reruns all 22 together after fixing a visible undefined
  stage label in the new tab. Its heading now explicitly reads “THEO SÂN”.
- `rosters.json` and `scenes.json`: independent 61/16/8 rosters, search, save
  isolation, responsive VI/KM/EN picker, AI/practice/cups, six home families,
  cars/streets, venue banners with readable street-facing reverse UVs.
  Cup simulations advance the real game engine faster than wall time.
- `online-server.json`: real public Worker two-client match, authentication,
  forged-result rejection, reconnect, persisted exactly-once Elo settlement.
- `online-ui.json`: independent browser players on that same live Worker,
  actual two-button/steering input, reload/reconnect, finish/ranking and twelve
  responsive/language combinations. No backend endpoint override. The first
  server bootstrap request starts before graphics; packet arrival also depends
  on network latency. The final console summary initially hit Windows console
  encoding after all assertions and report output; its printing was corrected.
- `profile-transfer.json`: wrong password keeps the receiving guest unchanged;
  importing an encrypted file restores a real 1,016 Elo QA identity on a second
  browser. Reload preserves it; the other venue's ranking remains separate.

## Performance scope

`runtime-profile.json` records six 8-second samples at 1024×768 CSS pixels,
DPR2, Edge headless on the actual GTX1650/D3D11 GPU. These are **desktop**
measurements, not physical-tablet FPS. Sampling reported about 31–32 FPS both
before and after; no FPS improvement is claimed. The paired shirt comparison
establishes draw reduction independently of camera-driven scene visibility.
Each race sample keeps an actual keyboard contact held and asserts positive
boat speed, recorded in `raceInput`; direct engine holds alone are cleared by
the UI's contact reconciliation and are insufficient for a rowing benchmark.

The first Maspéro menu resource log reports about 19.7 MB encoded bodies on the
local server, with audio muted. Later venue logs are cumulative within the same
browser session, not separate cold-download totals. The full local dist folder
is approximately 858 MB including model exports, old studies, review media and
offline archives. Its size is not the game's initial network download. This
release publishes only allowlisted runtime/dashboard additions, preserving
unrelated working GLB changes outside the release.

`public-load.json` measures separate cold contexts against GitHub Pages with
cache disabled and audio muted: 16,448,006 bytes at Maspéro, 13,658,547 at Phnom
Penh and 13,658,916 at Siem Reap, including response headers. Ready took
15.15 / 8.70 / 10.34 seconds on that PC/network. No team-export GLB, ZIP,
review video or MP3 was auto-loaded. These are one-run observations, not tablet
loading guarantees or a before/after speed improvement claim.

## Remaining external or content acceptance

- Physical tablet: touch feel, tilt orientation, ten-minute thermals/FPS/memory
  and mobile-network reconnect. Desktop emulation does not establish these.
- Native Khmer listening: every new clip retains false review flags. RMS,
  hashes and playback do not prove pronunciation or names are semantically right.
- Full 300+ named Cambodia roster: incomplete, as documented in the source
  review. Current historical venue catalogues are not an official 2026 list.
- Scenery and team kit art: stylized interpretations; not surveyed replicas.
- Manual guest transfer is available; email login/automatic cross-device
  synchronization, anti-abuse identity and concurrent load capacity remain open.

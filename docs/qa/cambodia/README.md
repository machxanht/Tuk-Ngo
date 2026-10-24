# Cambodian riverfront and boat-picker verification

Runtime source: `823a8543b3b6a400e012364781e3dc6b6330530e`.
Pages: `01e2b3aa10f278932362af370fc3ac6fd1b9d4c0`.
Worker: `d45ce567-9add-486a-ab8b-202e4b382ae2`.

- `npm run lint`, `npm test` and `npm run build` passed. After the final CSS,
  construction-default and scenery culling edits, affected TypeScript,
  architecture and Vite build checks passed again. Protected shirt geometry
  remains 533 vertices / 896 triangles / four boundary loops; twelve source
  hashes and the eight athlete masters remain unchanged.
- `browser-public.json`: actual public Pages site, both Cambodian maps,
  three languages and four viewports each (24 combinations). Searches cover
  Khmer, Latin accents, province, missing results and paginated last entries.
  Search, choice list, page controls and race start remain usable in portrait
  and short landscape layouts. Both lanes default to dugout art.
- AI heats and eight-team cups finish through the actual game engine. Cup
  simulation is advanced faster than wall time in this visual regression;
  it is not an online authority test. The expanded catalogue can choose a
  late-entry team without enlarging the eight-team bracket.
- `server.json`: two real WebSocket clients against the public Worker, using
  newly added `kh-vibol-panha` and `kh-kiri-vong`, in the isolated QA ranking
  namespace. The race reaches actual authoritative finishes, reconnects and
  updates durable Elo exactly once; friend-room cancellation stays unranked.
  Authentication and forged distance/result rejection pass. No test score is
  inserted in the normal public leaderboard.
- `release.json`: all 25 changed published files match the exact Pages Git
  blobs byte-for-byte. The Pages workflow succeeded. Pre-existing edited team
  GLBs and unrelated screenshots were excluded from the publication.
- `culling.json`: an observed single-frame comparison in the same Phnom Penh
  selection view at 1180 × 430 / DPR 1. Spatial scenery batching reduced
  submitted triangles from 3,055,494 to 1,971,770 (35.5%); draw calls rose from
  275 to 332. This is not an FPS benchmark or proof of a net improvement on a
  physical tablet. Render resolution and the athlete meshes were not reduced.

Physical-tablet performance, real transport proportions, native Khmer
pronunciation and a complete 300+ named entry list are **not verified**.
There are 17 researched Cambodian identities and 61 Maspéro registrations,
not 300 imported teams. See [roster review](../../cambodia-roster-review.md)
for sources, historical years and the unimported 260-entry photograph list.

Screenshots were captured from the public game, not mockups. The scenery is
a stylised festival interpretation, not photogrammetry or a measured replica.

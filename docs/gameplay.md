# Game flow and festival art

The public entry remains https://machxanht.github.io/Tuk-Ngo/.

## Play flow

- Main menu: festival cup, quick race, three-step instructions, language and audio.
- Setup: search all 61 registered entries by Vietnamese/Khmer name, select difficulty, inspect the selected team's sourced/sample appearance status, and optionally audition commentary.
- Quick race: one 1,200 m heat with an opponent; its result does not alter the saved cup.
- Festival cup: existing 61-team elimination bracket, three first-round byes, persistent completed rounds, tie retry, elimination and championship.
- Race: a skippable grandstand/river/start flyover, then countdown, both distances, time, speed, gap, phase prompt, rhythm judgement, three paces, endurance, surge charge, pause and course overview.
- Pause: resume, restart the current uncompleted heat, or return to the main menu. Leaving discards the current heat, retaining completed cup rounds.
- Results: finish times, accuracy, best combo, stroke counts, next round/retry/new cup, or quick-race replay.

The actual race simulation and the eight role rigs are retained. Start is 0–200 m, cruise is 200–950 m, and final sprint is 950–1,200 m. A surge requires 60% charge and at least 24% endurance and lasts four seconds. Automated browser runs advance this real fixed-step simulation with legal timed strokes; they do not inject a winning result or distance.

The current cockpit accepts strokes on finger contact and uses contracting rings to indicate timing. The menu contains a 61-boat ceremony and user-selected looped music. See [race-presentation.md](race-presentation.md) for implementation, source and verification details.

## Languages

`src/race/game-language.ts` owns Vietnamese and Khmer UI copy. Language can change during a race without resetting it and is stored at `tukngo-language`. Native team names are displayed from the existing roster; an unverified Khmer proper name falls back to the sourced Vietnamese name. Broadcast quotes and sourced historical facts retain their original language. This is UI localization, not a new translation/voice-cloning pipeline. Khmer copy still benefits from a native speaker's editorial review.

## Art

Daylight uses broad sky/ground fill and a cool secondary light, without screen-space effects or new shadow maps. Water has a brighter jade/turquoise palette; the retained bank models use brighter festival colors. Near boats share a camera anchor, with the player's boat taking priority as the gap increases.

The eight researched kbach SVGs retain their shapes and UVs. The runtime creates and caches a brighter, more saturated canvas texture for each selected team, disposing the intermediate source texture. Festival sample liveries use multi-color filled curls, jewel borders and gold lines, and remain explicitly identified as game artwork rather than verified historical paint. No GLB geometry, connected shirt topology, or rig source is changed by this work.

## Verification

Run `npm run lint`, `npm test`, and `npm run build`. Start Vite preview, then run:

```powershell
python scripts/check-game-flow.py --url http://127.0.0.1:4175/Tuk-Ngo/ --out docs/qa/game-flow/local
python scripts/check-race-audio-browser.py --url http://127.0.0.1:4175/Tuk-Ngo/ --out docs/qa/game-flow/audio
```

The flow check covers both languages, menu/help/setup/race layouts at desktop, tablet portrait/landscape and phone sizes, Esc pause, frozen simulation while paused, overview camera, legal sprint/surge, quick-race/cup separation, a completed cup heat, next heat, bracket navigation and restored language/cup history. Screenshot inspection is required in addition to assertions. These are Edge browser viewport checks with software rendering, not performance measurements on a physical tablet.

Current public verification is recorded in [race-presentation.md](race-presentation.md). The preceding release's flow evidence remains under `docs/qa/game-flow/public/` and `docs/qa/game-flow/published.json`.

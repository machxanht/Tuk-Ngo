# Playable festival cup and paddle water

The canonical https://machxanht.github.io/Tuk-Ngo/ now opens the playable 3D cup. Choose any of the 61 registered entries, a difficulty, then start. **Xem mô hình** retains the automatic two-boat inspection, current single boat and single athlete; the historical eight-team cup remains available there. `?demo=race` opens the automatic trial directly for regression checks. These routes share the existing athletes, full Maspéro banks, grandstand, bridge placement and referee boat.

## Controls and race rules

- Tap **CHÈO** or use Space at the centre of the timing track. Its marker reads the same beat phase as the race engine and athlete animation. PERFECT/GOOD/BAD affect power, cohesion, charge and stamina; button mashing cannot replace timed input.
- **Giữ sức**, **Đều nhịp** and **Nước rút** trade speed against stamina. The existing start (0–200 m), cruise (200–950 m) and final (950–1200 m) rules remain authoritative. **ĐẠP!** spends stored charge and stamina for a short burst in the final section.
- The opponent has its own distance, phase, stamina and surge. Historical rank and selected team identity do not determine the player's result. The model uses fixed simulation ticks; the renderer does not set the race outcome.
- Pause freezes the model. Leaving the browser tab pauses the race. Optional audience audio starts only after user interaction and rises during the final section. It is the existing CC0 audience recording, not a claimed recording of this tournament.
- Winning advances to the next heat. A tie repeats the same opponent. Losing or failing to finish eliminates the player; remaining heats are simulated and a champion is shown. Completed cup history is stored in this browser. Reloading resumes the cup before the next heat; it does not restore a partially played race.

The 61 entries are the existing source-backed registration records in `public/assets/data/roster-2025.json`; see [roster provenance and unresolved fields](roster-2025.md) and [Báo Cần Thơ's 61-entry report](https://baocantho.com.vn/61-doi-ghe-ngo-tranh-tai-tai-giai-dua-ghe-ngo-le-hoi-ooc-om-boc-dua-ghe-ngo-tp-can-tho-2025-a193436.html). The game combines all entries in one authored 1,200 m festival cup, including female and unresolved registration labels. This is deliberately not the official men's/women's division format, distances or draw.

The draw has 64 slots and three honest first-round byes. All 61 unique IDs enter once and 60 non-bye heats decide the cup. A selected player races five or six heats to win. Only the current pair is rendered; other matches are simulated in the bracket. No 61-boat scene or 61 full GLB downloads are needed.

## Appearance and resource limits

`festival-teams.mjs` maps the eight researched teams to their existing identities without duplicating registration records. Their SVG liveries and appearance evidence remain intact. The other 53 have explicitly labelled sample colours and original code-drawn decorative scrolls; these are not asserted as each team's real kit/kbach. Missing Khmer attestations remain missing. All entries currently reuse the same accepted hull and athlete meshes/role rigs; distinct female crew anatomy has not been added. The selector states this limit.

`team-style.mjs` prepares textures only for the active pair, caches pending/completed work and disposes owned textures with the rig. The pre-existing eight-team list/API remains available to the older cup. Tournament support generalizes the same canonical module to 2–128 entries while preserving eight-team default snapshots and tie/restore behaviour. Restore rebuilds from validated events instead of trusting stored bracket winners.

## Water contact and sprint intensity

`river.mjs` samples each actual blade tip's world-space height. Entry, underwater drive and release create different bursts; dry recovery creates no new contact burst. The effects use a bounded pool of 3,600 droplets, 160 foam rings and 128 short spray fans per boat. No generated splash movie or downloaded sprite sequence is involved.

Drops launch outward from the active bank of the boat, fall under gravity and expire at the water surface. Rings spread from the contact point. Fans briefly expand upward/outward at catches and releases. Cruise uses intensity 0.12, starts 0.45, final 0.85, and an active final surge raises it to 1. Selecting Nước rút also adds force from the player's actual exertion before the final section; Giữ sức reduces it. Force increases emission, launch velocity, spray extent and visible drop size. The same actual blade trajectory/contact controls all modes.

The browser gate compares three identical cycles on the actual 3D crew with only intensity changed, measuring emitted particles, contacts and peak height. It also reaches the final section through legal strokes and activates the real UI's Nước rút/ĐẠP controls, verifying intensity 1. Screenshots in `qa/festival-game/` show both gameplay and the rendered sprint spray. Values vary slightly with random droplet velocities; this is an authored visual effect, not a fluid simulation.

## Verification

    npm run lint
    npm test
    npm run build
    python scripts/check-festival-browser.py
    python scripts/check-course-browser.py

The tournament unit gate tries all 61 player choices, checks three byes, 60 heats, full championship history, elimination resolution, restore and the unchanged eight-team rules. The production browser gate tests actual touch/keyboard actions, paces, pause, audio, a complete cup through legal fixed-step strokes, surge UI, result idempotency, saved reload, elimination/new cup, actual paddle-water intensity and 1024×768 / 768×1024 / 1180×430 layouts. Fast complete-cup playback uses the real integrator, not injected winning distances/results; it is not a wall-clock duration benchmark. Public evidence is recorded only after deployment succeeds. Physical tablet FPS remains unmeasured.

Verified public deployment: source `a87b754`, Pages `9838e79e365ca83f94e25ea57c5ae6805ff0f890`, [successful Pages run](https://github.com/machxanht/Tuk-Ngo/actions/runs/39031877069). `qa/festival-game/public/` records the complete public six-heat player championship, elimination/new-cup flow, saved reload, sound, three touch viewports, inspection navigation and clean application resource disposal. Before-final sprint selection increased force from 0.45 to 0.95 in the measured start-section case. The isolated identical-trajectory comparison emitted 11,376 cruise versus 33,668 full-sprint droplets, with approximately 0.20 m versus 0.68 m peak height. Browser errors were empty. The unchanged eight-team cup completed three rounds in the local production browser; the automatic trial separately passed both 1,200 m finishes and the protected arm/geometry checks.

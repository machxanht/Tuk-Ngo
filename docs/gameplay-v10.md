# V10 playable race

Entry: https://machxanht.github.io/Tuk-Ngo/?demo=play&v=v10

The competitive mode reuses the existing two-crew scene and V9 GLB. The accepted hull, owner-video livery, CC0 athlete atlas, crowd, Khmer signage and environment stay in place. No Adobe account, paid subscription or new service is required.

## Playing

1. Choose Làm quen, Thi đấu or Thử thách, then Bắt đầu đua. A three-second countdown keeps both bows at 0 m.
2. Tap the large Chèo button when the moving marker reaches the bright central zone. Space or Enter works while the button has focus. A perfect stroke is within 0.10 seconds; the wider valid zone depends on difficulty. Feedback, combo and accuracy update immediately.
3. Giữ sức uses 72 strokes/minute and recovers stamina. Đều nhịp uses 84. Nước rút uses 105 and drains stamina rapidly; low stamina reduces power and the stronger animation. Save sprinting for the final 200 m. Paddle spray and wake follow each boat's own speed and stroke intensity.
4. Both teams travel independently. The first bow across 1,200 m wins; crossings within 0.03 seconds tie. The opponent does not speed up in response to the player. Repeated taps on the same beat cannot score twice; missing a beat reduces power and breaks the combo.
5. Pause freezes race physics and time; switching away from the tab pauses automatically. If the AI finishes first, the player has up to 40 more seconds to finish. A six-minute cap prevents an endless race. Results show actual crossing times; an unfinished opponent is shown as Chưa về đích.
6. Winning records are stored per difficulty on this browser, with a session fallback if storage is unavailable. Replay resets distance, timing, stamina and scoring. Chọn độ khó returns to the start card. Camera/audio/low-power choices remain available.

These are authored game rules, not measured athlete physiology or certified competition rules. The amber crew remains fictional. Single-player only; records do not sync between devices.

## Verification

`npm run lint`, `node scripts/check-gameplay.mjs`, and `npm run build` pass. The mechanics script covers 13 checks including duplicate input, timing windows, missed beats, pause, fatigue/recovery, independent AI, no-input DNF, frame-rate grouping, interpolated finish/tie, replay and strategy balance. Its strategy runs are simulations, not human benchmarks. Report: `docs/qa/gameplay-v10.json`.

A full local-browser race used actual button clicks and five Space presses, with read-only clock inspection for timed input. It won Làm quen at **191.5858627 seconds**, 99% accuracy, 269 perfect strokes, 3 good strokes and 4 missed beats. Pause froze both distances and elapsed time; replay reset them; reloading retained the 3:11.59 winning record. Screenshots and browser observations are in `docs/qa/local-v10-*`.

Responsive layouts were inspected at 768×1024, 1024×768 and 375×812 with no horizontal page overflow. The primary stroke button is at least 64 CSS pixels tall. Gameplay camera framing accounts for the paddle panel: the scene shifts upward above a bottom panel, or left beside the panel in short landscape. A panel ResizeObserver updates the projection when options expand; it restores normal framing on pause/results. Both boats were visually inspected at 1024×768, 768×1024 and 834×480; scene-inspection camera framing stays unchanged. Public deployment checks are recorded separately after publication. These checks do not establish performance on a physical tablet. The existing environment remains an approximate reconstruction, and the animated people are authored 3D assets rather than motion capture or photoreal scans.

# Venues, banners and clarity: verification

Source: `fc0cec443f43fe82b763634d93f335b36e5dae3c`.
Pages: `4da0e8c2333163d40cdfb5ea809bf1b8ad75329f`.
Public entry: https://machxanht.github.io/Tuk-Ngo/.
Successful workflow: https://github.com/machxanht/Tuk-Ngo/actions/runs/40026041173.

## Checked behavior

- Directly inspected the coloured banner proof and real scene renders. All 129 Maspéro signs use the shared artwork generator, with 24 cached texture variants. Estimated RGBA/mipmap storage is 53.2 MB; this is not a measured GPU allocation.
- The old racing renderer disabled antialiasing and could drop DPR to 0.7. The new renderer enables antialiasing and has explicit caps: Sharp 2, Standard 1.5, Balanced 1.25, Lighter 1. A native DPR2 framebuffer was verified at DPR2, without a silent reduction.
- Tablet buttons are 142 × 60 px; small-screen buttons are 128 × 58 px. Resting backgrounds have 28% opacity, with stronger held feedback. Actual CDP touch and orientation emulation tested independent fingers, both tilt orientations, boost, stamina drain and recovery.
- Selection shows the current live boat, a short list and Start. Twelve VI/KM/EN viewport combinations passed bounds/hit-target checks. Six additional Cambodian race viewports passed at 768×1024, 1180×430 and 390×844; real screenshots were inspected.
- Phnom Penh uses a 1,700 m endurance course; Siem Reap uses a 500 m short sprint. Practice, AI and three-round eight-team cups completed in both. The existing 61-team Maspéro cup completed, including browser reload/restore.
- Real browser audio output and scheduled clip keys were checked: VI broadcast only; KM/EN neural AI only. English adds 19 decoded, hashed clips, approximately 1.12 MB. No voice clone or verified identification of every Vietnamese speaker as Quốc Khởi is claimed.
- Venue simulation tests cover both finish times, exact last-100/50 m announcements, pause/reset, boost, narrow steering, 15/60/144 FPS determinism and 61/8-team cups. Original shirt/rig checks pass: 533 vertices, 896 triangles, four boundary loops and preserved source hashes.

## Measurements

The exact deployed tree contains **881,332,362 bytes** of stored files. A cold public menu transferred **16,422,609 bytes**; the same session through the start of an AI race transferred **17,870,363 bytes total**. With normal browser caching restored, switching to the model viewer transferred **zero additional bytes** in this run. These are file and network measurements, not browser RAM or VRAM.

Public PC samples at native DPR2 were approximately **22.4 FPS in Phnom Penh** and **32 FPS in Siem Reap**. A Maspéro native-DPR1 sample showed approximately 2.85 million submitted triangles, 533 calls and 32 FPS on a GTX 1650 through Chromium D3D11. These are bounded samples, not a 60 FPS promise or physical-tablet benchmark. Hiding water did not improve a separate observed 32 FPS sample, so no speculative shader rewrite was shipped.

## Evidence

- `local/checks.json`, `public/checks.json`: venue modes, audio routing and DPR/antialiasing.
- `controls/checks.json`: CDP touch/orientation, stamina and the 61-team cup.
- `branding/checks.json`: vector/canvas identity, Khmer text bounds and scene signage.
- `public/responsive-cambodia.json`: six Cambodian viewport checks, final index hash and the original-voice UI label.
- `public-size.json`: exact deployed revision, stored size, transfer, viewer transition and draw measurements.

`npm run lint`, `npm test` and `npm run build` passed. The later text-only speaker-label correction passed lint and the Vite build; its exact public index and UI label were checked separately.

## Limits

Complete official 2026 Cambodian rosters/rules, individual real team hulls/uniforms, native Khmer listening review and every Vietnamese speaker's identity remain unverified. Historical sources and authored game rules are separated in `docs/cambodia-research.md`. Physical-tablet FPS/RAM were not measured. The user's pre-existing modified GLBs and study assets were excluded from commits and deployment.

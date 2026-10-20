# Separate audio dashboard and Antigravity handoff

Canonical dashboard: https://machxanht.github.io/Tuk-Ngo/audio-dashboard/ . It is independent of the 3D game and loads no MP3 until a user presses Play. The original listening library links to this dashboard.

`docs/audio-direction.json` is the authored scenario script: 29 cues over 10 stages from ceremony, flyover and the starting line to cruise, tactical events, the final 250 m and confirmed results. Each cue records the desired Vietnamese/Khmer text, existing audio keys, own-boat distance/time/state conditions, priority, cooldown and expiry. Vietnamese remains original audio. New or mismatched text becomes an explicit work request, not a claim that an old MP3 says new words. A cup championship requires the tournament champion; a heat win is insufficient.

The dashboard provides stage/status/search filters, editable bilingual scripts with browser-local draft storage, source audio playback, a state simulator, 61 team profiles, revised JSON/CSV downloads, and a complete ZIP. Edited text is marked as requiring a new audio match. The simulator checks both the cue and individual recording conditions; it cancels playback if its state changes to an invalid context. One HTML audio element serializes all speech. A direct listen button remains available for reviewing audio regardless of simulated gameplay state.

Build and export, using the project's existing Python installation:

```powershell
python scripts/export-audio-dashboard.py --out 'E:/AI/Um Tuk/audio/antigravity' --zip-out 'E:/AI/Um Tuk/audio/antigravity.zip'
node scripts/test-audio-dashboard.mjs
```

The handoff contains `manifest.json`, `script.json`, `script.md`, `cue-sheet.csv`, `teams.csv`, `requests.json`, `ANTIGRAVITY.md`, an offline dashboard and actual media. No account config, API key, executable or full source event video is copied. Local `dashboard/index.html` opens directly with file URLs and does not require a server. The full ZIP is also available at `/audio-dashboard/handoff.zip`.

The source manifest remains unchanged. The review package adds 44 already-rendered Khmer stock names and two Khmer history samples, with explicit AI provenance and native-review-pending status. Name coverage in the package is 58/61 Vietnamese and 56/61 Khmer. All 53 supplied Vietnamese name MP3s are preserved byte for byte. Original Khmer name clips and exact team/gender/number/history identities stay intact. Three Vietnamese and five Khmer registrations still lack a matching name recording.

`audio/output_audio/tieng_khmer` is withheld: one sampled file is Vietnamese race commentary and another mentions Kos Thum 2 instead of its Bốn Mặt filename. The 53-file inventory and bounded machine evidence are in `docs/qa/team-audio/khmer-folder-review.json`; this is not independent native listening verification. The new name generator, `scripts/build-khmer-team-names.py`, writes only the review pack, never the game's runtime manifest. Its resumable WAV cache and Azure credentials remain outside Git. No further synthesis is needed to export the existing package.

Antigravity should begin at `E:/AI/Um Tuk/audio/antigravity/ANTIGRAVITY.md`. The instructions require SHA verification, exact registration IDs, contextual queue revalidation, pause/restart handling, paddle-clock whistle/drum alignment, and original Vietnamese recordings. `requests.json` lists incomplete or reference-only language lines for source selection or Khmer synthesis. This handoff does not itself run Antigravity or integrate its future output into the game.

Browser evidence under `docs/qa/audio-dashboard/` records real Edge headless playback over HTTP and directly from the offline folder, 213 successful audio decodes, draft persistence, edited-script downloads, context-change cancellation and five viewports. Structural tests cover wrong results, stale starts, late metre calls, false lead changes, histories assigned to another registration, unresolved placeholders and edited-text mismatch. These checks do not establish native Khmer pronunciation or physical-tablet performance.

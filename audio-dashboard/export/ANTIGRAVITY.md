# Audio handoff for Antigravity

Read `manifest.json`, `script.json`, `requests.json` and `cue-sheet.csv` first.
This is a separate review/export dashboard. Do not assume these files have been integrated into the game.

1. Match each team by `registrationId`. Never use source ordinal as a bib, infer gender from colours, or transfer male/female or team-1/team-2 histories.
2. Resolve `audio` keys against `manifest.clips`. Paths under `media/` are relative to this folder. Verify SHA-256 before use. `script_text` is the desired line; `actual_audio_text` is what the existing recording is labelled as saying. They are not interchangeable. Original evidence JSON files are included at the paths listed in `provenanceFiles`; their audio paths describe the original repository, so resolve transferred MP3s through the main manifest's `file` and `sourceFile` fields.
3. Vietnamese speech uses original recordings only. Requests with `find-and-cut-original` need source audio/context review; do not generate Vietnamese TTS. Khmer may use `km-KH-PisethNeural`. Stock AI is not a cloned commentator. Native pronunciation remains unverified.
4. Resolve names through the selected registration profiles. Never synthesize literal `{player_name}`, `{opponent_name}` or `{winner_name}`. Dynamic lines need name/phrase assembly or a separate per-match render; keep gaps natural and never overlap speakers.
5. `conditions` use the player's own distance in metres, elapsed racing seconds, gap in metres, actual pace, stamina, combo, surge and confirmed result. All conditions must hold immediately before playback. `teamIds` requires that exact participant. `leadChanged` requires an observed change, not merely a nonzero gap. `cupChampion` requires the tournament champion, not a heat win.
6. One speech bus. Finish cancels pending race commentary; pause freezes all audio; restart clears the old match queue. Honour priority, expiry and cooldown. Alternate languages between phrases instead of playing both every time. Duck beds during speech. Keep recorded coach whistle and drum bars aligned with the paddle clock.
7. `requests.json` lists missing/reference-only lines. Do not mark them completed just because an unrelated MP3 exists. Keep original source URLs/timestamps, recording hashes, and synthesis provenance. Recheck any edited script against its audio.
8. The prepared folder `audio/output_audio/tieng_khmer` is withheld because sampled names/languages conflict with labels. Do not import it blindly. `rejected-khmer-review.json` explains the evidence and limits.
9. Preserve the shared crew/hull assets, 8-boat cup, 61-team festival and tablet controls. Do not make version-suffixed source files. Run affected tests and inspect the actual playback before committing game integration.

Open `dashboard/index.html` directly for offline review. The browser downloads no audio until a play button is pressed. Edits save in that browser only: use Export JSON to produce a portable revised script. The export does not silently change the live game.

# Audio review dashboard

Public route: `/audio-dashboard/`. Offline entry: `E:/AI/Um Tuk/audio/antigravity/dashboard/index.html`.

The interface has one selected item and one native audio player. Choose Tình huống, Tên đội or Âm thanh nền, select Khmer/Việt and listen. Previous/next buttons advance through the filtered list. Verdicts stay in a bottom bar; notes, variant choice and edited scripts save locally. On phones the list opens under Chọn mục khác. Xuất & bàn giao exports all review rows to JSON/CSV and scripts separately. No MP3 loads before playback or an explicit auto-listen action. Results are scoped to item, language, selected clip, audio hash and requested text; changing the requested text invalidates an earlier verdict.

## Khmer handoff

Source: `audio/antigravity/output/khmer/`. Import with:

```powershell
python -X utf8 scripts/import-khmer-audio.py '../audio/antigravity/output/khmer'
python -X utf8 scripts/export-audio-dashboard.py --out 'E:/AI/Um Tuk/audio/antigravity' --zip-out 'E:/AI/Um Tuk/audio/antigravity.zip'
```

The 89 files comprise 74 byte-identical existing recordings and 15 new MP3s. Hashes resolve existing identities and source provenance; only new bytes are copied into `public/assets/race-audio/khmer-review/`. All 29 cues, variants and 61 registration name candidates are accessible in the review UI. The original source manifest/script/CSV/report remain under `khmer-review/source/`; the source output folder is not changed. Import requires safe paths, exact hashes/sizes, known cue IDs and resolvable review identities. Reimport/export is deterministic.

Five new name recordings have filenames in their declared text instead of Khmer transcripts. These stay without an asserted transcript and show an identity/content-review warning. Three carrier/champion variants repeat the Tum Núp text in their metadata and remain flagged. Three original name recordings are shared across multiple registrations and cannot establish number/gender by themselves. These 11 file-level warnings are not hidden by the source's 100% completion claim. All Khmer native pronunciation flags remain false.

The game's runtime manifest and canonical script are unchanged. The dashboard overlays the supplied Khmer script only for review and preserves the Vietnamese original recordings. Asset downloads do not get added to the game startup path.

## Checks

- `npm run test:audio`: runs the game-audio/data checks, decodes all 229 dashboard/music files, then exercises the browser UI. Python/FFmpeg and Playwright with Edge are used from the existing local tools; the browser test also accepts `--playwright` and `--channel` to use an explicitly installed runner elsewhere. No production runtime dependency is added.
- `npm run test:audio:browser -- --report docs/qa/audio-dashboard/automatic-browser.json`: a reusable 13-case regression suite. It covers real playback, damaged saved data, note persistence, invalid verdicts, HTTP-404 recovery, cancelled play promises, natural-end replay, language changes, edited text, downloads and phone navigation. Simulated failure cases are identified in the report and do not certify an external service.
- `python -X utf8 scripts/test-audio-files.py --report docs/qa/audio-dashboard/automatic-audio-files.json`: independently measures decoded duration and original-channel peak levels with FFmpeg; sources are read only.
- `node scripts/test-audio-dashboard.mjs`: cue/identity/source isolation, all 89 handoff file mappings, all 29 cues/61 name candidates, copied variant labels and missing transcripts.
- `node scripts/test-race-audio.mjs`: unchanged game audio rules, source provenance and synchronization.
- `docs/qa/audio-dashboard/khmer-handoff-decode.json`: actual FFmpeg decoding of all 89 input files, non-silence and peak checks; this does not certify language or pronunciation.
- `docs/qa/audio-dashboard/simple-review-browser.json`: real Edge playback, offline file playback, 89 browser audio decodes, review persistence/export, text-change invalidation, variant warnings and six responsive viewport sizes.

Generated evidence snapshots use `-text` attributes so Git cannot change their hashed line endings. Dashboard CSS/JS use a content-derived query token at the same canonical URLs to refresh cached UI assets.

The broader browser suite initially reproduced five failures: lost notes from array-shaped storage, broken variant selection from a primitive saved map, unknown verdicts accepted into exports, a failed recording remaining approvable, and a cancelled resume rejection overwriting the next item's message. `automatic-browser-before.json` preserves those reproductions; `automatic-browser.json` records the fixes. Invalid saved-map containers are normalized, their original stored bytes are retained under `tukngo-audio-review-recovery`, and valid notes/verdicts remain available. A known failed load requires a successful retry before a new pass verdict. Playback promises are scoped to the current play session.

`automatic-khmer-asr.json` is an unprompted local Whisper-small diagnostic of three flagged variants. Its output failed a Khmer-script check and is unsuitable for automatic wording corrections. It is not substituted for the original transcript; native pronunciation and semantic name/history approval remain separate from the technical tests.

Published verification: Pages commit `93f3f16fd492130309c084d0230821019dd3c9d2`, package `4eb292862781ff97`. The first Pages build errored; a single API rebuild succeeded. Actual playback, review auto-advance and stopping the old recording were checked on the public route. All 15 new MP3 hashes, all 19 evidence-file hashes and the 11,640,093-byte public ZIP match the local artifacts. `docs/qa/audio-dashboard/public-simple-review.json` records the result. Physical-tablet performance and native Khmer pronunciation remain unverified.

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

- `node scripts/test-audio-dashboard.mjs`: cue/identity/source isolation, all 89 handoff file mappings, all 29 cues/61 name candidates, copied variant labels and missing transcripts.
- `node scripts/test-race-audio.mjs`: unchanged game audio rules, source provenance and synchronization.
- `docs/qa/audio-dashboard/khmer-handoff-decode.json`: actual FFmpeg decoding of all 89 input files, non-silence and peak checks; this does not certify language or pronunciation.
- `docs/qa/audio-dashboard/simple-review-browser.json`: real Edge playback, offline file playback, 89 browser audio decodes, review persistence/export, text-change invalidation, variant warnings and six responsive viewport sizes.

Generated evidence snapshots use `-text` attributes so Git cannot change their hashed line endings. Dashboard CSS/JS use a content-derived query token at the same canonical URLs to refresh cached UI assets.

Published verification: Pages commit `93f3f16fd492130309c084d0230821019dd3c9d2`, package `4eb292862781ff97`. The first Pages build errored; a single API rebuild succeeded. Actual playback, review auto-advance and stopping the old recording were checked on the public route. All 15 new MP3 hashes, all 19 evidence-file hashes and the 11,640,093-byte public ZIP match the local artifacts. `docs/qa/audio-dashboard/public-simple-review.json` records the result. Physical-tablet performance and native Khmer pronunciation remain unverified.

# Prepared Vietnamese team names

The previous crew/hull/logo corrections remain at source `7f4ac47`; public visual and full-race evidence is in `qa/asset-consistency/verification.json`. This audio change does not alter the shared race/inspection assets.

The owner's `audio/output_audio/tieng_viet` folder contains 53 short MP3s, totaling 751,401 bytes and 49.7 decoded seconds. `team-name-audio.json` explicitly matches each filename to a current registration. Source ordinal and the folder's bib labels are not used as game IDs. Numbered teams and male/female registrations stay separate. The import preserves every source MP3 byte and does not include the prepared Khmer folder.

Run from the repository, with the existing Python audio dependencies:

```powershell
python scripts/team_audio.py --source-folder 'E:/AI/Um Tuk/audio/output_audio/tieng_viet'
node scripts/test-race-audio.mjs
```

The importer decodes and validates the entire batch before copying it into `public/assets/race-audio/team-names/vi`. It writes a hashed pack, updates the canonical runtime manifest and downloadable ZIP, and records the pack reference in the existing broadcast recipe. Future full `build-race-audio.py --inputs ...` runs apply the same pack after rebuilding the original excerpts. The shared archive writer retains each recording's provenance.

Each mapped profile selects exactly one supplied Vietnamese name. Existing commentary dispatch uses it in the team preview, match introduction, lead changes and the appropriate winner call. Only the selected teams' names are requested for a match; the 53-file pack is not downloaded at startup. The original excerpts remain available in the listening library. Khmer selections, all histories and the other eight registration profiles remain unchanged. Current Vietnamese name coverage is 58/61; three registrations still have no matching recording.

`user-supplied-recording` metadata distinguishes these files from independently sourced CC cuts and AI samples. Prepared labels are not a claim of independent listening or phonetic verification.

Verification: lint, full regression tests and production build passed. A full four-source audio rebuild in a separate temporary output reproduced the runtime manifest and ZIP byte for byte. The browser decoded all 53 supplied names, played the correct two names in a match introduction and stopped all sources on pause. Pages action `39334974238` succeeded at commit `c4e87c22f971688b454ce5bcacb1479ab2ae6984`; all 53 public MP3 hashes and the downloadable ZIP matched. Public Wáth Pích playback completed using its supplied Vietnamese file, with no audio/browser errors or horizontal overflow at 1024 × 768. Evidence is in `qa/team-audio/`.

# Ghe Ngo · Audio Studio

Package `1836178966f3bff2` · 29 situations · 61 registrations.

Open [the dashboard](dashboard/index.html). Read [the script](script.md), [Antigravity instructions](ANTIGRAVITY.md), [CSV cue sheet](cue-sheet.csv), [team list](teams.csv), and [remaining requests](requests.json).

Choose Tình huống or Tên đội, then Khmer/Việt. Listen, mark Đạt/Cần sửa and optionally add a note. The three review buttons remain visible at the bottom. On phones, Chọn mục khác opens the list. Xuất & bàn giao exports listening verdicts/notes as JSON or CSV; script edits have a separate export. Results save in the current browser, not automatically across devices.

For team-name verification use [the bilingual reference](team-reference.md), [CSV](team-reference.csv), [JSON](team-reference.json), and [the team-audio prompt](team-audio-prompt.md). This reference separates 45 press-attested and 10 community-attested Khmer pagoda names from six unresolved names, unverified prepared labels, and audio content review. `teams.csv` is only a legacy summary; labels there are not an independent name or pronunciation certification.

Vietnamese name coverage in the base package: 58/61. Khmer name coverage in the base package: 56/61. The Khmer handoff, when present, adds review candidates for all 61 registrations and 29 cues. Its original manifest, script and report are preserved under `khmer-review/source/`. Review warnings distinguish missing transcripts and variant labels. The game's runtime manifest is unchanged. Do not call these a verified imitation of the original commentators.

There are 11 language/line requests still requiring audio or an exact-text match. Existing source audio is included for review, with its provenance. The package contains no Azure key, local account configuration, full event video or executable tool.

To serve over HTTP if preferred: `python -m http.server 4180 --bind 127.0.0.1 --directory "E:/AI/Um Tuk/audio/antigravity"`, then open `http://127.0.0.1:4180/dashboard/`.

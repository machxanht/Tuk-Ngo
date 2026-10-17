# Original Vietnamese and Khmer broadcast commentary

The game at https://machxanht.github.io/Tuk-Ngo/ uses the actual audio of the
[user's reference broadcast](https://www.youtube.com/watch?v=crZF3hghbgQ), from
Cần Thơ – Tiếng Dân tộc. The current generated asset set replaces the preceding
TTS/chant/synthetic-drum set in place. The historical checks in `docs/qa/race-audio`
refer to that earlier implementation; current checks are in
`docs/qa/broadcast-audio`.

There are 19 cuts, totalling 444,683 MP3 bytes: 12 Vietnamese commentary clips,
three short phrases of the Khmer commentator, three recorded percussion hits and
one field-ambience loop. The complete source stays outside the repository; its
SHA-256 and each cut's precise source range are recorded in
`docs/broadcast-audio-cuts.json` and the public audio manifest. Nothing is
synthesized or cloned. EQ, fades, normalization and encoding are applied to the
original recordings. Field percussion can include other field noise; it is not
an isolated drum studio recording. Rights/source attribution is documented in
`public/assets/race-audio/ATTRIBUTION.md`.

The main game opens one AudioContext from the Start touch/click, after the 3D
initialization. No audio is fetched before that gesture. One promise cache
reuses fetched/decoded buffers. Manifest migration and per-clip content hashes
prevent reuse of cached TTS files. There is no speech account, runtime TTS API,
whole-video download or generated team-name speech in the browser.

`src/race/race-audio.mjs` keeps the existing director, bounded priority queue,
beat-driven drums, speech ducking and pause/mute/disposal lifecycle. It now maps
race events to the recorded excerpts. Vietnamese plays first, then Khmer when
that event has a Khmer excerpt, with no overlap of the two commentators. The
Khmer commentator is an independent audio channel. Existing `chants` preferences
migrate to `khmer`, and volume remains saved separately from the cup.

Speech selection now uses the original YouTube automatic CC track (`vi-orig`).
Although labelled Vietnamese, it contains both Vietnamese and Khmer writing:
4,434 nonempty cues. The track hash is recorded under `source.captions` and each
speech cut includes the exact CC tokens/word starts in `captionEvidence`.
The baker checks that the supplied CC file matches, all speech inside each cut
was included in review, and the following phrase is excluded. Display text fixes
obvious recognition spelling errors and is not a certified verbatim transcript.

The previous unrelated Khmer cuts were removed. The selected phrases now mean
"Dear viewers" (intro), "It has started" (go) and "We congratulate" (a player win
only). Their working Vietnamese translations are stored alongside the original
CC text. No selected CC phrase contains a team name or numeric distance. There
is no Khmer congratulation at cruise, sprint, surge, a player loss, DNF or tie.
CC is still automatic, has no speaker labels, and has not received independent
listening/native review. Original sound and pitch are preserved; the two speaker
roles follow the user's reference. Actual teams, distances and results still
come from gameplay and the HUD.

The header offers BLV Việt (âm gốc), BLV Khmer (âm gốc), rowing drums and field
ambience switches. Captions stay in the footer outside the canvas. All sound
stops on pause, mute, bracket view, hidden page, new heat and navigation.

Rebuild:

    python -m yt_dlp --js-runtimes node --skip-download --write-auto-subs --sub-langs vi-orig --sub-format json3 --no-progress -o "path/to/youtube-captions.%(ext)s" "https://www.youtube.com/watch?v=crZF3hghbgQ"
    python scripts/build-race-audio.py --source "path/to/broadcast-full.m4a" --captions "path/to/youtube-captions.vi-orig.json3"

The source must match the reviewed 301,668,624-byte AAC recording. A fresh source
requires checking its cut ranges/hash before baking. Updated yt-dlp with
`--js-runtimes node`, its matching EJS dependency and FFmpeg were used to retrieve
the recording. No transcription API or new voice generation is required for
this CC-based selection. No ASR or model is shipped with the site. Tools and original
source are under `E:/AI/Um Tuk/asset-studio/audio-references/`.

Verification:

- `npm run lint`, `npm test`, `npm run build`.
- `scripts/test-race-audio.mjs`: 19 original recording hashes, exact source ranges,
  CC word evidence, language agreement, no obsolete MP3s, event/channel routing,
  congratulations isolated to wins, reset and preference migration.
- `scripts/check-race-audio-browser.py`: actual MP3 responses/decoding and nonzero
  Web Audio output, both original commentators, final/surge percussion, legal
  full-heat progression, next heat, pause/mute/preferences/disposal, and tablet
  layouts at 1024×768, 768×1024 and 1180×430.

Browser automation does not establish physical tablet performance, subjective
listening quality, or correctness of a native Khmer transcript. These limitations
remain explicit in the cut recipe and evidence.

The previous 20-cut deployment's listening/content selection was rejected by the
user. Its playback/hash checks did not establish semantic correctness. Current
technical checks are recorded in `docs/qa/broadcast-audio`; transcript/context
evidence lives in the cut recipe and manifest. Do not present successful decoding
or matching hashes as proof of accurate Khmer recognition or speaker identity.

Current deployment: source `2a8b66b`, Pages `bf5cb1a396480969491973b5abe3e10fe2145658`,
successful [Actions run 39045952469](https://github.com/machxanht/Tuk-Ngo/actions/runs/39045952469).
All 19 public MP3 hashes match the manifest. The public browser completed a legal
heat, played the three selected Khmer phrases, and passed pause/mute/preferences,
next heat, disposal and three tablet layouts with no browser errors. A mismatched
CC file is rejected before changing the audio set. These are technical/source
checks; the listening and automatic-CC limitations above still apply.

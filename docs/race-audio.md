# Original Vietnamese and Khmer broadcast commentary

The game at https://machxanht.github.io/Tuk-Ngo/ uses the actual audio of the
[user's reference broadcast](https://www.youtube.com/watch?v=crZF3hghbgQ), from
Cần Thơ – Tiếng Dân tộc. The current generated asset set replaces the preceding
TTS/chant/synthetic-drum set in place. The historical checks in `docs/qa/race-audio`
refer to that earlier implementation; current checks are in
`docs/qa/broadcast-audio`.

There are 20 cuts, totalling 502,420 MP3 bytes: 12 Vietnamese commentary clips,
four passages of the Khmer commentator, three short recorded percussion hits and
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

The Vietnamese cuts omit the original team names and numeric-distance claims.
Captions describe excerpts, rather than asserting a word-perfect transcript.
Khmer word-for-word ASR was unreliable, and there has been no native review.
Those original passages may retain real broadcast context or team mentions:
they are clearly labelled as source excerpts, not generated commentary about
the active game teams. Finish/tie/DNF cues never use an untranslated Khmer
passage to announce a winner. The actual teams, distances, winner and cup history
continue to come from the gameplay state and HUD.

The header offers BLV Việt (âm gốc), BLV Khmer (âm gốc), rowing drums and field
ambience switches. Captions stay in the footer outside the canvas. All sound
stops on pause, mute, bracket view, hidden page, new heat and navigation.

Rebuild:

    python scripts/build-race-audio.py --source "path/to/broadcast-full.m4a"

The source must match the reviewed 301,668,624-byte AAC recording. A fresh source
requires checking its cut ranges/hash before baking. Updated yt-dlp with
`--js-runtimes node`, its matching EJS dependency and FFmpeg were used to retrieve
the recording. Local faster-whisper small on CPU supplied Vietnamese word
boundaries; no ASR or model is shipped with the site. Tools, model and original
source are under `E:/AI/Um Tuk/asset-studio/audio-references/`.

Verification:

- `npm run lint`, `npm test`, `npm run build`.
- `scripts/test-race-audio.mjs`: 20 original recording hashes, exact source ranges,
  no obsolete synthetic MP3s, event/channel routing, result isolation, reset and
  preference migration.
- `scripts/check-race-audio-browser.py`: actual MP3 responses/decoding and nonzero
  Web Audio output, both original commentators, final/surge percussion, legal
  full-heat progression, next heat, pause/mute/preferences/disposal, and tablet
  layouts at 1024×768, 768×1024 and 1180×430.

Browser automation does not establish physical tablet performance, subjective
listening quality, or correctness of a native Khmer transcript. These limitations
remain explicit in the cut recipe and evidence.

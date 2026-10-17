# Race commentary and drums

The Vietnamese script and the short Khmer encouragement were authored for this
game. They are not the transcript or audio track of a television programme.

The reference supplied by the user is the second competition day of the 2025
Cần Thơ Óc Om Bóc – Đua ghe Ngo festival, on the Cần Thơ – Tiếng Dân tộc channel:
https://www.youtube.com/watch?v=crZF3hghbgQ
YouTube metadata was verified. Direct retrieval of a short audio reference
returned HTTP 403, so no programme audio was copied and an exact listening
comparison with that broadcast was not possible.

Speech was generated with Google Translate text to speech through gTTS, then
trimmed, normalized and encoded to mono MP3. This is a synthetic voice, with no
claim that it is the broadcaster's voice. The Khmer clips are short synthesized
encouragement, not recordings of a traditional chant or a real festival crowd:

- `ហ៊ោ! ហ៊ោ!` — Hô! Hô!
- `ខំប្រឹងឡើង!` — Cố lên!
- `ជយោ! ជយោ!` — Hoan hô! Hoan hô!

Team names follow the existing 61-entry roster. Eight phonetic readings are
provided in the baker for the existing canonical teams. These readings have not
been reviewed by a native Khmer speaker.

The three drum samples are original deterministic membrane/stick synthesis made
by `scripts/build-race-audio.py`. They are not samples from the linked broadcast.
The game also uses the existing CC0 crowd ambience documented in
`public/assets/audio/ATTRIBUTION.md` (benfree, Freesound 130568).

`manifest.json` contains every script, language, translation, duration, decoded
peak, file size and SHA-256. Only the two active teams' name recordings are
loaded during a heat; all 61 names are available in the published asset set.
The browser plays static files and does not call a speech service.

Rebuild: install `gTTS`, `numpy`, and `imageio-ffmpeg`, then run
`python scripts/build-race-audio.py`. An unchanged manifest reuses existing speech
recordings; `--force` deliberately synthesizes them again.

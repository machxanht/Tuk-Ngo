# Vietnamese commentary, Khmer calls and rowing drums

The canonical game at https://machxanht.github.io/Tuk-Ngo/ has a single Web Audio
mixer for Vietnamese commentary, Khmer encouragement, rowing drums and the
existing CC0 crowd ambience. Sound starts from the player's Start touch/click.
The initial 3D load does not fetch or decode audio. No speech account, API key or
runtime speech request is needed on a tablet.

The header mute button controls the whole mix. “Âm thanh” opens four independent
channel switches and a volume slider. Preferences use `tukngo-race-audio`,
separately from the cup save. Captions occupy a reserved line in the footer,
outside the 3D canvas. Sound stops on pause, bracket view, mute and navigation.

`src/race/race-audio.mjs` contains a pure commentary director and one audio
context. It reads the existing gameplay snapshot; it does not change race rules,
athlete meshes, rowing poses or the cup bracket. The director announces the
active pair, meaningful lead changes, course milestones, pace/surge changes and
the actual winner. Commentary is a bounded priority queue, with milestone
coalescing after simulation jumps. Final and finish calls interrupt stale speech.
Drums follow integer crossings of the player's continuous beat phase, with extra
half-beat rim hits in the final phase/surge. Missed beats are not replayed after
pause or a simulation seek. Voice playback ducks drums and crowd, and a master
compressor bounds the combined output.

One promise cache deduplicates fetch/decode of each recording. The two current
team names are warmed for a heat, rather than loading all 61. A generation token
invalidates pending playback when interrupted or changing heats. Existing decoded
buffers can be reused across the cup; unmount aborts requests, stops sources,
clears buffers and closes the context.

The 88 files contain 21 Vietnamese phrases, 61 team readings, three Khmer calls
and three authored drum hits (1,195,904 bytes total, before the manifest). Speech
is synthetic; pronunciation, especially Khmer team names, still needs native
speaker review. The linked broadcast was identified via YouTube metadata, but
direct audio retrieval returned 403. No claim of an exact sonic match or of
having copied its presenter/drums is made. Full provenance and scripts are in
`public/assets/race-audio/ATTRIBUTION.md` and `manifest.json`.

Verification entry points:

- `npm run lint`, `npm test`, `npm run build`.
- `node scripts/test-race-audio.mjs`: all recording hashes/metadata, name coverage,
  director winner/lead selection, milestone priority, reset, and preference bounds.
- `python scripts/check-race-audio-browser.py`: actual MP3 fetch/decode, nonzero
  Web Audio analyser output, names/cues/drums, pause/mute, mix storage, a legally
  advanced full heat, next-heat reset, navigation and three tablet viewports.
- `python scripts/check-festival-browser.py`: preserved playable cup regression.

Browser automation uses desktop Edge with touch viewports and software WebGL.
It does not establish physical tablet FPS, speaker quality, or native Khmer
pronunciation. Browser checks report their actual evidence in `docs/qa/race-audio`.

Verified public deployment: source `b3980e4`, Pages
`6e00608cca6f1e8673afbd4b7ea835cf8638b25a`, successful Actions run
[39039646701](https://github.com/machxanht/Tuk-Ngo/actions/runs/39039646701).
The published manifest matches the source. Public browser checks decoded the
active pair, measured nonzero audio output, played all three Khmer cue types,
observed extra final-phase rim hits, finished a legal full heat with the correct
winner, changed opponents, and verified pause/mute/preferences/disposal plus
1024×768, 768×1024 and 1180×430 layouts, with zero browser errors.
The full-cup local regression also reached champion and exercised elimination,
new-cup reset, storage restore, water intensity and model-view navigation.

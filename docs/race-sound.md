# Race sound and sustained commentary

The previous field mix repeated a 3.87-second broadcast excerpt and triggered
three short filtered impacts as drums. Most commentary events selected one
sentence and never spoke again until a distant milestone.

The canonical audio director now supports complete sentence blocks and recurring
context calls, roughly every 14 seconds when speech is idle. Actual distance,
gap, effort, result and registration gates remain in force. Long paragraphs have
an 85-second reuse cooldown; a missing history recording does not suppress a
routine race call. Vietnamese remains original broadcast speech. Five longer
source excerpts were added with original word-level CC and machine ASR evidence.
A sixth close-race candidate was withheld because ASR contradicted the CC.
Native listening/transcription certification remains unavailable.

The root manifest currently references 114 assets / 4,319,187 MP3 bytes: 75
Vietnamese originals, 12 Khmer originals, 16 pre-rendered Khmer AI cues and 11
field assets. Team-name and history registration coverage is unchanged.

## Whistle and drums

The whistle is a real sports whistle recording by SpliceSound:
[Referee whistle blow, gymnasium](https://freesound.org/people/SpliceSound/sounds/218318/),
CC0. It is not extracted from the race broadcast. Two short cuts are scheduled
60 milliseconds before each paddle catch with a 0.7-second audio-clock lookahead.
The stronger cut marks every fourth catch in the final phase/surge. Cadence
changes cancel old scheduled cues; pause, finish, mute and disposal stop them.
The independent `whistle` preference defaults on without overriding other saved
preferences. Browser tests verify its mute leaves the drum groove running.

Drums are a Demucs htdemucs percussion stem from the actual racing passage in
the [2025 opening-day broadcast](https://www.youtube.com/watch?v=XagC29Eyt_U&t=7886).
The original interval is 7886.443537415–7890.123900227 seconds, rather than the
opening-music trial. Eight measured beat intervals give a reference tempo of
130.421924 BPM. Offline pitch-preserving atempo produces seven eight-beat bars at
72, 84, 90, 96, 102, 114 and 120 BPM. Runtime selects the matching cadence and
offsets the groove to the current stroke phase; it does not pitch-shift it.

Time-based FFmpeg trim after resampling shortened some bars by 30–90 ms. The
final bake uses `atrim=end_sample` at 24 kHz, and the duration test requires each
decoded bar to match eight paddle periods within two milliseconds. Whistle
onset tests compare 15 and 60 render FPS at every supported cadence.

## Crowd beds and provenance

Trial broadcast `other` stems retained traffic/music and were withheld. The
40-second bank crowd bed and 20-second finish cheering bed use licensed sports
recordings, not recordings of Maspero:

- [Crowd Cheering — SoundBiterSFX](https://freesound.org/people/SoundBiterSFX/sounds/730908/), CC0.
- [Crowd Cheer — FoolBoyMedia](https://freesound.org/people/FoolBoyMedia/sounds/397434/), CC0.

The original field-impact snippets and tiny loop are removed. The library offers
four direct listen buttons for whistle, groove and both crowd beds, with correct
source labels. Crowd levels rise during sprint/surge and duck during speech.

`scripts/build-race-field-audio.py --study <private-study> --inputs <private-map>`
checks original broadcast hashes, separated-stem hashes and licensed input hashes;
it writes the field pack and binds its hash into the canonical cut recipe.
`scripts/build-race-audio.py --inputs <private-map>` then imports only the verified
field pack alongside speech. Models, full sources and original licensed downloads
stay outside Git. Public metadata records source URLs, hashes, licences, model
fingerprints and rendering filters; it does not include private runtime paths.

The 26-second `docs/qa/race-sound/mix-preview.mp3` is an **editorial listening
sample**, assembled from the same assets at the configured speech-ducking gains.
It is not a capture of live gameplay. Runtime playback is tested separately.

Local checks passed lint, test, build, nine stock/trial checks, original-source
correlation and actual browser playback. The browser completed a legal heat and
next heat, heard a 15.37-second original paragraph followed by a 1.94-second
sentence and 3.175-second Khmer cue, then started a separate 13.45-second routine
passage. It recorded 108 whistle cues and six groove starts across controls,
pause and phase transitions, with no browser errors. These figures describe the
test, not independent listening quality or physical tablet performance.

Evidence: `docs/qa/race-sound/{source-verification.json,sound-event-checks.json,local/checks.json,local-library/library-checks.json}`.

## Public verification

Implementation `97e054a` is published on Pages
`ae887cea109c3d3adeb9eaaa2e38c4082bb250ef`, with successful
[Actions run 39168815926](https://github.com/machxanht/Tuk-Ngo/actions/runs/39168815926).
All 124 checked public files matched local SHA-256 bytes, including all 114
runtime audio files, both manifests, root HTML, active game chunks and the team
archive. The public game completed a legal winning heat and started the next
heat, with 108 whistle cues, six groove starts and zero browser errors in the
test. Complete longer paragraphs and a subsequent recurring passage played;
whistle-only mute left the drum groove active. The library played all four new
field samples and passed all three tablet viewport checks. Public evidence is
under `docs/qa/race-sound/public/`, `public-library/` and `published.json`.
Independent listening, native Khmer review and physical tablet performance remain
unverified; this records source, scheduling, output and responsive-layout checks.

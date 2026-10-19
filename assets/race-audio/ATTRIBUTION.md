# Original broadcast audio

Current field-sound update: the original impact/tiny ambience cuts are removed;
five longer Vietnamese excerpts and a separately attributed field pack are added.
`field/manifest.json` records each field source, hash, licence and render process.
The earlier broadcast-only counts below describe the preceding speech archive.

- Coach whistle: [SpliceSound, Referee whistle blow, gymnasium](https://freesound.org/people/SpliceSound/sounds/218318/), CC0; trimmed, filtered and gain-adjusted.
- Bank crowd: [SoundBiterSFX, Crowd Cheering](https://freesound.org/people/SoundBiterSFX/sounds/730908/), CC0; 40-second cut, EQ and loudness normalization.
- Finish cheering: [FoolBoyMedia, Crowd Cheer](https://freesound.org/people/FoolBoyMedia/sounds/397434/), CC0; 20-second cut, EQ and loudness normalization.
- Drum groove: percussion separated with Demucs htdemucs from [the 2025 racing passage](https://www.youtube.com/watch?v=XagC29Eyt_U&t=7886), 7886.443537415–7890.123900227 seconds; eight-beat bars stretched without pitch change to seven paddle cadences. Source broadcast rights remain with the broadcaster; no CC0 licence is asserted for that source.

The whistle and crowd are separately licensed sports recordings, not Maspero
field recordings. Machine classification checks are not independent listening
verification. Trial broadcast crowd stems retained traffic/music and were not
selected. Models and full originals are not shipped in the game.

The 86 original broadcast excerpts are cut from these four Cần Thơ – Tiếng Dân tộc broadcasts:

- [2023 opening/race day](https://www.youtube.com/watch?v=tnb7TdUVRkU)
- [2024 opening/race day, supplied by the user](https://www.youtube.com/watch?v=Y2fp9gYRIZ8)
- [2025 opening/race day](https://www.youtube.com/watch?v=XagC29Eyt_U)
- [2025 second day, supplied by the user](https://www.youtube.com/watch?v=crZF3hghbgQ)

Copyright remains with the original rightsholders; no CC0 or independently verified reusable-content licence is asserted. Vietnamese voices are preserved; no Vietnamese TTS, voice conversion, pitch/speed change or syllable assembly. Processing is limited to cuts, EQ, fades, normalization and MP3 encoding. Field percussion is not an isolated studio drum stem.

`manifest.json` records each original source's SHA-256, event year, duration and CC hash; each excerpt has its source ID/URL, bounds, CC word evidence, available machine cross-check, conditions, decoded peak and MP3 hash. Automatic CC/ASR can be wrong. Same-channel provenance does not establish the same people across all years. Independent listening/native Khmer/speaker identity verification remains unavailable.

Current coverage: 58/61 Vietnamese names, 12/61 Khmer names, 3/61 Vietnamese histories, 0/61 Khmer histories. The owner supplied 53 prepared Vietnamese name MP3s from `audio/output_audio/tieng_viet`; these now take priority for the corresponding 53 registrations. Their original bytes, duration, decoded levels, filenames and explicit registration mapping are recorded in `team-names/manifest.json` and `docs/team-name-audio.json`. They are marked `user-supplied-recording`, without invented CC evidence or independently verified broadcast timestamps. No Khmer files were imported in this update. Existing Khmer clips, historical facts and the other eight registrations' profiles are preserved.

Missing recordings are not filled with another entry or generated speech. The ZIP contains the available recordings/provenance for all 61 current registrations. Pagoda names do not invent a number or gender, and old-season participation does not prove identity of a current registration. Supplied labels have not received independent listening verification.

`catalog.json` is a bounded search index, not every YouTube video; reference-only videos are not automatically used. The browser listening page links each selected cut to the original timestamp. Full source recordings, captions, ASR models and tools stay on drive E outside the site. Rebuild with the canonical `scripts/build-race-audio.py --inputs` workflow documented in `docs/race-audio.md`.

Sixteen Khmer situation cues use existing pre-rendered Azure `km-KH-PisethNeural` files. These are explicitly marked `azure-stock-neural` in the runtime manifest and linked to their source script, synthesis request, WAV, MP3 and sample-pack hashes. They are authored game speech, not original broadcast excerpts or cloned commentator voices. Original Khmer team-name clips and the short greeting remain source recordings. Native pronunciation is unverified. The unsuccessful Seed-VC trials remain separate and are not selected by the game. No cloud synthesis, key or model runs in the browser.
# Menu music

User-selected recording: [Nhạc Đua Ghe Ngo — Tổng Hợp Hình Ảnh Đẹp Nhất Chiếc Ghe Ngo](https://www.youtube.com/watch?v=TCpeiecnktg), Chi Nhỏ official. Encoded source and output hashes are in `menu/source.json`. This recording is separate from the race commentary/field manifest and is not represented as CC0 or AI-generated music.

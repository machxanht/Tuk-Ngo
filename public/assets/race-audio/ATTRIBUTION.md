# Original broadcast audio

The 86 original broadcast excerpts are cut from these four Cần Thơ – Tiếng Dân tộc broadcasts:

- [2023 opening/race day](https://www.youtube.com/watch?v=tnb7TdUVRkU)
- [2024 opening/race day, supplied by the user](https://www.youtube.com/watch?v=Y2fp9gYRIZ8)
- [2025 opening/race day](https://www.youtube.com/watch?v=XagC29Eyt_U)
- [2025 second day, supplied by the user](https://www.youtube.com/watch?v=crZF3hghbgQ)

Copyright remains with the original rightsholders; no CC0 or independently verified reusable-content licence is asserted. Vietnamese voices are preserved; no Vietnamese TTS, voice conversion, pitch/speed change or syllable assembly. Processing is limited to cuts, EQ, fades, normalization and MP3 encoding. Field percussion is not an isolated studio drum stem.

`manifest.json` records each original source's SHA-256, event year, duration and CC hash; each excerpt has its source ID/URL, bounds, CC word evidence, available machine cross-check, conditions, decoded peak and MP3 hash. Automatic CC/ASR can be wrong. Same-channel provenance does not establish the same people across all years. Independent listening/native Khmer/speaker identity verification remains unavailable.

Coverage: 42/61 Vietnamese names, 12/61 Khmer names, 3/61 Vietnamese histories, 0/61 Khmer histories. Missing recordings are not filled with another entry or generated speech. The ZIP contains the available original recordings/provenance for all 61 current registrations. Pagoda names do not invent a number or gender, and old-season participation does not prove identity of a current registration.

`catalog.json` is a bounded search index, not every YouTube video; reference-only videos are not automatically used. The browser listening page links each selected cut to the original timestamp. Full source recordings, captions, ASR models and tools stay on drive E outside the site. Rebuild with the canonical `scripts/build-race-audio.py --inputs` workflow documented in `docs/race-audio.md`.

Sixteen Khmer situation cues use existing pre-rendered Azure `km-KH-PisethNeural` files. These are explicitly marked `azure-stock-neural` in the runtime manifest and linked to their source script, synthesis request, WAV, MP3 and sample-pack hashes. They are authored game speech, not original broadcast excerpts or cloned commentator voices. Original Khmer team-name clips and the short greeting remain source recordings. Native pronunciation is unverified. The unsuccessful Seed-VC trials remain separate and are not selected by the game. No cloud synthesis, key or model runs in the browser.

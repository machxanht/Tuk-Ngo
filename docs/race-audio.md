# Original Vietnamese and Khmer broadcast commentary

The game at https://machxanht.github.io/Tuk-Ngo/ uses the actual audio of the
[user's reference broadcast](https://www.youtube.com/watch?v=crZF3hghbgQ), from
Cần Thơ – Tiếng Dân tộc. The current generated asset set replaces the preceding
TTS/chant/synthetic-drum set in place. The historical checks in `docs/qa/race-audio`
refer to that earlier implementation; current checks are in
`docs/qa/broadcast-audio`.

There are 72 cuts, totalling 1,311,624 MP3 bytes, from four hashed original recordings spanning 2023–2025. These include 25 event/field cuts, 44 team-name cuts and three historical excerpts. Coverage of the 61 current registrations is 42 Vietnamese names, 12 Khmer names, three Vietnamese histories and zero Khmer histories. Missing entries remain unavailable. Complete originals stay outside the repository; the site ships only the selected excerpts. `sources` and every cut's `sourceId` identify the exact recording, source/CC hashes, event year and cut boundaries. Nothing is synthesized, cloned or assembled from syllables. Rights/source attribution is in `public/assets/race-audio/ATTRIBUTION.md`.

The source catalog contains 76 deduplicated discoveries, 74 relevant race references, 21 downloaded original CC tracks, 51,237 nonempty cues and 6,585 cues containing Khmer writing. The search covers queries for 2008–2026; found archive titles include earlier years and unrelated/other-event references. This is a bounded discovery catalog, not every YouTube video or a verified season-by-season history. Event years in titles are explicitly unverified until reviewed. Upload dates are separate: the 2022 final `F3wU7YfIivk` was uploaded in 2024; some 2016/2019/2020 archive clips were uploaded later. There are 252 exact-text name candidates for further review, not automatically approved recordings or historical registrations.

Tools: yt-dlp with Node/EJS for metadata/CC/audio; FFmpeg for bounded decoding/cuts; local faster-whisper large-v3-turbo (fully downloaded to E) and the public Vatho/Khmer-ocm ASR service for bounded machine cross-checks. Short/bilingual/noisy excerpts sometimes yielded unrelated stock YouTube phrases; a forced Khmer decoder also produces Khmer-looking output for Vietnamese speech. These results are not language/speaker verification. Conflicting candidates are not automatically used. A level-race candidate was withheld because secondary ASR adds finish-line context absent from CC. New Khmer all-out-effort audio is restricted to the final 250 m. No independent listening/native review or certification of the same two speakers across seasons has been obtained.

The review/listening page is `/assets/race-audio/`: one user-started audio element, no automatic audio fetch, filters for stage/language/name, original YouTube timestamps, exact source years/upload dates and missing registration coverage. It links back to the stable game root; it is not a new game version.

## Script-first bilingual voice trial

The same library now has a **Kịch bản thử** view, deep-linked with
`/assets/race-audio/?view=script`. Its canonical source is
`public/assets/race-audio/commentary-script.json`; the readable generated script
and workflow are in [commentary-script.md](commentary-script.md). There are 20
situations and 40 authored Vietnamese/Khmer lines, not verbatim transcripts.
Khmer wording/pronunciation remains a draft awaiting native review. Two sample
registrations have explicitly dated, men's-only 2024 history; finish scripts
describe a heat result, never invent an overall championship.

`scripts/build-commentary-trial.py` produces an offline SSML plan before any
voice generation. Optional synthesis uses Azure's standard Vietnamese/Khmer
voices, checks voice availability, throttles individual REST calls, caches by
SSML/audio hashes and rejects silent/overlong/wrong-format WAVs. Keys stay in
environment variables or a private file outside the repo. The user's replacement
Azure account has an existing active SpeechServices resource in East US, with
the portal showing its pricing tier as Free. Actual authenticated REST calls
listed the two stock voices and generated all 40 WAV samples. This verifies
service access; it does not measure account-wide remaining monthly quota.
RVC is not installed/trained by this change and no speaker consent or listening
review is established. The original game manifest, 72 cuts, audio director and
cup gameplay remain unchanged.

`--publish` validates the complete WAV set against script/request/content hashes,
encodes and decodes all 40 mono 24 kHz MP3s, then writes only public metadata to
`public/assets/race-audio/commentary-trial/manifest.json`. The set is 1,697,792
bytes. Two original 50 m lines exceeded the 3 s limit (Vietnamese 3.0911 s,
Khmer 3.4464 s); removing the extra encouragement shortened them to 1.82 s and
2.1092 s. The final script has 1,391 text characters / 7,857 conservative SSML
characters; these figures describe the accepted set, not actual total Azure
usage including rejected attempts or other applications.

The script tab exposes one listen button per language/cue, using the existing
user-started audio player. No trial MP3 loads on opening/filtering the page;
only the selected file is fetched, with a content hash in its URL. Labels say
Nam Minh/Piseth stock voices and explicitly keep Khmer/native listening review
pending. No cloud account details or key is included in the public manifest.

Credential handling: Azure's visible key fields can include the full secret in
their accessible label after **Show Keys**. Do not dump input labels, page
snapshots or screenshots in that state. Read only the specifically selected
field into private local storage and hide the keys again. Never regenerate a
shared resource's keys as part of testing or publishing this game.

Affected checks: `python scripts/test-commentary-trial.py`,
`python scripts/build-commentary-trial.py --write-doc`, and the script view
checks in `scripts/check-broadcast-library.py`. Mocked/offline credential tests
are not evidence of successful external synthesis.

Published Azure sample set: source `de07597`, Pages
`9d35b128eabd87e9cdbbeff158a28e2bf7d2744e`, successful
[Actions run 39156279698](https://github.com/machxanht/Tuk-Ngo/actions/runs/39156279698).
All 45 public files checked (40 sample MP3s, trial/script/library metadata,
original broadcast manifest and original team ZIP) matched local SHA-256 hashes.
The public browser played stock Vietnamese and Khmer samples plus the original
two-clip regression, passed script filters and three tablet viewports with zero
page errors. No sample loads before a listen gesture or during filtering.
`docs/qa/commentary-trial/api.json`, `published.json` and
`public/library-checks.json` hold the current evidence. Human listening, native
Khmer review, RVC conversion and physical tablet performance remain unverified.

Previous script-only trial: source `fc3f0dc`, Pages
`4ce750df7c26de9259feed6efa61b97e6ccd57fb`, successful
[Actions run 39152983921](https://github.com/machxanht/Tuk-Ngo/actions/runs/39152983921).
The public library passed the original two-clip playback regression plus script
filters, 20 bilingual situations, no audio fetch in the script view and tablet
layouts at 1024×768, 768×1024 and 1180×430, with zero page errors. Public HTML,
script, original audio manifest and original team ZIP hashes matched the local
files; the main game bundle is still `assets/index-DvnLks7V.js`. Evidence is in
`docs/qa/commentary-trial/published.json` and `public/library-checks.json`.

The main game opens one AudioContext from an explicit Listen or Start touch/click,
after 3D initialization. No audio is fetched before that gesture. Name audition
loads only the selected team's clips; race launch prefetches the active pair. One promise cache
reuses fetched/decoded buffers. Manifest migration and per-clip content hashes
prevent reuse of cached TTS files. There is no speech account, runtime TTS API,
whole-video download or generated team-name speech in the browser.

`src/race/race-audio.mjs` keeps the existing director, bounded priority queue,
beat-driven drums, speech ducking and pause/mute/disposal lifecycle. It now maps
race events to the recorded excerpts. Vietnamese plays first, then Khmer when
that event has a Khmer excerpt, with no overlap of the two commentators. The
Khmer commentator is an independent audio channel. Existing `chants` preferences
migrate to `khmer`, and volume remains saved separately from the cup.

The primary 2025 source uses its original YouTube automatic CC track (`vi-orig`).
Although labelled Vietnamese, it contains both Vietnamese and Khmer writing:
4,434 nonempty cues. The track hash is recorded under `source.captions` and each
speech cut includes the exact CC tokens/word starts in `captionEvidence`.
The baker checks that the supplied CC file matches, all speech inside each cut
was included in review, and the following phrase is excluded. Display text fixes
obvious recognition spelling errors and is not a certified verbatim transcript.

Stage routing rechecks conditions against the actual player phase, own distance, pace/effort, gap and result before playback and again after decoding. Crossing 950 m on the opposing boat no longer triggers the player's final milestone. Event arrays choose one alternative rather than joining every variant. Generic history plays during the middle distance only; queued history cannot follow a finish. Urgent cues wait for the current complete phrase, with bounded queue expiry and rapid-repeat suppression. Confirmed ties no longer play a statement waiting for the judge; DNF uses a neutral expression of regret. Pauses/mute/navigation still stop speech immediately as requested by the user.

Selected Khmer event phrases comprise the existing greeting, race-start and win-only congratulations plus the newly cross-checked all-out-effort instruction from the 2023 broadcast. Two new Khmer name cuts cover Cham Pa and Pong Tứk Chắc. New Vietnamese name cuts cover Tà On, Trà Quýt Mới and Trà Cuôn; pagoda-only cuts do not invent a team number or gender. Automatic CC can still be wrong; source hashes, ASR text and tests are technical/provenance evidence, not proof of correct pronunciation or human listening review.

The header offers BLV Việt (âm gốc), BLV Khmer (âm gốc), rowing drums and field
ambience switches. Captions stay in the footer outside the canvas. All sound
stops on pause, mute, bracket view, hidden page, new heat and navigation.

Rebuild/research (originals/model remain under `E:/AI/Um Tuk/asset-studio/audio-references/`):

    python scripts/collect-broadcast-sources.py --first-year 2008 --last-year 2026
    python scripts/index-broadcast-sources.py --cache "path/to/originals-and-cc"
    python scripts/transcribe-broadcast.py --requests "path/to/bounded-review-requests.json" --output "path/to/asr-review.json"
    python scripts/transcribe-broadcast.py --backend local-whisper --model "path/to/complete-model" --requests "path/to/bounded-review-requests.json" --output "path/to/asr-review.json"
    python scripts/build-race-audio.py --inputs "path/to/broadcast-inputs.json"

On this Windows machine, the optional local ASR dependencies are installed outside the repo. Before its local backend, set PowerShell `$env:PYTHONPATH='E:/AI/Um Tuk/asset-studio/audio-references/speech-runtime'` and use model path `E:/AI/Um Tuk/asset-studio/audio-references/models/turbo`. The Khmer-service backend is already callable without a new account. Local Python/FFmpeg/numpy and yt-dlp/Node commands were exercised; no transcription backend is included in the website.

`--inputs` is a local JSON map of video ID to `{audio: originalPath, captions: originalJson3Path}`. Every source and CC hash must match the reviewed recipe. The old `--source`/`--captions` arguments still identify the primary recording, but the expanded recipe requires its other used originals through `--inputs` as well. The baker checks every CC word inside a speech cut and excludes the following phrase. Short speech/name excerpts use filtered peak normalization with MP3 headroom; longer phrases use loudness normalization. No ASR, model, full broadcast or transcription account is loaded by the game.

Verification:

- `npm run lint`, `npm test`, `npm run build`.
- `scripts/test-race-audio.mjs`: all original recording hashes, exact source ranges,
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

Previous CC-only deployment: source `2a8b66b`, Pages `bf5cb1a396480969491973b5abe3e10fe2145658`,
successful [Actions run 39045952469](https://github.com/machxanht/Tuk-Ngo/actions/runs/39045952469).
All 19 public MP3 hashes match the manifest. The public browser completed a legal
heat, played the three selected Khmer phrases, and passed pause/mute/preferences,
next heat, disposal and three tablet layouts with no browser errors. A mismatched
CC file is rejected before changing the audio set. These are technical/source
checks; the listening and automatic-CC limitations above still apply.

## Team names and historical commentary

`teamProfiles` in the same canonical manifest uses registration IDs, which differ
from race bib numbers and from the eight appearance preset IDs. Runtime resolves
`team.registrationId`; it never guesses a name from a kit, lane or colour.
The intro reads available names of both actual participants. Lead changes and
finish results select the correct participant, while missing recordings remain
silent. Historical phrases can play during the cruise period and cannot
change the cup result. History is entry/gender specific: Sro Lôn 1 does not
inherit Sro Lôn 2's medal, and female Kos Thum entries do not inherit the male
runner-up result. Shared pagoda-name cuts make no unspoken number/gender claim.

The setup has Listen to name and Listen to history controls. Changing teams,
starting a race, hiding the page, muting or leaving cancels an audition, including
an in-flight load. The existing AudioContext/promise cache is reused. The exported
`team-audio.zip` has a folder/profile for each registration and only the original
name/history files available for that entry, plus provenance and availability.
There are no placeholder audio files for missing recordings.

The original broadcaster's 2024 history excerpts cover Tum Núp 2 (men's champion),
Kos Thum 1 (men's runner-up) and Sro Lôn 2 (men's third place). Sources:
[Báo Sóc Trăng results](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/),
[explicit Sro Lôn 2 semifinal context](https://baosoctrang.org.vn/thoi-su/202411/doi-kos-thum-tinh-bac-lieu-va-doi-tum-nup-2-huyen-chau-thanh-vao-tran-chung-ket-giai-dua-ghe-ngo-nam-edc42ae/),
[Bạc Liêu's Kos Thum results](https://baocamau.vn/bac-lieu-doat-2-giai-cao-tai-giai-dua-ghe-ngo-tinh-soc-trang-a119729.html).
These corroborate the original spoken phrases; no new historical script was
synthesized in the commentators' voices. Proper-name matching still relies on
automatic CC, aliases and surrounding context, without independent listening.

Current per-registration coverage (a dash means not identified, not proof that
the name is absent from the full audio):

| Registration | Team | Việt name | Khmer name | History |
|---|---|---|---|---|
| can_tho-01 | PôThiSaThaRam (Đội 1) | yes | — | — |
| can_tho-02 | PôThiSaThaRam (Đội 2) | yes | — | — |
| can_tho-03 | Khleáng (Đội 1) | yes | — | — |
| can_tho-04 | Khleáng (Đội 2) | yes | — | — |
| can_tho-05 | Sro Lôn (Đội 1) | yes | — | — |
| can_tho-06 | Sro Lôn (Đội 2) | yes | — | 2024 / Việt |
| can_tho-07 | Chrôi Tưm Chắs | yes | — | — |
| can_tho-08 | Đơm Om Prul (Xẻo Me) | yes | — | — |
| can_tho-09 | Sê Rây Kan Đal | — | — | — |
| can_tho-10 | Pích Măng Kol (Wáth Pích) | — | — | — |
| can_tho-11 | Ô Chum - Prếk Chếk | — | — | — |
| can_tho-12 | Nô Rên Răn Sây (Ông Kho) | yes | — | — |
| can_tho-13 | Pong Tứk Chắc | yes | yes | — |
| can_tho-14 | Buôl Mun (Lộ Mới) | yes | — | — |
| can_tho-15 | Muni Srắc Keo | — | — | — |
| can_tho-16 | Phnôrôka | — | — | — |
| can_tho-17 | Tà Khvich Thmây (Trà Quýt Mới) | yes | — | — |
| can_tho-18 | Bốn Mặt (Buôl Preas Phek) | yes | — | — |
| can_tho-19 | Cham Pa | — | yes | — |
| can_tho-20 | Trà Quýt cũ (Ta Kh Vích Chăs) | yes | — | — |
| can_tho-21 | Kom Pong Tróp A | — | — | — |
| can_tho-22 | Bô Tum Reangsey Tum Nup (Tum Núp 1) | yes | yes | — |
| can_tho-23 | Bô Tum Reangsey Tum Nup (Tum Núp 2) | yes | yes | 2024 / Việt |
| can_tho-24 | Bô Tum Reangsey Tum Nup | yes | yes | — |
| can_tho-25 | Bâng Kók (Đội 1) | yes | — | — |
| can_tho-26 | Bâng Kók (Đội 2) | yes | — | — |
| can_tho-27 | Bâng Khdon | — | — | — |
| can_tho-28 | Đay Ta Suốs | yes | — | — |
| can_tho-29 | Prếk Pinh Tuang (Bét Tôn) | yes | — | — |
| can_tho-30 | Tà On | yes | — | — |
| can_tho-31 | TumPokSok (Đội nam) | yes | — | — |
| can_tho-32 | TumPokSok (Đội nữ) | yes | — | — |
| can_tho-33 | Bâng Tone Sa | — | — | — |
| can_tho-34 | Prếk Om Pu | — | — | — |
| can_tho-35 | Prếk Ta Cuôl (Trà Cuôn) | yes | — | — |
| can_tho-36 | Đay Om Pu (Phú Giao) | yes | yes | — |
| can_tho-37 | Om Pou Year | yes | — | — |
| can_tho-38 | Prêk On Đơk (Đội 1) | yes | — | — |
| can_tho-39 | Prêk On Đơk (Đội 2) | yes | — | — |
| can_tho-40 | Phnô Kanh Chơ Thmây | — | — | — |
| can_tho-41 | Phônô Cambốth | yes | — | — |
| can_tho-42 | Bâng Cro Chap Thmây | — | — | — |
| can_tho-43 | Bâng Cro Chap Chắs | — | — | — |
| can_tho-44 | Tứk Pray | — | — | — |
| can_tho-45 | Săng Ke | yes | yes | — |
| can_tho-46 | Pôthi Khsach | yes | — | — |
| can_tho-47 | Pô Thi Thlâng | — | — | — |
| can_tho-48 | Settodor | yes | — | — |
| ca_mau-01 | Cao Dân | — | — | — |
| ca_mau-02 | Rạch Giồng | yes | yes | — |
| ca_mau-03 | Đìa Muồng (Đội nam) | — | — | — |
| ca_mau-04 | Đìa Muồng (Đội nữ) | — | — | — |
| ca_mau-05 | Kos Thum (Nam Đội 1) | yes | yes | 2024 / Việt |
| ca_mau-06 | Kos Thum (Nam Đội 2) | yes | yes | — |
| ca_mau-07 | Kos Thum (Nữ Đội 1) | yes | yes | — |
| ca_mau-08 | Kos Thum (Nữ Đội 2) | yes | yes | — |
| ca_mau-09 | Ngan Dừa (Đội nam) | yes | — | — |
| ca_mau-10 | Ngan Dừa (Đội nữ) | yes | — | — |
| ca_mau-11 | Đầu Sấu (Đội 1) | yes | — | — |
| ca_mau-12 | Đầu Sấu (Đội 2) | yes | — | — |
| ca_mau-13 | Đìa Chuối | — | — | — |

Current runtime source: `b15a0c3`; Pages `2036305da8520eb52b2e9018be3b47d4066083b1`;
successful [Actions run 39143930300](https://github.com/machxanht/Tuk-Ngo/actions/runs/39143930300).
All 72 public MP3 hashes, the 799,694-byte team archive, listening HTML and 74-reference catalog match the source artifacts. Public browser checks completed a legal heat and next heat, selected-team name/history auditions, final/surge speech, pause/mute/preferences/disposal, three setup/race tablet viewports and actual new Khmer media playback in the source library. No browser errors were observed. Full evidence is in `docs/qa/broadcast-audio/published.json`, `public/checks.json` and `public/library-checks.json`.

Local source-correlation checks cover all four originals and 72 excerpts: minimum PCM correlation 0.9977907 and maximum decoded peak 0.948662. A deliberately mismatched source CC file was rejected without modifying output files. These are provenance/playback/technical checks. Independent native listening, cross-season speaker certification, complete 61-team bilingual names/history, and a claim to every YouTube video remain incomplete. The actual remaining registrations are listed in `selection-review.json`; candidates are not automatically published.

# Original Vietnamese and Khmer broadcast commentary

The game at https://machxanht.github.io/Tuk-Ngo/ uses the actual audio of the
[user's reference broadcast](https://www.youtube.com/watch?v=crZF3hghbgQ), from
Cần Thơ – Tiếng Dân tộc. The current generated asset set replaces the preceding
TTS/chant/synthetic-drum set in place. The historical checks in `docs/qa/race-audio`
refer to that earlier implementation; current checks are in
`docs/qa/broadcast-audio`.

There are 61 cuts, totalling 1,055,813 MP3 bytes: the existing 19 event/field
recordings, 39 name recordings and three historical commentary excerpts. The
61 registration profiles currently have Vietnamese names for 39 entries, Khmer
names for 10 entries, and Vietnamese historical audio for three entries. Khmer
historical audio remains unavailable. Missing entries are not filled with another
team's recording or synthetic speech. The complete source stays outside the repository; its
SHA-256 and each cut's precise source range are recorded in
`docs/broadcast-audio-cuts.json` and the public audio manifest. Nothing is
synthesized or cloned. EQ, fades, normalization and encoding are applied to the
original recordings. Field percussion can include other field noise; it is not
an isolated drum studio recording. Rights/source attribution is documented in
`public/assets/race-audio/ATTRIBUTION.md`.

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
silent. Historical phrases can play during the early/cruise period and cannot
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
| can_tho-13 | Pong Tứk Chắc | yes | — | — |
| can_tho-14 | Buôl Mun (Lộ Mới) | yes | — | — |
| can_tho-15 | Muni Srắc Keo | — | — | — |
| can_tho-16 | Phnôrôka | — | — | — |
| can_tho-17 | Tà Khvich Thmây (Trà Quýt Mới) | — | — | — |
| can_tho-18 | Bốn Mặt (Buôl Preas Phek) | yes | — | — |
| can_tho-19 | Cham Pa | — | — | — |
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
| can_tho-30 | Tà On | — | — | — |
| can_tho-31 | TumPokSok (Đội nam) | yes | — | — |
| can_tho-32 | TumPokSok (Đội nữ) | yes | — | — |
| can_tho-33 | Bâng Tone Sa | — | — | — |
| can_tho-34 | Prếk Om Pu | — | — | — |
| can_tho-35 | Prếk Ta Cuôl (Trà Cuôn) | — | — | — |
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

Current team-audio deployment: source `b435581`, Pages `a55623bdce471d2c778e4ca66ef014a84e2fb47f`,
successful [Actions run 39050535242](https://github.com/machxanht/Tuk-Ngo/actions/runs/39050535242).
All 61 public MP3 hashes and the 737,510-byte archive match the source manifest.
Public browser checks passed name/history auditions, missing recording feedback,
team-change cancellation, a full race, next heat, audio settings and disposal
with no browser errors. Three setup/race tablet viewports were exercised.
Coverage and independent-listening limitations above remain unchanged.

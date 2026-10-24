# Cambodian boat catalogue review

Reviewed 24 October 2026. Playable rosters are now separate: **61 Maspéro
registrations, 16 Phnom Penh identities and 8 Siem Reap city-river identities**.
No picker, AI opponent, cup or online room can draw from another venue.
This is **not a complete 300+ boat entry list**.

The Phnom Penh menu is a historical game invitational catalogue spanning 2019
and 2024 evidence. Siem Reap uses eight published city-event results from 2018.
Neither menu nor either eight-boat game cup is an official 2026
entry list. Each record retains its source URL, evidence season, entry scope,
Khmer source spelling and unverified display romanisation. Historical ranks
do not affect boat performance. Colours and the common dugout art are game
interpretations, not verified replicas of these teams' kits or timber hulls.

## Reviewed additions

- Siem Reap 2018: four men's and four women's boats named in the technical
  committee results reported by [AMS, 23 November 2018](https://ams.com.kh/news/central/161417).
  The export preserves each boat's division and source spelling. The mixed
  eight-team game cup does not reproduce the separate real divisions.
- The 2026 provincial report for Sdach Damrey establishes an identity, but
  neither a Phnom Penh entry nor a Siem Reap city-river entry. It is retained
  in the exported catalogue with an empty `venueIds`, excluded from play.
  A home province alone is not event membership evidence.

- 2024: Techo Keo Vichey Baramey Chao Sen, Saray Techo Senchey and Koh Ker
  Thipadei, named in the [2024 results report](https://kohsantepheapdaily.com.kh/article/2007453.html).
- 2024: Narind Rangsey Pichey Chit Bot, whose crew/abbot and race appearances
  are described in this [boat profile](https://thmeythmey.com/detail/142074).
- 2019: Pka Ram Saksith, Rontah Pech Senchey, Kaek Sa Techo Senchey, Samdech
  Vibol Panha Baramey Meanchey and Kiri Vong Sok Senchey, named in the
  [2019 category results](https://khmernote.com.kh/news/61403).

Similar names and alternate year spellings are not silently counted as new
teams. Chev/oar records remain outside the paddle animation roster.

## Full-roster sources and unresolved work

| Event | Source | What it establishes | Import status |
| --- | --- | --- | --- |
| Phnom Penh 2016 | [Committee's six-page starting list reproduced by Fresh News](https://freshnews.com.kh/localnews/39303-2016-11-13-03-49-01.html) | 130 pairs / 260 registered boats; multiple paddle/oar categories | Six original photographs located and inspected. OCR spelling is unreliable; bulk names have **not** been imported into playable teams. |
| Phnom Penh 2024 | [CamboJA registration report](https://cambojanews.com/all-systems-in-place-for-annual-water-festival-boat-race-in-phnom-penh/) | 348 registrations, not 348 published individual identities | Full individual name/class list not obtained. |
| Phnom Penh 2024 | [RNK committee report](https://rnk.gov.kh/article/43375) | Over 300 boats, Tonle Sap / Royal Palace setting | Establishes event size, not a complete named roster. |

The 2016 photographs are 914–962 × 1280 pixels. Local Khmer OCR returned
17–49 confidence on full pages; column preprocessing still returned only
33–40. The floating-point OCR model also failed in the selected WASM runtime.
These drafts are research material, not validated names. A high-resolution
committee start/result PDF or verified transcription is required for a safe
bulk import. Do not fill the missing entries with numbered duplicates or
fabricated temple names.

## Runtime scope

The shared picker searches Việt/Khmer names, province, aliases and ID, folds
Latin accents and `đ`, and renders at most eight choices per page (four in
compact online/opponent panels). More than 300 entries do not cause 300 DOM
rows or 300 GLB downloads. A 380-record synthetic fixture verifies search
capacity only; it is not an imported real roster.

Cambodian cups retain eight participants: the selected venue's team plus
seven seeded opponents from that same venue. Practice, AI and online also use
only that venue's roster. Server queue/create/join/socket guards enforce this
independently of the browser. Rankings remain partitioned by venue.

Valid saved cups are restored. A saved cup containing teams outside its venue
is copied once to its storage key plus `-roster-backup`, then starts a clean
venue-specific cup. Other venues' progress is unchanged. Old online rooms
with invalid venue membership are cancelled without ranked settlement;
finished match history is preserved.

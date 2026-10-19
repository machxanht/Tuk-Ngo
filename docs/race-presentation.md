# Festival presentation and immediate rowing input

The existing public entry is https://machxanht.github.io/Tuk-Ngo/.

## Requested changes

- A clearer tablet race cockpit and an obvious cue for when to stroke.
- Input accepted on finger contact, without waiting for release.
- A pre-race camera sequence: main grandstand, both banks from above, fast approach to the starting line, then the three-second countdown.
- An animated menu ceremony, using the owner's supplied aerial photograph as a composition reference, with all 61 registered boats approaching the grandstand.
- The owner's selected music looping during menu/setup, stopping on entering a match.
- More regional house, tree and road-vehicle silhouettes.

## Implementation

`RaceGame` uses `pointerdown` for mouse, touch and pen. The click fallback is restricted to keyboard/assistive clicks (`detail === 0`), so releasing a touch cannot create another stroke. The large pad shows a contracting approach ring, a target ring, a gold valid timing cue, a green approach cue and a wait cue after a consumed beat. Early/late/spam feedback is localized. The original scoring windows, power, endurance and tournament balance are preserved.

The intro is an explicit simulation phase lasting ten seconds. Race distance, elapsed race time and countdown stay frozen during it. Pause freezes the shot; skip transitions to a fresh three-second countdown. Camera interpolation lives in `race-camera.mjs`; the active race view resumes afterward. Countdown audio is activated before its first cue is scheduled.

`menu-ceremony.mjs` batches 61 painted hulls, colored interiors, 3,050 seated athletes and paddles. The distant athlete is a derived 298-vertex/403-triangle static pose built from the existing CC0 assembled athlete, with mirrored static geometry for the opposite bank-facing side. These copies do not alter the verified connected shirt or eight race rigs. Bodies sway, paddles move, boats bob, and the existing crowd, traffic, foliage and water continue animating. The ceremony's all-team colors are game presentation, not a claim that every historical boat's interior paint has been verified.

The supplied photograph informs the fleet, river corridor and bank density. The town remains an authored approximation; neither this photograph nor the implementation establishes surveyed coordinates or identical Maspéro facades. New side streets and low-detail inland roofs fill the neighborhood behind the riverfront, with canopy trunks separated from roof rows.

The street contains 12 frontage templates spanning ten families, nine plant silhouettes and eight traffic types. New frontages include veranda houses, raised wooden houses, balcony shophouses, market fronts and corner cafes. New traffic includes delivery scooters, vans with luggage and minibuses. Existing instancing and distance ranges are retained; far frontages now have three roof silhouettes.

## Menu music

[Nhạc Đua Ghe Ngo — Tổng Hợp Hình Ảnh Đẹp Nhất Chiếc Ghe Ngo](https://www.youtube.com/watch?v=TCpeiecnktg), Chi Nhỏ official, is the user-selected source. `public/assets/race-audio/menu/source.json` records the source and encoded hashes. This is an original source recording, not a CC0 or AI track.

The media element is lazy and does not load before user interaction. A browser may require the first tap; the menu provides an explicit music action and also unlocks on menu interaction. Music loops through setup, respects master mute/volume, stops before the intro and resumes when returning to the menu. It stays separate from race commentary and field audio.

## Checks

- `npm run lint`, `npm test`, `npm run build`.
- `scripts/test-race-presentation.mjs`: intro timing at 15/30/60/144 FPS, pause/skip, continuous camera coordinates, separated fleet positions, derived geometry/source hashes and the selected music hash.
- `scripts/check-race-presentation.py`: real media playback and return/mute, an actual CDP touch held down before release, no duplicate stroke on release, intro/camera/countdown ordering and both UI languages on four race viewport sizes.
- Existing full game-flow and race-audio browser checks remain regression gates.

Browser input timing includes automation/dispatch overhead; it is not a measurement of physical tablet latency. Browser viewport checks and software rendering do not establish FPS on a physical tablet. Khmer copy still benefits from native editorial review.

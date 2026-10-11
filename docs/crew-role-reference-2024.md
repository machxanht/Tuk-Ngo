# Crew role reference: inspected 2024 footage

Research date: 2026-10-11. This note records real reference evidence and separates observed silhouettes from authored animation choices. No game implementation or existing assets were changed by this research.

## Source and substitution

The owner supplied [VTV10 tournament at 1:28:58](https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s). Web access returned “Online fetch throttled”; this session did not visually inspect that original tournament. The substitute is the primary [Báo Sóc Trăng 2024 report](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/) and [its direct MP4](https://baosoctrang.org.vn/file/video/8e61a0b4907d319401909010f0cf012c/112024/20241115214514ghe_ngo_chua_tum_nup_vo_dich_ca_nam_va_nu.mp4), plus primary [Thanh Niên photographs by Duy Tân, 15 November 2024](https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm).

Fresh remote FFmpeg seeks retrieved individual frames at 82, 85, 105, 110 and 135 seconds and a two-second 4fps sequence starting at 104 seconds. The full remote MP4 was not downloaded. The existing local 128MB MP4 was partial and produced decode/seek errors; it was not used to establish new timecodes. Nominal frame labels indicate requested clip timestamps, not tournament timestamps or measured biomechanical timing.

## Visually inspected evidence

Fresh full-resolution reference files are outside the repository at `E:/AI/Um Tuk/asset-studio/crew-role-references/`:

| Evidence | Observed facts | Appropriate use and limits |
| --- | --- | --- |
| `remote-105s.jpg`, boat 12 | Bow at right. Forward paddlers sit low with visibly raised bent knees; rear paddlers at left have higher hips and upright leg silhouettes. A light-blue standing coordinator appears near the transition. | Supports seated-front/standing-rear distinction. Exact paired-row boundary is occluded; front 5–10 pairs is the owner's requested range, not a measured count. |
| `remote-85s.jpg`, boat 12 | Rear rowers hinge torso forward while staying higher than front rowers. Upper hands rise above shoulder/head and lower hands grip farther down the shaft. Paddle extends outside the gunwale. | Standing stroke should include knee flexion and torso hinge, not a rigid upright body with wrist rotation. No numeric joint angles were measured. |
| `boat12-cycle-contact.jpg`, nominal 104–105.75s | The first three tiles precede the edit to boat 12. From 104.75s the front paddlers and standing paddlers change paddle phase. The bow participant stays seated facing crew and raises an arm; light-blue coordinator remains standing among crew. | Useful for comparing roles. Do not animate bow participant or coordinator as ordinary power rowers. Individual full-size `boat12-cycle-04.jpg` through `08.jpg` contain the boat 12 shot. |
| `remote-135s.jpg`, boat 33 | Same low front/high rear silhouette; a standing yellow coordinator spreads arms while seated bow participant faces crew. | Cross-team corroboration for distinct coordinator and bow gesture motion; not Tum Núp kit reference. |
| Thanh Niên `anh-11-17316705708801037472883.jpg` and `anh-8-17316704637181943855127.jpg` in the earlier athlete reference cache | Boat 12 bow participant sits at decorated bow facing crew, raising cap/arms. Light-blue coordinator stands with raised arms. Caps visibly vary between forward and backward wear. | Strong still evidence for body proportions, low seated pose, cap orientation and caller silhouette. Clean requested kit replaces historical sponsor lettering. |

Supplementary stern evidence: the pre-existing `E:/AI/Um Tuk/asset-studio/athlete-real-references/qdnd-6.jpg` was inspected. It shows a man at the extreme stern behind the yellow stroke rowers, braced upright with a long near-vertical shaft held at stern. The known [2020 Quân đội nhân dân photo essay](https://www.qdnd.vn/phong-su-anh/dua-ghe-ngo-mon-the-thao-dac-trung-mien-song-nuoc-642925) returned a redirect loop in this session; attribution was obtained from the existing project reference document. This still supports a distinct stern placement/brace, but does not verify a dynamic steering sweep. Stern paddle sweep, exact blade immersion and helmsman count remain unresolved by the newly retrieved 2024 frames.

## Animation interpretation

Observed distinctions justify five separate motion families: low seated propulsion, higher standing propulsion, stern steering, seated bow calling, and standing coordination. Standing and seated paddlers use both hands on a shaft, recover forward above the water, enter outside the hull and pull while hinging torso. Reference frames support this gross movement, not a measured rig or joint angle dataset.

The owner's specified front 5–10 paired rows and stern helmsmen remain implementation requirements. Selecting an exact boundary, modest steering yaw/shaft corrections and an authored caller/coordinator gesture loop are authored approximations unless subsequently measured from clearer footage. Keep propulsion paddle banks coherent; keep gesture motion distinct from propulsion. Do not label authored loop duration, counts or angles as documentary facts.

## Khmer kit text

Use the literal Unicode text **កូនខ្មែរ** for the requested “Koun Khmer.” A primary artist statement hosted by the University of Auckland [Elam School](https://elam.ac.nz/projects/four) explicitly pairs this exact phrase with “koun khmer” and “child of Khmer/Cambodian.” [Northern Illinois University's Khmer language course](https://seasite.niu.edu/khmer/conversation/unit2/kinship/kinship.htm) independently lists កូន, koun, child. Render through a Khmer-capable font with correct shaping; do not synthesize Khmer lettering as an AI image. The requested lettering is authored project kit, not a reproduction of the historical Vietnamese sponsor logos visible in the 2024 photographs.

## Spectator variants

The inspected Thanh Niên bow photo and `remote-105s.jpg` show adults and children, short and long sleeves, plain and patterned clothing, caps, broad hats, masks, phones, raised arms, and both standing and seated people. These support clothing/headgear/body/pose variation for the requested 10–20 NPC variants. The requested variant number is not a measured historical count. Avoid converting a single athlete into only recolored spectators; torso silhouette, leg garment, headgear and idle/cheer pose should also vary. No new third-party NPC asset license or integration was verified by this research.

## Verification and outstanding limits

Inspected fresh frames at full resolution with the image viewer and the derived contact sheet. Confirmed Khmer text against two university-hosted sources. Wrote only this scoped repository note and new reference caches outside the repository. Original YouTube viewing, exact paired-seat count, measured standing angles, complete stern steering dynamics and native-reader visual review of the rendered final kit remain outstanding. Press pixels are study references and should not become redistributed game textures without permission.

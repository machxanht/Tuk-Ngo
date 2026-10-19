# Festival asset roles

The game title is **Lễ hội đua ghe Ngo · ពិធីបុណ្យអុំទូក 2026**, with **Tỉnh Sóc Trăng · ខេត្តឃ្លាំង** as the requested in-game location label.

## Crew

- Both rowing sides solve hands to the shaft. The inboard elbow is chosen on the two-bone reach circle with a forward position and a paired clearance constraint, instead of crossing the chest or entering the other row.
- The whistle coach faces the stern at boat X = 5.42. Two seated rows at X = 5 and 4.167 separate the coach from the first half-kneeling row at X = 3.333.
- Two stern helms use 2.05 m paddles, with less than 20 degrees of lean and small corrections beside the stern. Their blades remain immersed instead of projecting several metres aft.
- The seated plywood bow caller mimes the calibrated catch and pull with staggered hands. The dugout bow commander stands with a vertical command spear and a gripping finger pose.
- The original eight master rigs and protected motion sources are unchanged. A ninth **derived clip**, `bow-spear`, shares the caller's existing skeleton. The connected shirt remains 533 vertices, 896 triangles and four boundary loops.

## Construction variants

The inspection view and race setup offer **Ván ép / Độc mộc**. Plywood has thin gunwales, panel seams and transverse ribs; dugout has thick continuous rounded gunwales and darker carved timber inside. The bow seat and command stance change with the selection. These are game art variants, not verified construction assignments to historical teams. The race opponent uses the other variant for comparison.

## River and festival signs

- 128 hyacinth patches and 28 fallen banana stems drift at 0.24 m/s in seeded, irregular clusters outside the two racing lanes. The two instanced batches remain two vegetation draw calls.
- 572 waist-deep cheering spectators occupy ten compact, separated groups, five per bank, exclusively in the final 100 metres. Position rejection maintains space between people inside each group.
- Khmer banners use high-resolution canvas vector lotus, paddle and longboat illustrations with bright colors. Added ads retain the requested **Kuon Khmer** and **Angkor Soul** brand names, with Khmer supporting copy.
- Festival spelling reference: [Cambodian government festival notice](https://pursat.info.gov.kh/km/article/01a1349f-5bf3-7330-b36f-88957cd3534b). Construction/role choices above follow the owner's requested game interpretation.

## Verification

`npm run lint`, `npm test`, and `npm run build` pass. The pose test samples all nine derived clips at 96 phases, checks paired elbow clearance, hand-to-shaft contact, tucked kneeling feet, coach spacing, bow stance and steering angle. The standalone athlete GLB matches the calibrated seated clip without export resampling. The original source hashes and shirt topology pass the existing architecture gate.

Browser checks cover both construction variants in a two-boat 1,200 m demo (simulation advanced to both finishes), Vietnamese and Khmer setup, race launch, and 1180×820, 768×1024 and 1180×430 viewports. Screenshots are under `docs/qa/asset-roles/`. These are browser viewport checks, not measurements on a physical tablet.

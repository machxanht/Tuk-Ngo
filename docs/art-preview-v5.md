# V5: distinct 2D illustration and 3D comparison

The user rejected V4 because rendering the same 3D boat/people to images did not offer a visibly different art direction. The user chose soft illustration with clearly drawn people/boat and an independently authored motion cycle.

## Implementation

- `illustrated-ghe.mjs` draws the boat contour, near/far rails, seats, clothing folds, caps, faces, tapered limbs and paddles as Canvas2D paths. Gradient fills and outlines replace the GLB's lit mesh appearance.
- The owner's livery WebP maps continuously along the drawn hull; close view uses its central band. It is the only bitmap required by the illustration. No V4 render atlas or MakeHuman geometry is loaded by this scene.
- The 2D cycle has separate shoulder lean, blade path and shaft angle curves. Two 2D arms follow the hand positions on the drawn shaft. Entry/drive/exit/recovery are continuous across the loop. This is authored animation, not motion capture.
- Full view retains 50 rowers and five command/steering figures. Close view isolates one pair. Far bank, festival roofs, palms and water use separate drawn layers. Contact events place droplets and ripples at the waterline rather than at submerged blade tips.
- The current 3D GLB, model animation, downloads and orbit studio are preserved. The interface says “2D minh họa” and “3D” explicitly. Shared phase/cadence/pause controls do not imply shared artwork or pose curves.

## References and boundaries

Owner graphic clip: https://drive.google.com/file/d/1P4vzMy9rbXIHvB8kH6aNWpenhgbOcVoA/view . Its existing rectified WebP supplies the boat ornament. It is a user design variant, not a claim of exact historic race livery.

Real photograph visually inspected in Nhân Dân's report of 15 November 2024, caption “Đội ghe Nam Tum Nup 2 (số 12)”: https://nhandan.vn/gan-1-trieu-luot-nguoi-du-le-hoi-ooc-om-boc-dua-ghe-ngo-soc-trang-nam-2024-post845131.html . Green tops, white caps and close seating guide the illustration. No newspaper image is redistributed in the game, and no generated image is used as cultural evidence.

This change supplies the distinct illustration direction the user selected. It does not establish final art approval, measured race biomechanics, or physical-tablet performance. The 3D art is unchanged in this revision. The prior V4 source and evidence remain available for comparison.

## Acceptance checks

Inspect both directions at the same paused phase and save comparison images. Inspect the 2D motion across a full cycle, both views, water toggle, pause/reset, cadence and single-canvas cleanup. Check portrait 768×1024 and landscape 1024×768. Run TypeScript and the production build, then verify the public bundle and source persistence. Evidence is recorded separately under `docs/qa`.

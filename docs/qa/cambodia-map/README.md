# Cambodian map verification

The user approved real maps and field photos instead of unavailable local Google
Maps 3D control. See [source list](../../../public/assets/maps/cambodia-sources.md).

- `npm run lint`, `npm test`, `npm run build`: passed. The test chain includes
  mapped landmark ordering, continuous banks, bridge clearance and flag assets.
- Actual Edge WebGL renders of both venues: no page or shader errors; national
  flag textures loaded, time advanced, and unchanged hull selection preserved
  the inspection camera. Main landmark close views were visually inspected.
- Existing Cambodian scene regression: 24 venue/language/viewport combinations,
  2 AI race wins, 2 complete eight-team cups (three rounds each), search and
  map-isolated online selectors. No online queue/match or account write was made.
- Shirt geometry and twelve original source hashes: architecture checks passed.
- The last source change corrected the sign of the gable trim rotation. The final
  Vite build and map render check were repeated; gameplay regression evidence
  remains from the same unchanged gameplay/UI modules before that art-only fix.

The images are rendered game frames, not generated reference illustrations.
These checks do not establish physical-tablet FPS, a numerical visual-match
percentage, current official 2026 course boundaries or a Google 3D replica.

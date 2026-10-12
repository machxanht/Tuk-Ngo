# Coherent riverbank study V19

`src/race/coherent-bank-v19.mjs` exports `buildCoherentBank(scene, { materials } = {})`, returning `group`, `update(time)`, `dispose()` and `stats`. It builds a separate 50 m study and changes no existing course, lighting, athlete or crowd assets. The caller may pass the existing `loadBankMaterials(base)` result; this module clones its wall/tile/tin materials and retains externally owned textures. `base` can be passed without effect: loading remains the caller's responsibility.

The promenade occupies Z -2 to 4, the road Z 4 to 12, shop frontage approximately Z 13 and building backs Z 20. X runs -25 to 25; river is toward negative Z. Root should place sample people on the promenade and supply the river/sky/day lighting.

The visual vocabulary uses softened masonry, narrow lots of varied width/height, recessed shop entrances, timber shutters, balcony rails, simple shade awnings, sloped tile/tin roof planes and restrained ivory/teal/terracotta colors. Three broadleaf trees have branches and overlapping smooth leaf volumes; the coconut palm uses tapered flat leaflets on curved frond stems. This is authored procedural geometry informed by the requested regional building forms, not a measured or named local building reconstruction. No AI reference imagery, new third-party model or unverified downloaded texture was used. Optional textures are the project's existing licensed bank materials; their provenance remains in that loader's existing attribution.

Seven lots use one shared street section. Surface UVs on plaster and roof materials follow 2 m world coordinates; optional map contrast is reduced to 7% for painted plaster and 20% for roofs, with a small normal strength. Material cloning does not preserve the existing loader's onBeforeCompile callback, so this module explicitly reapplies its own restrained map blend. Window panes and shutter slots are simplified; shop interiors contain no merchandise and signs deliberately have no invented business names. Broadleaf crowns remain smooth leaf volumes rather than individual foliage, and the palm omits coconuts. These are sample-scale simplifications, not a complete vegetation or shop simulation.

Two rounded compact vehicles move at 2.2 m/s in opposite lanes, with rotating wheels. Their loop endpoints are at ±80 m, outside this 50 m patch. Vehicles hide beyond the road patch ends; the caller should not frame the patch end as a continuous full street. They have simplified cabin glazing and no animated drivers or traffic interactions.

## Verification

Actual Edge headless D3D11 renders, 1400×900, inspected directly:

- `E:/AI/Um Tuk/asset-studio/coherent-bank-v19/wide.png`
- `E:/AI/Um Tuk/asset-studio/coherent-bank-v19/near.png`
- `E:/AI/Um Tuk/asset-studio/coherent-bank-v19/near-time4.png`

External preview code and Playwright capture helper are in the same directory. Final captures use existing CC0 bank materials with the restrained blend above. The first preview caught inverted roof planes; pitch direction was corrected before final images. Broadleaf self-shadow acne was also removed by disabling receiveShadow for the merged leaf masses while preserving their cast shadows.

`node --check src/race/coherent-bank-v19.mjs` passed. `npm run lint` passed (`tsc --noEmit`; this is not a visual-quality test). All position, normal and UV arrays were finite in browser and direct Three.js construction. Geometry totals: **168,364 triangles**, **41 meshes/material submissions**, including the two cars. Static geometry merges by material; the small sample does not introduce a general traffic batching system.

At t=0 the cars were X=-15 and +18; at t=4 they were X=-6.2 and +9.2, matching 8.8 m travel in opposite directions. Direct dispose instrumentation observed disposal of all 58 unique owned geometry/material resources and zero remaining scene children. External texture ownership is preserved. No tablet frame-time claim is made; final integration with one athlete and three NPCs and parent camera/lighting still requires parent review.

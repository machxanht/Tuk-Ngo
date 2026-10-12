# V15: fair boat ends and focused Maspéro corridor

Owner request: smooth the uneven bow/stern curves, repair the wide scene assets, prioritize the race river and both banks, and investigate using Google Maps3D as a source.

## Google3D feasibility

Google's [Photorealistic3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles) is an API visualization product with billing/key/attribution requirements. Its [data policies](https://developers.google.com/maps/documentation/tile/policies) restrict offline storage/non-visualization uses; its [FAQ](https://mapsplatform.google.com/resources/blog/commonly-asked-questions-about-our-recently-launched-photorealistic-3d-tiles/) specifically excludes programmatically extracting recorded geometry/measurements into derivative products. No Google mesh was scraped, exported, reconstructed from tiles, or embedded into this game; no new billing account was enabled. Maspéro photorealistic tile coverage was not established in this pass.

The existing Three.js course instead uses licensed OpenStreetMap bank/bridge coordinates plus the previously inspected owner's real tournament footage and photographs. This gives a useful free layout reference without replacing the game renderer with a streaming map.

## Bow/stern diagnosis and change

The old natural cubic profile overshot the bow top guide and was clamped to1.38m, producing a flat last segment. Rise rates near the shoulders also varied strongly. The replacement top curve uses a quintic matching height/slope/curvature at absoluteX13.6m, then reaches the existing tip heights with positive0.18/0.24 slope and a smooth declining curvature. It changes only the unoccupied last1.5m at either end. The monotone old keel is retained; the main hull, support locations, actual endpoint dimensions and side taper stay.

`scripts/fair-hull-ends.mjs` appends replacement positions/normals for affected static hull/deck/rim/tassel primitives to the V13 template. It retains the entire original binary segment, animation JSON and skin definitions unchanged; it does not resculpt or repose the crew. V15 maximum vertical shift is about0.059m. Source/template is `ghe-ngo-crew-v15.glb`; the actor/garment revision remains V13. All8 team exports must be regenerated from this template before publication.

## Focused river and banks

Public derived data and ODbL attribution: `public/assets/maps/`. The two bridge-centres are projected to the existing400-unit C247–30/4 game reach. The source centre separation is about346m, so this is a scaled game layout, not a measured reconstruction. Bank polygon slices give approximately58–61game units of water width in the focus reach, replacing the former86-wide authored strip. The water mesh, bank slabs, promenades, roads, people and trees use the same bank transform. Bridge portal groups use their observed centreline directions. Each grandstand is anchored rigidly so its spectators/steps/canopy do not drift apart along the mapped bank.

The race remains1200m with two lanes. Detailed frontage/crowds are concentrated in X850–1400 around both bridges/stands; up-course scenery is simpler. Broad continuous land behind both roads prevents the old narrow scenery strip from ending abruptly. Invalid negative colour indices are guarded. House roofs now have ridges above eaves, rather than the previous inverted-V slope; corrugation follows each sloping panel. Clearances around oblique bridge approaches are widened.

The main/opposite stand shapes, C247 portals and30/4 ornament continue to use the actual-photo/video basis from [V8](maspero-scene-v8.md). Architectural elevations, completed30/4 cladding, heights and exact house identities remain approximate. The open-map data does not establish photorealistic building appearance. UI remains collapsed by default.

## Verification gates

Inspect paired V13/V15 bow/stern side and oblique renders; verify a positive top rise without a clipped plateau and unchanged occupied-region profile. Check all8 exported boats' clips, grips, feet, bibs and validator results. Exercise updated shore/stand/crowd/bridge cameras and the wide view at landscape/portrait sizes; inspect roofs/land continuity and river/boat masking directly. Run TypeScript and production build, then verify the public studio/game and downloaded-file hashes. Any unmatched historical geometry or untested physical-tablet performance must remain labelled as such.

### Validated local release

The template and all8 delivered GLBs have zero glTF validator errors/warnings and both authored rowing clips. Original animation/skin JSON and the V13 buffer prefix are retained unchanged. The final occupied profile is identical for absoluteX≤13.6m; sampled top curves have positive slopes and continuous join tangents/curvature. At49phases perclip,2,457,840 lower-leg vertices show no intrusion below the authored floor;196 caller-foot samples stay inside the hull, and maximum template grip gap remains0.00001242m. All8 exported files reopen and pass contact checks. The active template triangle count remains893,342.

TypeScript and the final production build pass. Six preset environment views and paired bow/stern side/oblique renders were directly reviewed. Production Edge at1024×768,768×1024 and800×600 retains the unobstructed UI, team selection, real download-hash matching, sprint water, and playable start/input/pause. The final build files match all8 exported source SHA hashes. No page or WebGL console errors were observed. The first development wide-view diagnostic precedes the added far background blocks; final production preset captures show the shipped scenery. Physical tablet hardware and full architectural/geographic fidelity remain untested.

# V16 camera, direction, crowd and Maspéro frontage

## Symptom and fix

Actual Edge playback reproduced the sky-only failure after the initial studio lap wrapped: boat X21.35 while camera X−1219.62/target X−1257.62. `seek(0)` positioned the camera, then the same animation frame applied the old lap displacement again. The wrapped frame now omits that second translation. A real180-second RAF-driven browser run crossed the wrap and kept overview target within4m of the selected root, with finite camera values and no page/WebGL errors. This was live rendering, not a mocked timestep proof.

Race distance stays0–1200; world bow travelsX2290→1090 towards−X. The main north-bank stand is on the crew's right. The start/finish markers, following view, GLB root rotation, wake direction and splash drift agree. Exact historic start-line geography remains approximate; direction follows the owner's correction. Boat source vertices/rigs and V15 exported team GLBs are retained.

Ambient elapsed time now drives river and crowd independently of boat play/pause and seeks. Boat phases/positions stayed fixed when paused while crowd elapsed time advanced. SixVAT activities have nonzero motion; hashed profile,clothing,colour,age,hair,phase,speed,intensity prevent index-based rows. The gender styling mapping was reviewed and corrected for profile14/15; compatible clothes/hair follow styling while colours/activities remain independently salted. Appearance remains stylized on the existing MakeHuman topology; this is not a photorealistic female/child population. Separate fixed hats were removed because age/pose changes made them float.

## Open footprint integration

OfficialOverture2026-09-23.1 bounded extract557 individual footprints,371Microsoft/176GoogleOpenBuildings/10OSM. Source and derived data are distributed underODbL with source records/attribution.318 are rendered after focus-boundary/road/bridge/stand exclusions. All source heights are unknown; heights,fronts,roofs are authored. Geometries merge into one additional mesh,13,300triangles. Finite geometry,1200m progress and right-side stand invariants passed. Road surfaces bend behind the stands; light poles avoid seating, bridge ramps meet street elevation. The2026 footprint data is not proof of unchanged2025 appearance.

## Verification and limits

TypeScript/build, gameplay regression, final production Edge at1024×768/768×1024/800×600, all six environment camera presets, actual GLB download hash matching, sprint splashes, playable start/input/pause and unobstructed default UI pass. Final production scenery captures were inspected directly. Physical tablet testing, photorealistic anatomical NPCs, exact facades and measured elevations remain unverified.

`docs/maspero-3d-source-options.md` records the inspectedDựánCửuLong Three.js/open-data approach and seven alternatives with primary documentation. No Google3Dtiles were extracted. Detailed commercial photorealistic coverage atMaspéro has not been established.

The standalone searchable roster lists61 organizer registration records, preserving source inconsistencies and separating ordinals from bibs. Khmer values are only native-source-attested pagoda base names; numeric display suffixes are authored from the organizer's numbered team labels. Remaining unverified fields are visibly marked. Current verification count is read from public/assets/data/roster-2025.json; the roster research document provides row-level sources.


Public verification: GitHub Pages release e54d3845fccc7aa981a0c84fed68c9e88756cf7f, workflow38256377306 succeeded. Actual public V16 renderer ran180seconds, crossed one automatic lap reset and kept selected overview target4m from the boat throughout, with no page/WebGL errors. Crowd/river elapsed time advanced while boat phases and positions remained fixed after pause. The public searchable roster rendered61 rows and source quality55native-attested(45press/10community),6pending; its search/region filtering worked. Evidence: public-check.json, public-camera-180s.json and public screenshots. Published bundle index-wrz-Ldu8.js matched production output.

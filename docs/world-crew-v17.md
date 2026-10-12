# V17 requested scene and crew improvements

## Delivered scope and remaining acceptance gates

The user requested dense festival spectators, moving road traffic, better riverbank town frontage, larger legible Khmer banners, distinct athlete faces, one standing controller cue per rowing cycle and separate stern steering motion. Existing race direction (VIP stand on right), accepted hull, kbach, gameplay and unobstructed default UI are retained. Public deployment is recorded after verification, not inferred from unit checks. Final game close views accepted the measured eye alignment.

## Map and spectators

Six tightly staggered pedestrian rows replace the former single sparse row outside the festival reach. IDs include bank/column/row and feed the established independent style/motion hashes. Grandstand aisles remain accessible. The two banks are split into separate80m LOD sections; detail now uses X/Z camera distance, preserving close human geometry without rendering the far bank as near geometry. Ambient movement continues while boats pause.

318 Overture footprints remain in the observed reach.308 original narrow street houses extend the race approach; doors/shutters, window framing, upper balconies, shade canopies, foundation strips and paved forecourts replace the former sparse fronts. All elevations and facade designs are authored, not a claim of exact2025 buildings. Generic photographic CC0 PolyHaven plaster and metal/tile diffuse/normal maps are licensed and credited in public/assets/maps/materials/ATTRIBUTION.md. No press pixels are shipped as game art. The raw open footprint dataset and attribution remain accessible.

The land top previously sat at1.39m, above the1.24m road, hiding portions of the road behind the VIP stand. Land is now1.23m and foundations meet building floors; roads render above it. Forecourt quads were corrected to face upward.

192 two-way ambient vehicles include139 scooters,35 cars and18 minivans. Riders have rounded anatomy and helmets. Six shared instanced traffic batches follow the same road bend, retain right-hand lanes and rolling spokes, and use distant endpoints with out-of-road culling. This is ambient traffic, without a collision simulator. Nearby real rendered samples and paused-boat before/after captures verify movement.

Main fascia banners grow to1.82m height and lower banners2.05m, use shorter nonrepeated text, Khmer font shaping, contrasting colours and anisotropic sampling. The new Biểu ngữ view shows readable lettering; Đường phố exposes street/traffic for inspection. Default UI still has only the single controls toggle and camera choices auto-close the panel.

## Crew changes and verification

55athletes perboat use16 baked head variants (jaw,cheek,nose,chin,brow,ear/asymmetry) with face-only tint/stubble; cap-contact scalp and neck boundaries stay fixed. The first diagnostic renderer wrongly flippedglTFUVs, making unrelatedatlaspixelslooklikefacialinjuries; its Vconversion was corrected. Actual game-eye inspection exposed a separate occlusion issue, resolved by measured orbital alignment: the110eyes moved down7.5–9.0mm with no forward shift, so pupils and iris render before the eyelid surface. Both phase-ray checks and actual game portraits atphase0.55 verify the correction. Counts alone do not establish portrait realism.

The standing coordinator now has49-key downbeat/recovery shoulder motion perrowingloop. Threehelmsmen holdnearvertical aft-directed steering shafts, withsmallindividual corrections; two-bone IK keeps both palms ongrips andfeet fixed. Rower/caller animation remains unchanged. Real references establish gross roles and brace, not measuredmocap trajectories. Existing4.2msteering shafts give deepimmersion; retained dimensions are authored.

Full49phase/bothclip support gate:2,457,840 lowerlegvertices,0hullintrusion, supporterrorunder0.01mm, optimizedgriperrorunder2.92mm, seatedcallerfeetinside. EightbakedteamGLBs were reopened toverify55actors,2clips,kits/kbach,caps,feet andgrips; actualdownloadhash checks useV17files.

FulluncappedglTFvalidation catcheserrors afterunusedlegacyobjects. TheV15baselinealreadyhas660nestedskinwarnings inits template and715 inexportedteams; V17 hasthesamecounts, allNODE_SKINNED_MESH_NON_ROOT, with0errors. OldermaxIssues100reports didnotestablishzero warnings. No issues are ignored in theV17gate. The acceptedhierarchy is retained andtestedthroughThree.js; genericviewer compatibility is notclaimedfromthesechecks.

FinalTypeScript/productionbuild, affectedworldgeometry/traffic checks, actualproductionEdge at1024x768/768x1024/800x600, teamselection/downloadhash, sprintwater andgamestart/input/pause pass. Physicaltablet hardware remains untested.


The people-inspection cameras now follow actual head facing after the course reversal, so seated/standing/controller/helm views show faces from the outboard front rather than retaining the old+X camera behind them.


Final production world gate reports 32549 spectator placements,16face types in each55-person crew,192vehicles,318mapped/308authoredfrontage buildings. Public acceptance remains to be recorded after release. Final ocular alignment and front-facing inspection cameras are in the shipped source.


The linked whole-boat art preview and GLB download now both point to V17; previously they loaded V15 and downloaded V12. The solo VĐV study remains explicitly labelled initial research; the current crew and roles can be inspected from the studio.

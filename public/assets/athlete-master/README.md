# Athlete source and proof

`athlete-master.glb` is the standalone animated athlete assembled in Blender.
Its one `Rowing` clip includes the body, cloth and paddle together.
`athlete-details.glb` contains the authored cap, hair and paddle used by the race.
`jersey-atlas.png` and `kit-print.png` are editable texture sources.

The editable Blender file is in the repository at `art/athlete/athlete-master.blend`.
The original body/skin/rig retain the MakeHuman CC0 attribution documented in
`../human/ATTRIBUTION.md`. The Khmer print uses the existing Noto Sans Khmer font
and the owner-requested text កូនខ្មែរ. Cap, paddle and hair-shell fitting are
authored for this project. Reference photographs are not included as textures.

The eight source role GLBs and exact connected-shirt topology remain unchanged.
`rowing-motion.glb` is the calibrated eight-clip runtime bundle: outboard rowing,
half-kneeling rear rowers and aft steering. This standalone GLB copies all 161
body/paddle samplers from its calibrated seated-port clip without resampling.
The shirt surface is sampled at the same motion keys. It is not motion capture or
a scan of a named competitor. Details, references and verification are recorded
in `docs/asset-workflow.md` in the source repository.

The current low seated proof uses tucked legs and a 1.22 m paddle. The original
1.52 m `athlete-details.glb` remains stock equipment; the boat derives the seated
paddle from it while retaining the two-hand grip.

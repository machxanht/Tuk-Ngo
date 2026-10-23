# D/F athlete comparison

The existing `/character-comparison/` page opens a moving 54-person crew on the canonical 30 m hull. Every athlete now uses the same D body, blue kit, short haircut and skin material; only the generic D/F face and its facial profile change. It includes 8 seated pairs, 17 kneeling pairs, a bow caller, a controller facing the stern and two helmsmen. Original D/F comparisons and a civilian NPC inspection are available in the same page.

`character-heads.mjs` caches head-only geometry in head bind coordinates, fits the broader F head to the common neck envelope, and masks the corresponding original D head triangles. Head geometry retains its facial morphs but has no body skeleton of its own. Face randomization preserves the exact same body geometry, proportions, eight shared role skeletons, kit and hairstyle. There are eight facial profiles from each approved source; F retains independent blinking and effort expressions. A shared skin material avoids a mismatched neck seam.

Full D/F bodies, seven skin tones, four hair options, five hair colors and variable proportions are reserved for the NPC inspection. Its 18 civilians share source meshes/textures, use 12 shirt and 8 trouser colors, and demonstrate nine activities: idle, wave, clap, cheer, point, talk, phone, walk and seated clapping. They have independent phases/speeds, blinking and head movements. Civilian motion measures each body's limb lengths; detached skeletons keep posing in rig coordinates while visible instances move on the promenade. The D civilian hem has a shared, longer casual fit outside the actual waistband. NPCs are an inspection sample, not thousands of new high-resolution spectators in the race map.

This crew inspection page does not replace the athletes in the cup race. No protected V32 shirt geometry or eight master rigs are modified. Hundreds of these full-resolution characters would still require LOD work; responsive browser checks are not physical-tablet frame-rate measurements.

## Files

- `d.blend`, `f.blend`: derived editable body skeleton, meshes, materials and F facial shape keys. The full original Snow rig remains in the external source cache.
- `jersey.png`: shared race-shirt artwork with the existing Khmer wordmark.
- `public/assets/character-comparison/d.glb`, `f.glb`: nine baked body clips per character; F also has a facial demonstration clip.
- `public/assets/character-comparison/hairstyles.glb`: Quaternius hair fitted to both skulls, mounted in animated head coordinates.
- `public/assets/character-comparison/manifest.json`: hashes, sizes, triangle counts and provenance.
- `public/assets/character-comparison/CREDITS.md`: licenses and adaptation credits. D's shirt uses D's own surface/weights; F's shirt and both characters' shorts derive from Snow.

## Rebuild

Use the existing Python with Pillow, Blender 5.2 and npm dependencies. Run from the repository root:

```powershell
python scripts/fetch-character-comparison.py
python scripts/prepare-character-comparison.py
$blenderComparison = '../tools/blender/blender-5.2.2-windows-x64/blender.exe'
& $blenderComparison --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-character-comparison.py -- --model d --inspect
& $blenderComparison --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-character-comparison.py -- --model f
& $blenderComparison --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/build-character-comparison.py -- --model d
node scripts/animate-character-comparison.mjs
node scripts/build-character-comparison.mjs
```

The fetch step reuses the existing Quaternius Standard ZIP at `../tools/asset-cache/coherent-v19/universal-base-standard.zip`. On a different machine, download the free Standard archive from the official Quaternius page and place it at `../tools/asset-cache/character-comparison/quaternius-standard.zip`. Snow downloads directly from its official source. No account or paid API is used. Sources and rest-GLB intermediates remain in the external cache; only final GLBs are served.

The bake keeps Snow's facial drivers until capture. Calling `animation_data_clear()` would also remove those drivers and break eyelid closure. Only DEF skin weights are retained; mask/corrective groups are not skeleton influences. The active **render** UV layer is used for Snow's skin instead of its tattoo-mask UV layer. Derived mesh bounds are not used to cull animated clothing at close camera distances.

`src/race/athlete-rowing.mjs` measures each character's own upper/lower arms and palm contact frames. It solves both grips against the same paddle, curls fingers around the shaft/T bar and bakes separate port/starboard, seated/kneeling, caller/controller and helm clips. The common crew uses the D versions of those clips. This is authored motion based on the existing real-video contact sheets, not captured motion. The D shirt follows D's torso/shoulder skin weights, with a finished collar/cuff/hem and a pelvis-weighted shorts waistband. Hair cap clearance uses radial skull intersections; nearest-point face projection can produce discontinuities around the ears/nose.

## Verify

Serve `public/` on localhost port 8778, then run `node scripts/test-character-comparison.mjs`. Set `CHARACTER_COMPARE_URL` to test the public page and `PLAYWRIGHT_MODULE` if needed. Checks cover the three unchanged final GLBs, hashes, normalized skin weights, clothing influences, native blink, 776 body-pose measurements per source, both palm contacts and arm reach. Browser checks cover face-only randomization with invariant body geometry/skeleton/dimensions, static head meshes, bounded caches, sampled foot/hull clearance, all nine moving NPC activities, walking routes/props, both rowing sides and postures, facial controls, playback, HTTP/console errors and three desktop/tablet layouts. Screenshots/reports go to `docs/qa/character-comparison/`; visual review remains necessary for shirt fit, finger contact and hair silhouettes.

The main app's TypeScript check remains `npm run lint`. The comparison viewer is bundled independently; it is not imported by the main game and does not add a character download to the main menu.

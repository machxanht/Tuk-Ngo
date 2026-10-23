# D/F athlete comparison

The standalone `/character-comparison/` page shows the actual D (Quaternius Standard Superhero Male) and F (Blender Studio Snow) characters. Both wear the same blue shirt/dark shorts and use the same seated rowing cycle, camera and light. F also exposes three baked native facial poses. Original hairstyles and proportions are preserved so that the difference between the source characters remains visible.

This is a selection prototype for one athlete, not an approved replacement for the full crew. No race modules, protected shirt geometry or master rigs are modified. The models require crew-level LOD/instancing work before replacing hundreds of athletes; a two-character browser check is not a tablet race performance benchmark.

## Files

- `d.blend`, `f.blend`: derived editable body skeleton, meshes, materials and F facial shape keys. The full original Snow rig remains in the external source cache.
- `jersey.png`: shared race-shirt artwork with the existing Khmer wordmark.
- `public/assets/character-comparison/d.glb`, `f.glb`: animated, optimized browser assets.
- `public/assets/character-comparison/manifest.json`: hashes, sizes, triangle counts and provenance.
- `public/assets/character-comparison/CREDITS.md`: original licenses and adaptation credits, including Snow-derived clothes on D.

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

## Verify

Serve `public/` on localhost port 8778, then run `node scripts/test-character-comparison.mjs`. Set `CHARACTER_COMPARE_URL` to test the public page and `PLAYWRIGHT_MODULE` if Playwright is not available from the existing browser-QA installation. The script checks real final GLBs, hashes, normalized weights, clothing bone influences, native blink displacement, a sampled rowing cycle, UI controls, HTTP/console errors and desktop/tablet layouts. Screenshots and reports are written to `docs/qa/character-comparison/`.

The main app's TypeScript check remains `npm run lint`. The comparison viewer is bundled independently; it is not imported by the main game and does not add a character download to the main menu.

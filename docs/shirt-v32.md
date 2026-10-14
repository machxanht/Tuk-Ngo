# Connected shirt V32 prototype

This isolated prototype replaces the tank-plus-sleeve overlay with one connected anatomical cloth surface. It has 533 vertices, 896 triangles, one connected component, and exactly four boundary loops: neckline, hem, and two cuffs. Boundary vertices have degree two; no edge has more than two incident faces. The original tank, armhole bindings and prints are hidden in prototype exports. Public assets and runtime code are unchanged.

## Reproduction

Using the installed Blender executable, run `--background --python scripts/build-shirt-v32.py`. `-- --topology-only` checks geometry without rebuilding clips. The full build writes four portable GLBs and source blends under `E:/AI/Um Tuk/asset-studio/garment-v32`: caller seated, controller standing, rower seated, and rower standing. Each contains anatomical bone keys plus 97 ordinary morph corrections across one second. Bone and morph tracks export as one scene clip; playing only bone tracks loses cuff correspondence.

Run `--background --python scripts/build-shirt-v32-reload.py` to import the actual exported GLBs and inspect 17 real clip poses per role, with three renders per role. `-- --no-render` runs the geometry diagnostic only. `-- --blend --no-render` compares source blend behavior. Its strict signed-distance assertion currently fails, intentionally: the folded posed anatomical source gives negative nearest-face signed distances even in source blends. This remains a diagnostic limitation, rather than proof that all garment faces avoid all source intersections. The separate distance check is below 6 mm for all four reloaded clips, with a maximum of 5.50044 mm. Reviewed caller and rower renders show continuous shoulders/armpits without the former overlaid strap flap. Final runtime inspection remains required.

## Runtime correspondence data

Run `node scripts/build-shirt-v32-runtime.mjs`. It reads **the actual current** `public/assets/illustrated-v22/athlete-rig-v27.glb`, not an independently triangulated Blender mesh, then writes compact `shirt-runtime-original-glb.json`. Original endpoint positions, normals, joint indices and weights are checked against GLB accessors. Source SHA256 is recorded; regenerate if the source changes.

Coordinates are GLTF Y-up bind coordinates; bow is +Z, corresponding to Blender -Y. The source anatomical mesh has identity bind-node transform. The JSON provides:

- `indices`, and `vertices` with cloth position, normalized normal, UV and `sleeveMix`.
- Each vertex's `endpoints`: source vertex index, barycentric weight, original source position/normal, and four source joint indices/weights.
- `jointNames` to remap source indices onto the current 53-bone master skeleton.
- `normalOffsetM=0.0055`, topology and source checksum.

Evaluate each endpoint independently with its **original** source skin weights, then interpolate the posed endpoints:

```text
cloth = sum(endpoint.baryWeight *
            skin(endpoint.position + 0.0055 * endpoint.normal,
                 endpoint.jointIndices, endpoint.jointWeights))
```

Do not interpolate skin weights first and skin the already interpolated position: that introduces the measured mixed-LBS error. Current topology uses at most two endpoints per vertex; the consumer may reserve three for future multi-plane intersections. This shader path avoids 97 per-actor morph targets. The parent owns validation against all actual master rigs after integration.

`sleeveMix` blends the existing palette jersey and sleeve colors around the anatomical upper-arm seam. The prototype uses caller blue only; the red jersey/white sleeve Tratim palette should use those existing palette colors through this blend, not new historical colors or strength assumptions.

## Collar and print integration

The neckline is a continuous cut boundary. Rebuild a thin collar following its ordered boundary loop, with weights from the same garment vertices; do not restore the old tank armhole bindings. The prototype deliberately omits printed meshes while verifying geometry. Retain the existing print artwork and chest placement, project it onto the new shirt's front surface in bind space, then transfer the shirt's endpoint correspondence or anatomical weights. The planar UVs are sufficient for a prototype/color mapping, but are not a production shirt pattern atlas; detailed front/back artwork needs a dedicated UV layout or projected decals. Collar trim and print projection are integration work, not completed prototype features.

## Limits

The prototype is fitted anatomical fabric, not a loose cloth simulation. Four role clips are exported and reloaded; the runtime endpoint path still needs the parent's all-eight-master-rig verification and direct public-link inspection. No production readiness or universal collision-free proof is claimed. Current face/cap appearance in these proof renders remains the generic source anatomy; parent face work is separate.

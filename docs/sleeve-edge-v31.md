# Sleeve cuff clipping V31

`shortSleeves` now intersects anatomical body triangles with a cuff plane at 78% of the shoulder-to-elbow bind segment. It triangulates the retained polygon instead of retaining complete triangles by centroid, eliminating projecting cuff triangles. Shoulder/armhole coverage remains the existing anatomical surface selection; there is no detached tube or added ring.

Original vertices preserve source skin indices, weights, normals and UVs. New cuff intersections interpolate normal/UV and source barycentric correspondence. Skin influences are combined by joint ID, the strongest four are normalized. Actual source test discarded zero weight. Position offset remains 4.5 mm along the original surface normal, interpolated across each intersected edge. The cuff plane clips the already offset surface, so all intersection vertices remain coplanar.

Run `node scripts/check-sleeve-edge-v31.mjs`. The test reads the existing V27 source anatomical body and bind matrices, checks finite data, normalized legal weights, cuff coplanarity, and correspondence under five synthetic arm/clavicle poses. It compares new sleeve vertices to barycentric points on the posed source triangles. **Exact nearest-original-vertex checks no longer apply to newly inserted intersection vertices.** Original vertices still retain exact source correspondence.

Measured: 301 vertices, 451 triangles, 66 cuff intersections; maximum cuff plane deviation 0.000000051 m; maximum posed source correspondence distance 0.004673 m, below the 0.006 m acceptance limit; no discarded skin weight. These synthetic poses exercise skin deformation, but final exported caller/rower render inspection remains necessary to establish visual quality and shoulder coverage in the runtime's specific poses.

Parent integration supersedes the original .78/synthetic-only result: final cuff .55, proximal torso coverage, normalized intersection normals, shader endpoint correction, and nine portable caller morph targets. Actual clip testing exposed ~16mm naive interpolation drift; final runtime correspondence is under4.502mm, and reloaded GLB under4.501mm. See docs/hybrid-v31.md and its actual-clip evidence.

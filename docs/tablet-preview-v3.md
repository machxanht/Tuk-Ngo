# Tablet preview V3

Requested result: use a freely licensed existing humanoid, render river/paddle splashes, keep source/assets in `machxanht/Tuk-Ngo`, and publish a tablet test link.

The default river preview and fullscreen `?demo=race` use Quaternius Superhero Male from Universal Base Characters. CC0 is confirmed at the original author's site; the pack license and repack provenance are preserved. The adapter retains mesh/skin weights, colors the uniform, seats the character with bone rotations, closes fingers and solves arm IK with imported segment lengths. Steering grips follow each steersman's hip height.

The boat uses the owner's clip-derived Kbach/black/gold/red design. A 1,200m river adds an animated surface, banks, instanced trees/buoys and a simplified grandstand. Droplets and expanding ripples emit at blade/water crossings and during the submerged drive. These are visual effects, not measured fluid dynamics.

The original reference panels/utilities remain. React/Vite/Three.js remain the stack.

Verification: TypeScript check, production build, 81-phase rig/hull check, 55 roles, imported mesh source, splash emission, pause/reset, camera modes, splash toggle and portrait/landscape tablet viewports. Public deployment is verified separately after publication. Physical tablet performance must be tested on the user's device.

A live-scene check exposed grips being treated as world positions after the boat moved. The adapter now converts actor-local grips and shaft directions to world space. The rig check samples another 81 phases at x=650m/z=-18m with a yaw rotation; the live scene reports its current hand gap. The exported GLB is at the origin, retains the same skeleton animation, and uses original WebP pixels with converted UV orientation.

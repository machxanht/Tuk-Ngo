# V25: continuous 3D boats/athletes on the painted festival

The user's accepted painted palette is retained. The four independently drawn athlete poses were replaced by actual skinned geometry, continuous motion, positive-scale side variants and real boat occlusion. The public test URL remains `/assets/illustrated-v22/` and the canonical root routes there.

Rebuild from the existing licensed anatomical Blender source:

```powershell
& '../tools/blender/blender-5.2.2-windows-x64/blender.exe' --background --python-exit-code 1 --python scripts/build-hybrid-athlete-v25.py -- --output '../asset-studio/hybrid-v25'
node scripts/pack-hybrid-v25.mjs
```

Editable prototype, full per-role exports and numeric build report are saved under `../asset-studio/hybrid-v25/`; all source scripts and packaged game GLBs are in the repository. Do not publish unrelated pending V21 work. The publisher stages the current illustrated folder against the latest Pages parent.

One geometry file and eight small role files total 5,330,236 bytes including the accepted hull. Eight pose masters share their skeletons across a 55-person crew; solid garment/face/cap/eye surfaces are consolidated and rigid paddles are instanced. Two boats are drawn with independent phase/tempo on a transparent offscreen WebGL canvas, then composited between the existing far/near painted banks. A water depth ring excludes the dry hull interior. No orbit camera is used. Runtime hull UVs sample the approved image's actual opaque/red-rail bands, retaining the source image pixels.

The prototype was directly inspected at catch, drive, exit and recovery. Garment trim was corrected from triangular coloured patches to continuous binding geometry, cap paint was separated from scalp paint, standing paddles lengthened to 1.75 m and stern oars to 4.2 m. Recovery feathering now lifts the blade; helmsmen sweep aft slowly. Caller feet remain in the hull, facing the crew; controller uses a raised support board and distinct blue kit. Head/cap variation is geometric and modest, not a claim of distinct scanned people.

Real browser checks compare arm rotations between adjacent sub-poses and measure exported palm-to-grip contact, fixed ankles, race progress/finish, replay, practice, pose scrub, fullscreen and tablet-sized layouts. Latest exported contact samples measured 1.913 mm maximum palm gap and zero ankle drift. Direct visual evidence is required alongside these numbers. The whole race ran to completion on the browser clock in 46.55 seconds at approximately 30 headless desktop fps. Physical tablet performance has not been measured. `athlete-continuous-v25.webm` is a six-second recording of the actual demo canvas, linked from the asset gallery.

Crowd/street artwork remains the existing painted set; crowd gestures are still two-pose animations. Complete player-controlled racing, sound, verified team-specific kits/kbach and full crowd rigs remain separate outstanding work.

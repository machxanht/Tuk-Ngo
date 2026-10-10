# V6: preserve the 3D boat and correct the crew motion

The owner prefers the 3D hull and rejected the V4 crew movement and V5 2D boat. The active preview returns to 3D. The 2D illustration remains a historical experiment rather than an approved art direction.

## Diagnosis and change

The former grip path put the top fist beside the face and the lower fist too close to its shoulder during recovery. A representative rower at phase 0.74 had a 13.55° interior elbow angle. The old contact checks passed because hands touched the shaft, arm lengths stayed fixed and the shaft cleared the hull. Those checks did not constrain joint posture.

The former arm solver aligned only each bone's direction and retained arbitrary axial twist. V6 constructs each arm's orientation using the source mesh's elbow hinge plane and the solved bend plane. It solves to the fist centre using forearm plus palm length, so the palm continues the forearm rather than flexing sideways toward a radial shoulder-to-grip vector. The upper hand wraps the T handle; the lower hand wraps the shaft.

The new forward handle path separates the fist from the head and keeps the elbow away from the tightly folded recovery pose. The paddle's broad face is oriented against boat travel during the pull. Recovery roll is small rather than a 90° spin. Periodic monotone Hermite curves preserve continuous velocity across authored phase keys. Torso lean and blade lift are reduced to fit the existing body and paddle dimensions.

No athlete source mesh, skin weights or garment topology changed. The accepted hull's position, normal, UV and triangle-index buffers are byte-identical to V4 after GLB deduplication. The original owner livery WebP is unchanged. `docs/qa/hull-preservation-v6.json` records the buffer and asset hashes.

## Evidence and limits

Owner shape/livery clip: https://drive.google.com/file/d/1P4vzMy9rbXIHvB8kH6aNWpenhgbOcVoA/view . This graphic design clip has no athlete motion.

Real appearance reference: https://nhandan.vn/gan-1-trieu-luot-nguoi-du-le-hoi-ooc-om-boc-dua-ghe-ngo-soc-trang-nam-2024-post845131.html . The green uniform/white caps and close paired seating guide the generic crew.

Real motion reference visually viewed in the browser: Giang trần TV, https://www.youtube.com/watch?v=P5FvDeN7vow . The race is shown from the bank, so it supports broad stroke sequence and group rhythm rather than precise joint measurements. No newspaper/video pixels or generated images are used as athlete textures or motion capture.

The motion is authored. The numerical bounds below are regression checks for this rig, not clinical biomechanics or measured historical race values. Quality approval remains with the owner. The generic MakeHuman bodies and skinning still have close-view limitations, and no physical tablet has been tested in this session.

## Verification

`verifyBoat` samples contact/clearance at 81 phases at the origin and after translation/yaw. A separate 161-phase posture check rejects elbow folding/locking, excessive wrist flexion, fist proximity to the head joint and abrupt arm joint rotation. It retains the 55-person/25-seat and watertight hull checks.

Visual inspection covers oblique, side and front views through the complete cycle. The exported GLB is loaded by the actual tablet preview and inspected again, including pause, reset, phase scrubbing, water contact effects, recording and portrait/landscape layouts. Structural glTF validation and TypeScript/build checks supplement those observations. QA artifacts are stored under `docs/qa`; historical V4/V5 evidence is preserved.

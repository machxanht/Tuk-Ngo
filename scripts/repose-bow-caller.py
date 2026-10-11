"""Update the editable V11 crew without changing its accepted anatomy/other roles.
The sprint caller uses the same corrected leg tracks during the GLB merge.
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

repo = Path(__file__).resolve().parent.parent
out = repo.parent / 'asset-studio/crew-v12'
out.mkdir(parents=True, exist_ok=True)
support = {a['id']: a for a in json.loads((out/'support-plan.json').read_text())}
code = (repo/'scripts/build-role-crew.py').read_text(encoding='utf8')
start = code.index('def direction(')
exec(code[start:code.index('for frame in range(1,50):', start)])

bpy.ops.wm.open_mainfile(filepath=str(repo/'assets/blender/crew-v11.blend'))
scene = bpy.context.scene
caller = next(a for a in scene.objects if a.get('role') == 'BOW_CALLER')
rig = next(c for c in caller.children if c.type == 'ARMATURE')
scene.frame_set(8)
foot_orientation = {s: rig.pose.bones['foot_'+s].matrix.to_quaternion().copy() for s in ['l','r']}
old_hip = (caller.matrix_world @ rig.matrix_local @ rig.pose.bones['pelvis'].head).z
plan = support[1]
caller.location.x = plan['x']
caller.location.z += plan['hip'] - old_hip
caller['footPlacement'] = 'both feet inside open hull; seated at foredeck edge facing crew'
for frame in range(1,50):
    scene.frame_set(frame)
    planted_legs(caller, rig)
    for bone in rig.pose.bones:
        bone.keyframe_insert('rotation_quaternion', frame=frame, group=bone.name)
scene.frame_set(8)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(repo/'assets/blender/crew-v12.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'crew-only.glb'), export_format='GLB',
    export_extras=True, export_animations=True, export_animation_mode='SCENE',
    export_anim_scene_split_object=False, export_frame_range=True,
    export_force_sampling=True, export_apply=False)
print('Caller updated: seated, feet down inside hull; all other actors retained', flush=True)

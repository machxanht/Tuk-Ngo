import bpy,sys
from pathlib import Path
from mathutils import Vector
repo=Path(__file__).resolve().parent.parent;out=repo.parent/'asset-studio/crew-v17-motion'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out/'ghe-ngo-crew-v17-motion.glb'))
s=bpy.context.scene;s.world=bpy.data.worlds.new('QA');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.25,.25,1)
for pos in [(0,-6,10),(-10,5,8)]:
 d=bpy.data.lights.new('QA','AREA');d.energy=1600;d.size=8;o=bpy.data.objects.new('QA',d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('QA');cam=bpy.data.objects.new('QA',d);s.collection.objects.link(cam);s.camera=cam;d.type='ORTHO';s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=True;s.render.resolution_x=900;s.render.resolution_y=600
for role,target,loc in [('controller',(3.75,0,1.4),(5,-5,3.5)),('helms',(-12,0,1.2),(-9,-6,4))]:
 if '--helms-only' in sys.argv and role!='helms':continue
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();d.ortho_scale=5
 for phase in [0,.25,.5,.75]:
  # Import converts glTF seconds to scene FPS; source has49keys, not49frames.
  s.frame_set(round(phase*.75*s.render.fps));s.render.filepath=str(out/f'{role}-{phase:.2f}.png');bpy.ops.render.render(write_still=True)

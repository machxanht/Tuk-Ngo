import bpy,sys,math
from pathlib import Path
from mathutils import Vector
repo=Path(__file__).resolve().parent.parent;out=repo/'docs/qa/crew-v11';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(repo/'public/assets/ghe-ngo/ghe-ngo-crew-v11.glb'))
scene=bpy.context.scene;scene.frame_set(8)
scene.world=bpy.data.worlds.new('Role_QA_World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.20,.25,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
for name,location,power,size in [('Key',(6,-12,20),2800,15),('Fill',(-8,8,12),2200,12)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=location;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Role_QA_Camera');cam=bpy.data.objects.new('Role_QA_Camera',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO'
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=700;scene.render.resolution_percentage=100
for name,target,location,scale in [('crew-overview',(0,0,1),(4,-24,13),34),('seated-standing-transition',(4.5,0,1.2),(7,-6,4.4),8),('stern-helmsmen',(-12,0,1.2),(-9,-6,4.5),7),('bow-caller',(11.5,0,1.0),(14,-5,3.2),6)]:
    target=Vector(target);cam.location=location;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale;scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)

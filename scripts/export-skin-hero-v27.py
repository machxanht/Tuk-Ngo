"""Keep the saved working geometry/rig, bind licensed skin so GLB exports its UVs."""
import bpy,json,importlib.util
from pathlib import Path
root=Path(__file__).resolve().parent.parent;out=root.parent/'asset-studio/hybrid-v27';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root.parent/'asset-studio/hybrid-v25/athlete-prototype-v25.blend'))
body=bpy.data.objects['Athlete_Study_Anatomy_CC0'];mat=body.data.materials[0];node=mat.node_tree.nodes.get('Principled BSDF')
image=bpy.data.images.load(str(root/'assets/source/makehuman/young_lightskinned_male_diffuse3.png'),check_existing=True);image.colorspace_settings.name='sRGB'
texture=mat.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image;mat.node_tree.links.new(texture.outputs['Color'],node.inputs['Base Color'])
body.data.uv_layers.active_index=0
spec=importlib.util.spec_from_file_location('motion',root/'scripts/hybrid-motion-v25.py');motion=importlib.util.module_from_spec(spec);spec.loader.exec_module(motion)
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');paddle=scene.objects['Dam_Wood_152cm'];rig.location=(0,0,0)
motion.build_motion(rig,paddle,scene,'seated',-1,'rower');scene.frame_set(1);bpy.ops.object.select_all(action='SELECT')
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'athlete-source-v27.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'athlete-source-v27.glb'),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True,export_apply=True)
print('V27_SKIN_EXPORT '+json.dumps({'uvLayer':body.data.uv_layers.active.name,'sourceUVLoops':len(body.data.uv_layers.active.data),'output':str(out/'athlete-source-v27.glb')}))

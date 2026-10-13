"""Rebuild the illustrated project's athlete as a shared skinned 3D prototype.
Blender --background --python this_file -- --output DIR. Existing sources stay intact.
"""
import argparse,importlib.util,json,sys,math
from pathlib import Path
import bpy,bmesh
from mathutils import Matrix,Vector
from mathutils.bvhtree import BVHTree

parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--geometry-only',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parent.parent
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,repo/'scripts'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
motion=module('hybrid_motion','hybrid-motion-v25.py')
bpy.ops.wm.open_mainfile(filepath=str(repo/'assets/blender/athlete-v20.blend'))
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');body=scene.objects['Athlete_Study_Anatomy_CC0'];paddle=scene.objects['Dam_Wood_152cm']
rig.location=(0,0,0);rig.animation_data_clear();paddle.animation_data_clear()
for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
for obj in list(scene.objects):
    if obj.type in {'CAMERA','LIGHT'}:bpy.data.objects.remove(obj,do_unlink=True);continue
    obj.animation_data_clear()
    if obj.type=='MESH' and obj.data.shape_keys:obj.shape_key_clear()
bpy.context.view_layer.update()

# Cut the new cloth from the continuous anatomical weight field. Smooth the
# control surface before the armature, keeping shoulder openings sewn together.
garments=module('hybrid_garments','rebuild-hero-garments-v20.py')
garment_report=garments.replace_garments_v20(rig,body,scene)
shirt=scene.objects['Competition_Tank_Top_Loose'];shorts=scene.objects['Competition_Shorts_Loose']
for obj in [shirt,shorts]:
    arm=next(m for m in obj.modifiers if m.type=='ARMATURE');obj.modifiers.remove(arm)
    bpy.context.view_layer.objects.active=obj
    sub=obj.modifiers.new('Smooth_Sewn_Surface_V25','SUBSURF');sub.levels=1;sub.render_levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    arm=obj.modifiers.new('Continuous_Anatomical_Skin','ARMATURE');arm.object=rig
    for face in obj.data.polygons:face.use_smooth=True

# Fresh continuous binding loops replace the sharp old green seams.
def colour_material(name,rgb):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*rgb,1);mat.use_nodes=True
    node=mat.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=(*rgb,1);node.inputs['Roughness'].default_value=.9
    return mat
green=colour_material('Painted_Vest_V25',(.028,.38,.18));navy=colour_material('Painted_Shorts_V25',(.033,.064,.087));trim=colour_material('Painted_Ivory_Binding_V25',(.77,.73,.54))
shirt.data.materials.clear();shirt.data.materials.append(green);shorts.data.materials.clear();shorts.data.materials.append(navy)
for face in shirt.data.polygons:face.material_index=0
for obj in scene.objects:
    if obj.type=='MESH' and obj.name.startswith('Tank_Top_Sewn_Binding'):
        obj.data.materials.clear();obj.data.materials.append(trim)

# Project the existing, properly licensed Khmer print onto the new garment.
tree=BVHTree.FromPolygons([v.co for v in shirt.data.vertices],[p.vertices[:] for p in shirt.data.polygons])
for obj in scene.objects:
    if obj.type!='MESH' or not obj.name.startswith('Uniform_Print'):continue
    back='Khmer' in obj.name
    for v in obj.data.vertices:
        hit,_,_,_=tree.ray_cast(Vector((v.co.x,.5 if back else -.5,v.co.z)),Vector((0,-1 if back else 1,0)))
        if hit is not None:v.co.y=hit.y+(.004 if back else -.004)
    garments.transfer_weights(obj,shirt,rig)

# A complete anatomical face/fingers survive the LOD. Weld physical seams
# before collapse, preserving UV seams on loops instead of detached tiles.
triangles={}
for obj in scene.objects:
    if obj.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    if obj==body or obj in [shirt,shorts] or obj.name.startswith(('Eye_','Tank_Top_Sewn_Binding')) or obj.name=='Dam_Long_Rounded_Blade':
        arms=[m for m in obj.modifiers if m.type=='ARMATURE']
        for m in arms:m.show_viewport=False
        bpy.context.view_layer.objects.active=obj
        dec=obj.modifiers.new('Shared_Crew_LOD_V25','DECIMATE');dec.ratio=.045 if obj==body else .03 if obj in [shirt,shorts] else .18 if obj.name.startswith('Tank_Top') else .12 if obj.name.startswith('Dam_') else .25
        bpy.ops.object.modifier_apply(modifier=dec.name)
        for m in arms:m.show_viewport=True
    for f in obj.data.polygons:f.use_smooth=True
    triangles[obj.name]=sum(len(p.vertices)-2 for p in obj.data.polygons)

# Keep the source UV but use a bright artistic albedo rather than the old
# darkened skin texture. Subtle vertex variation follows the face and limbs.
skin=colour_material('Painted_Skin_V25',(.56,.31,.15));body.data.materials.clear();body.data.materials.append(skin)
colors=body.data.color_attributes.new(name='Painted_Skin_Tones',type='FLOAT_COLOR',domain='POINT')
for v,c in zip(body.data.vertices,colors.data):
    shade=.94+.06*math.cos(v.co.z*7+v.co.x*9);c.color=(shade,shade,shade,1)
nodes=skin.node_tree.nodes;node=nodes.new('ShaderNodeVertexColor');node.layer_name=colors.name;skin.node_tree.links.new(node.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
for obj in scene.objects:
    if obj.type=='MESH':
        obj['hybridRevision']='V25';obj['component']='athlete' if obj.parent==rig else 'paddle'

prototype=out/'athlete-prototype-v25.blend';bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(prototype))
roles=[('seated-port','seated',-1,'rower'),('seated-starboard','seated',1,'rower'),('standing-port','standing',-1,'rower'),('standing-starboard','standing',1,'rower'),('caller','seated',-1,'caller'),('controller','standing',-1,'controller'),('helm','standing',-1,'helm'),('helm-starboard','standing',1,'helm')]
reports={}
for label,posture,side,role in roles:
    bpy.ops.wm.open_mainfile(filepath=str(prototype));scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');paddle=scene.objects['Dam_Wood_152cm'];rig.location=(0,0,0)
    reports[label]=motion.build_motion(rig,paddle,scene,posture,side,role)
    scene.frame_set(1);bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(out/(label+'.glb')),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True,export_apply=True)
    if args.geometry_only:break
report={'revision':'hybrid-v25','geometryTriangles':triangles,'garment':garment_report,'motion':reports,'source':'Existing MakeHuman CC0 anatomy; regenerated smooth garment and new contact-calibrated motions','limitations':['Authored reference motion, not motion capture','Direct moving visual inspection required']}
(out/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({'triangles':sum(triangles.values()),'clips':list(reports)},ensure_ascii=False),flush=True)

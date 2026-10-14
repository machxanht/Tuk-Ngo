"""Extract compact static Quaternius heads from already licensed V20 NPCs."""
import bpy,json,bmesh,re
from pathlib import Path
from mathutils import Vector
repo=Path(__file__).resolve().parent.parent;out=repo/'public/assets/athlete-identities';out.mkdir(parents=True,exist_ok=True);records=[]
for identity in ['casual-man','beach-man','farmer-man','punk-man']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(repo/f'public/assets/coherent-v20/npcs/{identity}.glb'));scene=bpy.context.scene
 meshes=[o for o in scene.objects if o.type=='MESH' and 'head' in o.name.lower()]
 if not meshes:raise RuntimeError('No explicit head mesh '+identity)
 kept=[]
 for o in meshes:
  evaluated=o.evaluated_get(bpy.context.evaluated_depsgraph_get());d=bpy.data.meshes.new_from_object(evaluated);obj=bpy.data.objects.new('Identity_'+identity,d);scene.collection.objects.link(obj);obj.matrix_world=o.matrix_world.copy();kept.append(obj)
  bm=bmesh.new();bm.from_mesh(d);allowed={i for i,m in enumerate(d.materials) if re.match(r'^(Skin|Hair|Eye|Eyebrows)',m.name)};bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index not in allowed],context='FACES');bm.to_mesh(d);bm.free()
 points=[o.matrix_world@o.data.vertices[i].co for o in kept for p in o.data.polygons if o.data.materials[p.material_index].name.startswith('Skin') for i in p.vertices];lo=Vector(tuple(min(v[k] for v in points) for k in range(3)));hi=Vector(tuple(max(v[k] for v in points) for k in range(3)));center=(lo+hi)/2;size=hi-lo
 # Baseball cap already provides crown/headwear. Keep only side/back hair
 # below its fit line; remove tall punk spikes and source farmer headwear.
 for o in kept:
  bm=bmesh.new();bm.from_mesh(o.data);hair={i for i,m in enumerate(o.data.materials) if m.name.startswith('Hair')};bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index in hair and any((o.matrix_world@v.co).z>hi.z-size.z*.40 for v in f.verts)],context='FACES');bm.to_mesh(o.data);bm.free()
 for o in kept:
  matrix=o.matrix_world.copy()
  for v in o.data.vertices:
   p=matrix@v.co-center;v.co=(p.x/size.x,p.y/size.y,p.z/size.z)
  o.matrix_world.identity()
  bpy.context.view_layer.objects.active=o;modifier=o.modifiers.new('Smooth_Head_LOD','DECIMATE');modifier.ratio=.45;bpy.ops.object.modifier_apply(modifier=modifier.name)
  for polygon in o.data.polygons:polygon.use_smooth=True
 for o in list(scene.objects):
  if o not in kept:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.select_all(action='SELECT');file=out/f'{identity}-head.glb';bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',export_animations=False,export_extras=True)
 records.append({'id':identity,'file':file.name,'bytes':file.stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in kept),'source':f'../coherent-v20/npcs/{identity}.glb','license':'CC0-1.0'})
(out/'manifest.json').write_text(json.dumps({'version':21,'license':'CC0-1.0','officialSource':'https://quaternius.com/packs/ultimatemodularcharacters.html','models':records},indent=2))

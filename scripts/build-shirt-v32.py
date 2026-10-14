"""Connected anatomical shirt prototype, isolated outputs; no runtime edits."""
import bpy,bmesh,math,json,importlib.util,sys
from pathlib import Path
from mathutils import Vector,Matrix
repo=Path(__file__).resolve().parent.parent
out=repo.parent/'asset-studio/garment-v32';out.mkdir(exist_ok=True,parents=True)
bpy.ops.wm.open_mainfile(filepath=str(repo.parent/'asset-studio/hybrid-v27/athlete-source-v27.blend'))
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');body=scene.objects['Athlete_Study_Anatomy_CC0']
rig.location=(0,0,0);rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
body.animation_data_clear()
if body.data.shape_keys:body.shape_key_clear()
for v in body.data.vertices:
 influences=sorted([(g.group,g.weight) for g in v.groups if g.weight>0 and body.vertex_groups[g.group].name in rig.data.bones],key=lambda pair:pair[1],reverse=True)
 keep=dict(influences[:4]);total=sum(keep.values())
 for g in list(v.groups):
  if g.group not in keep:body.vertex_groups[g.group].remove([v.index])
 for group,weight in keep.items():body.vertex_groups[group].add([v.index],weight/total,'REPLACE')
bpy.context.view_layer.update()
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.verts.ensure_lookup_table();bm.verts.index_update();bm.normal_update()
# Persist the identical triangulation into this isolated exported body copy.
# Otherwise glTF chooses another diagonal on nonplanar source quads, breaking
# barycentric garment correspondence by up to a centimetre after reload.
bm.to_mesh(body.data);body.data.update()
layer=bm.verts.layers.deform.active
arms={s:(rig.data.bones['upperarm_'+s].head_local.copy(),rig.data.bones['lowerarm_'+s].head_local-rig.data.bones['upperarm_'+s].head_local) for s in ('l','r')}
def record(v):return (v.co.copy(),v.normal.copy(),{body.vertex_groups[i].name:w for i,w in v[layer].items()},[(v.index,1.)])
def mix(a,b,t):
 weights={n:a[2].get(n,0)*(1-t)+b[2].get(n,0)*t for n in set(a[2])|set(b[2])};refs={}
 for i,w in a[3]:refs[i]=refs.get(i,0)+w*(1-t)
 for i,w in b[3]:refs[i]=refs.get(i,0)+w*t
 return(a[0].lerp(b[0],t),a[1].lerp(b[1],t).normalized(),weights,list(refs.items()))
def neck(r):
 p=r[0];front=1.31+.10*(p.x/.085)**2;back=1.397+.05*(p.x/.085)**2;blend=max(0,min(1,(p.y+.08)/.16));return front*(1-blend)+back*blend-p.z
def cuff(r,s):
 p=r[0];a,axis=arms[s];sign=1 if s=='l' else -1
 # Medial torso is untouched; the arm halfspace cuts only its own side.
 return max(min(.24-abs(p.x),1.12-p.z),.10-p.x*sign,(.72-(p-a).dot(axis)/axis.length_squared)*axis.length)
fields=[lambda r:r[0].z-.98,neck,lambda r:cuff(r,'l'),lambda r:cuff(r,'r')]
verts=[];faces=[];records=[];lookup={}
for f in bm.faces:
 poly=[record(v) for v in f.verts]
 for field in fields:
  clipped=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):
   fa,fb=field(a),field(b)
   if fa>=0:clipped.append(a)
   if (fa>=0)!=(fb>=0):
    lo,hi=0.,1.
    for _ in range(24):
     t=(lo+hi)/2
     if (field(mix(a,b,t))>=0)==(fa>=0):lo=t
     else:hi=t
    clipped.append(mix(a,b,(lo+hi)/2))
  poly=clipped
  if not poly:break
 if len(poly)<3:continue
 ids=[]
 for r in poly:
  p=r[0]+r[1]*.0055;key=tuple(round(x,7) for x in r[0])
  if key not in lookup:lookup[key]=len(verts);verts.append(tuple(p));records.append(r)
  ids.append(lookup[key])
 for k in range(1,len(ids)-1):
  tri=(ids[0],ids[k],ids[k+1])
  if len(set(tri))==3:faces.append(tri)
mesh=bpy.data.meshes.new('Connected_Shirt_V32');mesh.from_pydata(verts,[],faces);mesh.update();shirt=bpy.data.objects.new('Connected_Shirt_V32',mesh);scene.collection.objects.link(shirt)
for b in rig.data.bones:shirt.vertex_groups.new(name=b.name)
for i,r in enumerate(records):
 ws=sorted(r[2].items(),key=lambda p:p[1],reverse=True)[:4];total=sum(w for _,w in ws)
 for n,w in ws:shirt.vertex_groups[n].add([i],w/total,'REPLACE')
shirt.parent=rig;mod=shirt.modifiers.new('Anatomical_Skin','ARMATURE');mod.object=rig
uv=mesh.uv_layers.new(name='Shirt_UV')
for p in mesh.polygons:
 p.use_smooth=True
 for li in p.loop_indices:
  co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=((co.x+.5), (co.z-.98)/.5)
mat=bpy.data.materials.new('Caller_Blue_V32');mat.diffuse_color=(.38,.62,.73,1);shirt.data.materials.append(mat)
mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.38,.62,.73,1)
edges={}
for f in faces:
 for a,b in zip(f,f[1:]+f[:1]):key=tuple(sorted((a,b)));edges[key]=edges.get(key,0)+1
boundary=[e for e,c in edges.items() if c==1];adj={}
for a,b in boundary:adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
loops=[];remaining=set(adj)
while remaining:
 stack=[remaining.pop()];component=[]
 while stack:
  v=stack.pop();component.append(v)
  for n in adj[v]:
   if n in remaining:remaining.remove(n);stack.append(n)
 loops.append(component)
all_adj={i:set() for i in range(len(verts))}
for a,b in edges:all_adj[a].add(b);all_adj[b].add(a)
remaining=set(all_adj);components=0
while remaining:
 components+=1;stack=[remaining.pop()]
 while stack:
  for n in all_adj[stack.pop()]:
   if n in remaining:remaining.remove(n);stack.append(n)
assert components==1
assert all(math.isfinite(x) for v in mesh.vertices for x in v.co)
assert all(abs(sum(g.weight for g in v.groups)-1)<1e-5 for v in mesh.vertices)
report={'vertices':len(verts),'triangles':len(faces),'connectedComponents':components,'boundaryLoops':len(loops),'boundarySizes':[len(v) for v in loops],'badBoundaryDegrees':sum(len(v)!=2 for v in adj.values()),'nonmanifoldEdges':sum(c>2 for c in edges.values())}
(out/'topology.json').write_text(json.dumps(report,indent=2))
print('SHIRT_TOPOLOGY',json.dumps(report))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'shirt-prototype.blend'))
if '--topology-only' in sys.argv:raise SystemExit(0)
# The actual clips need a small exported corrective morph at each pose. Mixed
# skin weights applied to a new edge intersection do not equal interpolating
# the separately skinned original endpoints; correct that measured LBS term.
spec=importlib.util.spec_from_file_location('motion',repo/'scripts/hybrid-motion-v25.py');motion=importlib.util.module_from_spec(spec);spec.loader.exec_module(motion)
source_error=max((sum((body.data.vertices[i].co*w for i,w in r[3]),Vector())-r[0]).length for r in records)
assert source_error<1e-5,source_error
assert report['boundaryLoops']==4 and not report['badBoundaryDegrees'] and not report['nonmanifoldEdges']
for o in scene.objects:
 if o.type=='MESH' and o not in (body,shirt) and ('Tank' in o.name or 'Print' in o.name):o.hide_render=True;o.hide_viewport=True
paddle=scene.objects['Dam_Wood_152cm']
for o in scene.objects:
 if o.parent==paddle or o==paddle:o.hide_render=True
if not scene.camera:
 data=bpy.data.cameras.new('ShirtReview');cam=bpy.data.objects.new('ShirtReview',data);scene.collection.objects.link(cam);scene.camera=cam
cam=scene.camera;cam.location=(2.3,-3.6,2.0);cam.rotation_euler=(Vector((0,-.05,1.15))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.75
for o in list(scene.objects):
 if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
ld=bpy.data.lights.new('ShirtReview','AREA');ld.energy=700;ld.shape='DISK';ld.size=4;light=bpy.data.objects.new('ShirtReview',ld);scene.collection.objects.link(light);light.location=(2,-3,4)
if not scene.world:scene.world=bpy.data.worlds.new('ReviewWorld')
scene.world.color=(.7,.7,.65);scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
report['sourceBarycentricErrorM']=source_error;report['actualClips']=[]
for role,posture in [('caller','seated'),('controller','standing'),('rower','seated'),('rower','standing')]:
 name=role+'-'+posture
 if shirt.data.shape_keys:shirt.shape_key_clear()
 motion.build_motion(rig,paddle,scene,posture=posture,side=-1,role=role)
 shirt.shape_key_add(name='Basis');max_gap=0;max_correction=0
 for frame in range(1,98):
  scene.frame_set(frame);bpy.context.view_layer.update();evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
  key=shirt.shape_key_add(name='ActualPose_'+str(frame))
  mats={b.name:b.matrix@b.bone.matrix_local.inverted() for b in rig.pose.bones}
  for i,r in enumerate(records):
   point=sum((deformed.vertices[j].co*w for j,w in r[3]),Vector());normal=sum((deformed.vertices[j].normal*w for j,w in r[3]),Vector()).normalized();target=point+normal*.0055
   blend=Matrix(((0.,)*4,)*4)
   for group in mesh.vertices[i].groups:
    name_bone=shirt.vertex_groups[group.group].name
    blend+=mats[name_bone]*group.weight
   corrected=blend.inverted()@target;key.data[i].co=corrected
   max_correction=max(max_correction,(corrected-mesh.vertices[i].co).length)
   max_gap=max(max_gap,(blend@corrected-point).length)
  evaluated.to_mesh_clear()
  key.value=0.;key.keyframe_insert('value',frame=frame-1);key.value=1.;key.keyframe_insert('value',frame=frame);key.value=0.;key.keyframe_insert('value',frame=frame+1)
 report['actualClips'].append({'name':name,'poses':97,'maxSourceSurfaceGapM':max_gap,'maxRestSpaceCorrectionM':max_correction,'correction':'exported pose morphs plus original anatomical skinning'})
 bpy.ops.object.select_all(action='DESELECT')
 for o in scene.objects:
  if o==rig or o.type=='MESH' and not o.hide_render:o.select_set(True)
 scene.frame_set(1)
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(name+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True,export_morph=True)
 for frame in (1,25,49,73):
  scene.frame_set(frame);scene.render.filepath=str(out/(name+'-'+str(frame)+'.png'));bpy.ops.render.render(write_still=True)
(out/'validation.json').write_text(json.dumps(report,indent=2))

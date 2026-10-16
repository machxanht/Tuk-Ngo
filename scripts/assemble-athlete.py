"""Make an editable, animated single-athlete proof from the approved sources.

The game keeps its exact endpoint skinning shader. For a standalone standard
GLB the same endpoint calculation is sampled into shirt morph targets. Source
rigs, clothing data and animation files are never rewritten.
"""
import bpy
import json
import math
import struct
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1] if '__file__' in globals() and 'assemble-athlete' in __file__ else Path('E:/AI/Um Tuk/github-workspace')
OUT=ROOT/'public/assets/athlete-master'
SOURCE=ROOT/'art/athlete'
QA=ROOT/'docs/qa/athlete-master'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'athlete-master.blend'))
scene=bpy.context.scene
arm=next(o for o in scene.objects if o.type=='ARMATURE')
data=json.loads((ROOT/'public/assets/illustrated-v22/shirt-runtime-v32.json').read_text())
def xyz(p):return Vector((p[0],-p[2],p[1]))
def coordinates():
    matrices={name:arm.matrix_world @ arm.pose.bones[name].matrix @ arm.data.bones[name].matrix_local.inverted() @ arm.matrix_world.inverted() for name in data['jointNames']}
    values=[]
    for vertex in data['vertices']:
        position=Vector((0,0,0))
        for endpoint in vertex['endpoints']:
            p=xyz([v+data['normalOffsetM']*n for v,n in zip(endpoint['position'],endpoint['normal'])])
            skinned=Vector((0,0,0))
            for j,w in zip(endpoint['jointIndices'],endpoint['jointWeights']):
                skinned+=(matrices[data['jointNames'][j]] @ p)*w
            position+=skinned*endpoint['baryWeight']
        values.append(position)
    return values

# Remove the original tank and decals from the proof; the game already masks
# these through its unchanged connected-shirt shader.
for o in list(scene.objects):
    if o.type=='MESH' and any(m and m.name.startswith(('Painted_Vest','Painted_Ivory_Binding','White_Uniform_Print','Khmer_Back_Print')) for m in o.data.materials):
        o.hide_render=True
        o.hide_set(True)
old=scene.objects.get('Connected_Race_Shirt')
if old:bpy.data.objects.remove(old,do_unlink=True)
scene.frame_set(0,subframe=.25)
points=coordinates()
mesh=bpy.data.meshes.new('Connected_Race_Shirt')
mesh.from_pydata(points,[],[data['indices'][i:i+3] for i in range(0,len(data['indices']),3)])
mesh.update()
shirt=bpy.data.objects.new('Connected_Race_Shirt',mesh);scene.collection.objects.link(shirt)
for poly in mesh.polygons:poly.use_smooth=True

# Find the same geometric neckline as the runtime finish, then bake its colour
# and the shaped Khmer print into a regular texture supported by GLB viewers.
rest=np.array([v['position'] for v in data['vertices']])
edges={}
for face in mesh.polygons:
    for i,a in enumerate(face.vertices):
        b=face.vertices[(i+1)%3];edge=tuple(sorted((a,b)));edges[edge]=edges.get(edge,0)+1
adjacent={}
for (a,b),count in edges.items():
    if count==1:adjacent.setdefault(a,[]).append(b);adjacent.setdefault(b,[]).append(a)
unseen=set(adjacent);loops=[]
while unseen:
    stack=[next(iter(unseen))];loop=[]
    while stack:
        i=stack.pop()
        if i not in unseen:continue
        unseen.remove(i);loop.append(i);stack.extend(adjacent[i])
    loops.append(loop)
assert len(loops)==4
collar=set(max(loops,key=lambda loop:rest[loop,1].mean()))
distance=np.full(len(rest),np.inf)
for (a,b),count in edges.items():
    if count!=1 or a not in collar or b not in collar:continue
    axis=rest[b]-rest[a];t=np.clip((rest-rest[a])@axis/(axis@axis),0,1)
    distance=np.minimum(distance,np.linalg.norm(rest-(rest[a]+t[:,None]*axis),axis=1))
print_image=bpy.data.images.load(str(OUT/'kit-print.png'),check_existing=True)
pixels=np.empty(print_image.size[0]*print_image.size[1]*4,dtype=np.float32);print_image.pixels.foreach_get(pixels)
pixels=pixels.reshape(print_image.size[1],print_image.size[0],4)
resolution=2048
atlas=np.ones((resolution,resolution,4),dtype=np.float32)
atlas[:,:,:3]=(.018,.34,.075)
uv=mesh.uv_layers.new(name='Print_UV')
# Unwrap coherent surfaces, not one tiny island per triangle. Tiny islands
# let distant mip levels mix the collar/print into unrelated shoulder faces.
window=bpy.context.window_manager.windows[0]
with bpy.context.temp_override(window=window,scene=scene,view_layer=scene.view_layers[0]):
    bpy.ops.object.select_all(action='DESELECT');shirt.select_set(True);bpy.context.view_layer.objects.active=shirt
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.03,scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
for face in mesh.polygons:
    corners=np.array([uv.data[i].uv[:] for i in face.loop_indices])*resolution
    low=np.maximum(0,np.floor(corners.min(axis=0)-8).astype(int));high=np.minimum(resolution,np.ceil(corners.max(axis=0)+8).astype(int))
    if np.any(high<=low):continue
    gy,gx=np.mgrid[low[1]:high[1],low[0]:high[0]];a,b,c=corners
    denominator=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    if abs(denominator)<1e-10:continue
    u=((gx+.5-a[0])*(c[1]-a[1])-(gy+.5-a[1])*(c[0]-a[0]))/denominator
    v=((b[0]-a[0])*(gy+.5-a[1])-(b[1]-a[1])*(gx+.5-a[0]))/denominator
    bary=np.stack([1-u-v,u,v],axis=-1)
    covered=bary.min(axis=-1)>=-8/max(1,np.max(high-low))
    ids=list(face.vertices);pos=np.einsum('ijk,kl->ijl',bary,rest[ids]);dist=np.einsum('ijk,k->ij',bary,distance[ids])
    trim=np.clip((dist-.004)/.004,0,1);trim=1-trim*trim*(3-2*trim)
    rgb=np.array((.018,.34,.075))*(1-trim[:,:,None])+np.array((.88,.85,.72))*trim[:,:,None]
    pu=.5-pos[:,:,0]/.31;pv=1-(1.31-pos[:,:,1])/.09
    ink=pixels[np.clip((pv*print_image.size[1]).astype(int),0,print_image.size[1]-1),np.clip((pu*print_image.size[0]).astype(int),0,print_image.size[0]-1)]
    alpha=ink[:,:,3]*((pos[:,:,2]<-.035)&(pu>=0)&(pu<=1)&(pv>=0)&(pv<=1))
    rgb=rgb*(1-alpha[:,:,None])+ink[:,:,:3]*alpha[:,:,None]
    region=atlas[low[1]:high[1],low[0]:high[0],:3];region[covered]=rgb[covered]
texture=bpy.data.images.new('Race_Jersey_Atlas',width=resolution,height=resolution,alpha=True)
texture.colorspace_settings.name='sRGB';texture.pixels.foreach_set(atlas.ravel());texture.filepath_raw=str(OUT/'jersey-atlas.png');texture.file_format='PNG';texture.save()
mat=bpy.data.materials.new('Race_Jersey');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.88
image=nodes.new('ShaderNodeTexImage');image.image=texture
links.new(image.outputs['Color'],bsdf.inputs['Base Color'])
mesh.materials.append(mat)
shirt.shape_key_add(name='Basis')
samples=49
keys=[]
for sample in range(samples):
    frame=.25+24*sample/(samples-1)
    scene.frame_set(int(frame),subframe=frame%1)
    key=shirt.shape_key_add(name=f'Stroke_{sample:02d}')
    for point,p in zip(key.data,coordinates()):point.co=p
    keys.append(key)
for sample in range(samples):
    frame=.25+24*sample/(samples-1)
    for i,key in enumerate(keys):
        key.value=1 if i==sample else 0
        key.keyframe_insert(data_path='value',frame=frame)
action=shirt.data.shape_keys.animation_data.action
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=0;scene.frame_end=25;scene.render.fps=24
scene.frame_set(8)
# Frame the seated body and paddle with little unused space.
camera=scene.camera;target=Vector((0,0,.60));camera.location=target+Vector((2.3,-3.8,1.1));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=1.9
for img in bpy.data.images:
    if img.source=='FILE' and img.has_data:img.pack()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'athlete-master.blend'),compress=True)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ('MESH','ARMATURE','EMPTY') and not o.hide_render and not o.hide_get():o.select_set(True)
# Opening a .blend from an MCP timer invalidates the timer's UI context. Give
# operators the new window explicitly instead of relying on that stale context.
window=bpy.context.window_manager.windows[0]
with bpy.context.temp_override(window=window,scene=scene,view_layer=scene.view_layers[0]):
    bpy.context.view_layer.objects.active=arm
    bpy.ops.export_scene.gltf(filepath=str(OUT/'athlete-master.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True,export_morph=True,export_extras=True)
    scene.render.filepath=str(QA/'blender-athlete.png')
    bpy.ops.render.render(write_still=True)
# Blender exports scene skin, morph and paddle tracks in separate clips. They
# form one stroke and must play together in any standard GLB viewer.
glb_path=OUT/'athlete-master.glb';raw=glb_path.read_bytes();json_size=struct.unpack_from('<I',raw,12)[0];document=json.loads(raw[20:20+json_size]);clips=document.get('animations',[])
combined={'name':'Rowing','samplers':[],'channels':[]}
for clip in clips:
    offset=len(combined['samplers']);combined['samplers'].extend(clip['samplers'])
    for channel in clip['channels']:combined['channels'].append({**channel,'sampler':channel['sampler']+offset})
document['animations']=[combined]
# Source meshes sit below an identity armature container. Make skins scene
# roots as glTF recommends, without changing any world transform or track.
parents={child:i for i,node in enumerate(document['nodes']) for child in node.get('children',[])}
animated={channel['target']['node'] for channel in combined['channels']}
roots=document['scenes'][document.get('scene',0)]['nodes']
for i,node in enumerate(document['nodes']):
    if 'skin' not in node or i not in parents:continue
    parent_index=parents[i];parent=document['nodes'][parent_index]
    assert parent_index not in animated and not any(k in parent for k in ('matrix','translation','rotation','scale'))
    parent['children'].remove(i)
    if i not in roots:roots.append(i)
encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
tail=raw[20+json_size:]
glb_path.write_bytes(struct.pack('<III',0x46546C67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+tail)
report={'shirtVertices':len(mesh.vertices),'shirtTriangles':sum(len(p.vertices)-2 for p in mesh.polygons),'shirtSamples':samples,'shirtBake':'skin each original endpoint then barycentrically interpolate; 48 intervals per original one-second loop','originalEightMotionFilesChanged':False,'glbBytes':(OUT/'athlete-master.glb').stat().st_size,'sourceBlendBytes':(SOURCE/'athlete-master.blend').stat().st_size}
(QA/'assembly.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))

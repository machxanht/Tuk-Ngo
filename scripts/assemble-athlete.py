"""Make an editable, animated single-athlete proof from the approved sources.

The game keeps its exact endpoint skinning shader. For a standalone standard
GLB the same endpoint calculation is sampled into shirt morph targets. Source
rigs, clothing data and animation files are never rewritten.
"""
import bpy
import json
import math
import struct
import bisect
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

ROOT=Path(__file__).resolve().parents[1] if '__file__' in globals() and 'assemble-athlete' in __file__ else Path('E:/AI/Um Tuk/github-workspace')
OUT=ROOT/'public/assets/athlete-master'
SOURCE=ROOT/'art/athlete'
QA=ROOT/'docs/qa/athlete-master'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'athlete-master.blend'))
scene=bpy.context.scene
arm=next(o for o in scene.objects if o.type=='ARMATURE')
factor=96/scene.render.fps
actions={o.animation_data.action for o in (arm,scene.objects.get('Dam_Wood_152cm')) if o and o.animation_data and o.animation_data.action}
for action in actions:
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        key.co.x*=factor;key.handle_left.x*=factor;key.handle_right.x*=factor
data=json.loads((ROOT/'public/assets/illustrated-v22/shirt-runtime-v32.json').read_text())
def xyz(p):return Vector((p[0],-p[2],p[1]))
source_raw=(ROOT/'public/assets/illustrated-v22/motion-seated-port-v25.glb').read_bytes()
source_size=struct.unpack_from('<I',source_raw,12)[0]
source_doc=json.loads(source_raw[20:20+source_size]);source_bin=source_raw[28+source_size:]
body_raw=(ROOT/'public/assets/illustrated-v22/athlete-rig-v27.glb').read_bytes()
body_size=struct.unpack_from('<I',body_raw,12)[0]
body_doc=json.loads(body_raw[20:20+body_size]);body_bin=body_raw[28+body_size:]
def accessor(doc,blob,index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
    width={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']]
    return np.ndarray((a['count'],width),dtype=dtype,buffer=blob,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',width*np.dtype(dtype).itemsize),np.dtype(dtype).itemsize)).copy()

# Evaluate the approved glTF tracks directly. Blender's scene export sampled
# 97 original keys down to 26, introducing hand/grip drift during recovery.
tracks={}
for channel in source_doc['animations'][0]['channels']:
    sampler=source_doc['animations'][0]['samplers'][channel['sampler']]
    name=source_doc['nodes'][channel['target']['node']]['name']
    tracks[(name,channel['target']['path'])]=(accessor(source_doc,source_bin,sampler['input']).ravel(),accessor(source_doc,source_bin,sampler['output']),sampler.get('interpolation','LINEAR'))
sample_times=sorted({0.0,*[float(t) for times,_,_ in tracks.values() for t in times]})
duration=sample_times[-1]
parents={child:i for i,node in enumerate(body_doc['nodes']) for child in node.get('children',[])}
skin=body_doc['skins'][0]
inverse_binds=accessor(body_doc,body_bin,skin['inverseBindMatrices'])
joint_ids={body_doc['nodes'][node]['name']:(node,Matrix(inverse_binds[i].reshape(4,4).T.tolist())) for i,node in enumerate(skin['joints'])}
def value(name,path,default,time):
    if (name,path) not in tracks:return default
    times,values,mode=tracks[(name,path)];i=max(0,min(len(times)-1,bisect.bisect_right(times,time)-1))
    if i==len(times)-1 or mode=='STEP':return values[i]
    amount=max(0,min(1,(time-times[i])/(times[i+1]-times[i])))
    if path=='rotation':
        a,b=values[i],values[i+1];q=Quaternion((a[3],*a[:3])).slerp(Quaternion((b[3],*b[:3])),float(amount));return (q.x,q.y,q.z,q.w)
    return values[i]*(1-amount)+values[i+1]*amount
def coordinates(time):
    world={}
    def transform(i):
        if i in world:return world[i]
        node=body_doc['nodes'][i];name=node.get('name','')
        t=value(name,'translation',node.get('translation',[0,0,0]),time)
        q=value(name,'rotation',node.get('rotation',[0,0,0,1]),time)
        s=value(name,'scale',node.get('scale',[1,1,1]),time)
        local=Matrix.LocRotScale(Vector(t),Quaternion((q[3],*q[:3])),Vector(s))
        if 'matrix' in node and not any((name,k) in tracks for k in ('translation','rotation','scale')):local=Matrix(np.array(node['matrix']).reshape(4,4).T.tolist())
        world[i]=transform(parents[i]) @ local if i in parents else local
        return world[i]
    matrices={name:transform(i) @ inverse for name,(i,inverse) in joint_ids.items()}
    values=[]
    for vertex in data['vertices']:
        position=Vector((0,0,0))
        for endpoint in vertex['endpoints']:
            p=Vector([v+data['normalOffsetM']*n for v,n in zip(endpoint['position'],endpoint['normal'])])
            skinned=Vector((0,0,0))
            for j,w in zip(endpoint['jointIndices'],endpoint['jointWeights']):
                skinned+=(matrices[data['jointNames'][j]] @ p)*w
            position+=skinned*endpoint['baryWeight']
        values.append(xyz(position))
    return values

# Remove the original tank and decals from the proof; the game already masks
# these through its unchanged connected-shirt shader.
for o in list(scene.objects):
    if o.type=='MESH' and any(m and m.name.startswith(('Painted_Vest','Painted_Ivory_Binding','White_Uniform_Print','Khmer_Back_Print')) for m in o.data.materials):
        o.hide_render=True
        o.hide_set(True)
points=coordinates(0)
old=scene.objects.get('Connected_Race_Shirt')
# Reuse the existing coherent UV/atlas for a motion-only rebuild. Repainting
# unchanged shirt surfaces is costly and can introduce unnecessary UV churn.
cached_uv=None;cached_material=None
if old and len(old.data.vertices)==len(points) and old.data.uv_layers.active and max((v.co-p).length for v,p in zip(old.data.vertices,points))<1e-5:
    cached_uv=[tuple(loop.uv) for loop in old.data.uv_layers.active.data]
    cached_material=old.data.materials[0] if old.data.materials else None
if old:bpy.data.objects.remove(old,do_unlink=True)
scene.frame_set(0,subframe=.25)
mesh=bpy.data.meshes.new('Connected_Race_Shirt')
mesh.from_pydata(points,[],[data['indices'][i:i+3] for i in range(0,len(data['indices']),3)])
mesh.update()
shirt=bpy.data.objects.new('Connected_Race_Shirt',mesh);scene.collection.objects.link(shirt)
for poly in mesh.polygons:poly.use_smooth=True

if cached_uv and cached_material:
    uv=mesh.uv_layers.new(name='Print_UV')
    for loop,uv_value in zip(uv.data,cached_uv):loop.uv=uv_value
    mesh.materials.append(cached_material)
else:
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
samples=len(sample_times)
keys=[]
for sample in range(samples):
    time=sample_times[sample]
    key=shirt.shape_key_add(name=f'Stroke_{sample:02d}')
    for point,p in zip(key.data,coordinates(time)):point.co=p
    keys.append(key)
for sample in range(samples):
    frame=sample_times[sample]*96
    for i,key in enumerate(keys):
        key.value=1 if i==sample else 0
        key.keyframe_insert(data_path='value',frame=frame)
action=shirt.data.shape_keys.animation_data.action
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=0;scene.frame_end=round(duration*96);scene.render.fps=96
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
    for channel in clip['channels']:
        if channel['target']['path']!='weights':continue
        combined['channels'].append({**channel,'sampler':len(combined['samplers'])})
        combined['samplers'].append(clip['samplers'][channel['sampler']])
# Keep the exact protected track bytes, names, interpolation and loop duration.
# Only accessor/node indices change to refer to the new exported equipment.
binary=bytearray(raw[28+json_size:]);copied={}
def copy_accessor(index):
    if index in copied:return copied[index]
    source=source_doc['accessors'][index];values=accessor(source_doc,source_bin,index)
    binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(values.tobytes())
    view=len(document['bufferViews']);document['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':values.nbytes})
    result={k:v for k,v in source.items() if k not in ('bufferView','byteOffset')};result['bufferView']=view
    copied[index]=len(document['accessors']);document['accessors'].append(result);return copied[index]
nodes={node.get('name'):i for i,node in enumerate(document['nodes'])}
original=source_doc['animations'][0]
for channel in original['channels']:
    name=source_doc['nodes'][channel['target']['node']]['name'];assert name in nodes,name
    sampler=original['samplers'][channel['sampler']]
    combined['channels'].append({'sampler':len(combined['samplers']),'target':{'node':nodes[name],'path':channel['target']['path']}})
    combined['samplers'].append({**sampler,'input':copy_accessor(sampler['input']),'output':copy_accessor(sampler['output'])})
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
# Drop the discarded Blender body-animation payload, rather than retaining
# unused accessors and duplicate buffers in every download of this GLB.
used=set()
for mesh_data in document['meshes']:
    for primitive in mesh_data['primitives']:
        used.update(primitive['attributes'].values())
        if 'indices' in primitive:used.add(primitive['indices'])
        for target in primitive.get('targets',[]):used.update(target.values())
for skin_data in document['skins']:used.add(skin_data['inverseBindMatrices'])
for sampler in combined['samplers']:used.update((sampler['input'],sampler['output']))
remap={old:i for i,old in enumerate(sorted(used))}
for mesh_data in document['meshes']:
    for primitive in mesh_data['primitives']:
        primitive['attributes']={k:remap[v] for k,v in primitive['attributes'].items()}
        if 'indices' in primitive:primitive['indices']=remap[primitive['indices']]
        for target in primitive.get('targets',[]):
            for k in target:target[k]=remap[target[k]]
for skin_data in document['skins']:skin_data['inverseBindMatrices']=remap[skin_data['inverseBindMatrices']]
for sampler in combined['samplers']:
    for k in ('input','output'):sampler[k]=remap[sampler[k]]
document['accessors']=[document['accessors'][i] for i in sorted(used)]
view_users=[*document['accessors'],*document.get('images',[])]
for a in document['accessors']:
    if 'sparse' in a:view_users.extend((a['sparse']['indices'],a['sparse']['values']))
used_views=sorted({a['bufferView'] for a in view_users if 'bufferView' in a})
view_remap={old:i for i,old in enumerate(used_views)};packed=bytearray();views=[]
for i in used_views:
    view=document['bufferViews'][i];packed.extend(b'\0'*((-len(packed))%4));start=len(packed);offset=view.get('byteOffset',0)
    packed.extend(binary[offset:offset+view['byteLength']]);views.append({**view,'byteOffset':start})
for user in view_users:
    if 'bufferView' in user:user['bufferView']=view_remap[user['bufferView']]
document['bufferViews']=views;binary=packed
binary.extend(b'\0'*((-len(binary))%4));document['buffers'][0]['byteLength']=len(binary)
encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
tail=struct.pack('<II',len(binary),0x004E4942)+binary
glb_path.write_bytes(struct.pack('<III',0x46546C67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+tail)
report={'shirtVertices':len(mesh.vertices),'shirtTriangles':sum(len(p.vertices)-2 for p in mesh.polygons),'shirtSamples':samples,'shirtBake':'exact source glTF joint matrices and endpoint interpolation at every original key','motionTracks':'original seated-port samplers copied without resampling','durationS':duration,'originalEightMotionFilesChanged':False,'glbBytes':(OUT/'athlete-master.glb').stat().st_size,'sourceBlendBytes':(SOURCE/'athlete-master.blend').stat().st_size}
(QA/'assembly.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))

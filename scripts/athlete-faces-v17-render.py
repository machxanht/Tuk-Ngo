"""Blender static skin-head contact sheet, INPUT_GLB OUTPUT_PNG after --."""
import bpy,json,struct,sys,numpy as np
from pathlib import Path
from mathutils import Vector
src,out=sys.argv[sys.argv.index('--')+1:];b=Path(src).read_bytes();jl=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+jl]);bb=b[28+jl:]
def read(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]);nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];return np.ndarray((a['count'],nc),dt,buffer=bb,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',nc*dt.itemsize),dt.itemsize)).copy()
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
skinmat=bpy.data.materials.new('CC0 skin with V17 face colors');skinmat.use_nodes=True;nt=skinmat.node_tree;bs=nt.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.6
im=j['images'][j['textures'][4]['source']];v=j['bufferViews'][im['bufferView']];ip=Path(out).parent/'cc0-skin-source.png';ip.write_bytes(bb[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ip));col=nt.nodes.new('ShaderNodeVertexColor');col.layer_name='FaceColor';mix=nt.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;nt.links.new(tex.outputs['Color'],mix.inputs[1]);nt.links.new(col.outputs['Color'],mix.inputs[2]);nt.links.new(mix.outputs[0],bs.inputs['Base Color'])
capmat=bpy.data.materials.new('White cap');capmat.diffuse_color=(.85,.86,.82,1)
nodes=[n for n in j['nodes'] if 'mesh' in n and 'skin' in n and j['meshes'][n['mesh']].get('name','').startswith('V17_Face_Athlete_')]
nodes=[nodes[i] for i in [0,4,8,12]]
for idx,node in enumerate(nodes):
 s=j['skins'][node['skin']];head=next(k for k,ni in enumerate(s['joints']) if j['nodes'][ni].get('name')=='head');m=read(s['inverseBindMatrices'])[head].reshape(4,4).T
 actorid=j['meshes'][node['mesh']]['extras']['uniqueAthleteGeometry'];capnodes=[n for n in j['nodes'] if n.get('name','').startswith('Athlete_'+str(actorid)+'_') and 'Cap_Baseball' in n.get('name','') and 'mesh' in n]
 for rendernode in [node]+capnodes:
  for prim in j['meshes'][rendernode['mesh']]['primitives']:
   mat=j['materials'][prim.get('material',0)];mn=mat.get('name','');is_skin=mn=='Skin_CC0_Asian_Male'
   if not(is_skin or mn.startswith(('Eyes_','V17_Brown_Iris_','White_Cotton_Cap'))):continue
   a=prim['attributes'];p=read(a['POSITION']);q=(np.c_[p,np.ones(len(p))]@m.T)[:,:3];ix=read(prim['indices']).reshape(-1,3);hw=((read(a['JOINTS_0'])==head)*read(a['WEIGHTS_0'])).sum(1);ix=ix[np.all((q[:,1]>-.066)[ix],axis=1)] if not is_skin else ix[np.all((hw>.7)[ix],axis=1)&np.all((q[:,1]>-.066)[ix],axis=1)];xyz=np.c_[q[:,0],-q[:,2],q[:,1]];mesh=bpy.data.meshes.new('face'+str(idx));mesh.from_pydata(xyz.tolist(),[],ix.tolist());mesh.update();ob=bpy.data.objects.new('Variant '+str(idx),mesh);scene.collection.objects.link(ob);ob.location=((idx%2)*.32,0,-(idx//2)*.33)
   if is_skin:mesh.materials.append(skinmat)
   else:
    material=bpy.data.materials.new(mn);material.diffuse_color=mat.get('pbrMetallicRoughness',{}).get('baseColorFactor',[.8,.8,.8,1]);material.use_nodes=True;material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=material.diffuse_color;material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.55;mesh.materials.append(material)
   uv=mesh.uv_layers.new();cc=mesh.color_attributes.new(name='FaceColor',type='FLOAT_COLOR',domain='CORNER');colors=read(a['COLOR_0']) if 'COLOR_0' in a else np.ones((len(p),4));uvs=read(a['TEXCOORD_0'])
   for poly in mesh.polygons:
    poly.use_smooth=True
    for li in poly.loop_indices:
     vi=mesh.loops[li].vertex_index;uv.data[li].uv=(uvs[vi,0],1-uvs[vi,1]);cc.data[li].color=colors[vi]
scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.17,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
for loc,power in [((0,-2,2),150),((2,-1,1),100)]:
 d=bpy.data.lights.new('Light','AREA');d.energy=power;d.size=2;o=bpy.data.objects.new('Light',d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((.16,0,-.08))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);scene.collection.objects.link(cam);cam.location=(.16,-3,-.08);cam.rotation_euler=(Vector((.16,0,-.08))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=.75;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.filepath=out;bpy.ops.render.render(write_still=True)

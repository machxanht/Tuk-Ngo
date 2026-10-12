"""Build one coherent detailed rower from the editable licensed anatomical source.

Run with Blender --background --python-exit-code 1 --python this_file -- --output DIR.
Preserve face/finger topology, restore source skin, rebuild cap, and rebake cloth
contact against the new neutral-gaze seated stroke before exporting ordinary GLB.
"""
import argparse,importlib.util,json,math,sys,struct
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree

parser=argparse.ArgumentParser();parser.add_argument('--output',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(repo/'assets/blender/athlete-rower-study.blend'))
scene=bpy.context.scene;scene.frame_set(1);rig=next(o for o in scene.objects if o.type=='ARMATURE');body=scene.objects['Athlete_Study_Anatomy_CC0'];paddle=scene.objects['Dam_Wood_152cm']
for o in list(scene.objects):
    if o.type in {'CAMERA','LIGHT'}:bpy.data.objects.remove(o,do_unlink=True)
    elif o.type=='MESH' and o.data.shape_keys:o.shape_key_clear()
def load_module(name,filename):
    spec=importlib.util.spec_from_file_location(name,str(repo/'scripts'/filename));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
motion=load_module('hero_motion','rebuild-hero-motion-v19.py')
caps=load_module('baseball_caps','baseball-caps-v18.py')
garments_module=load_module('hero_garments','rebuild-hero-garments-v19.py')
garment_report=garments_module.replace_garments_v19(rig,body,scene)

# Fit shorts against complete anatomy, including the upper legs deliberately
# hidden beneath clothing in the visible study mesh. Never export this collider.
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(repo/'public/assets/human/makehuman-athlete-base.glb'))
imported=set(scene.objects)-before
collision_body=max((o for o in imported if o.type=='MESH'),key=lambda o:len(o.data.vertices))
collision_body.name='Temporary_Full_Anatomy_Collision_V19';collision_body.parent=rig
for modifier in collision_body.modifiers:
    if modifier.type=='ARMATURE':modifier.object=rig
for obj in imported-{collision_body}:bpy.data.objects.remove(obj,do_unlink=True)

# Start from the original CC0 photograph-derived skin, without V11's darkening.
skin=bpy.data.materials['Skin_CC0_Asian_Male'];skin.node_tree.nodes.clear();nodes=skin.node_tree.nodes;links=skin.node_tree.links
shader=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial');tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(repo/'assets/source/makehuman/young_lightskinned_male_diffuse3.png'),check_existing=False);tex.image.pack()
tone=nodes.new('ShaderNodeMixRGB');tone.blend_type='MULTIPLY';tone.inputs[0].default_value=1;tone.inputs[2].default_value=(.60,.43,.29,1);links.new(tex.outputs['Color'],tone.inputs[1]);links.new(tone.outputs['Color'],shader.inputs['Base Color']);links.new(shader.outputs['BSDF'],output.inputs['Surface']);shader.inputs['Roughness'].default_value=.62;shader.inputs['Metallic'].default_value=0;shader.inputs['Subsurface Weight'].default_value=.025
skin['source']='MakeHuman CC0 original diffuse with one warm albedo tint; no repeatedly darkened source image'
for polygon in body.data.polygons:polygon.use_smooth=True
# Preserve the detailed scalp/face/fingers; reduce only broad body regions with
# weighted protection. Full original topology remains in the editable source.
protected=body.vertex_groups.new(name='V19_Detail_Protection')
for v in body.data.vertices:
    head=sum(g.weight for g in v.groups if body.vertex_groups[g.group].name=='head')
    hand=sum(g.weight for g in v.groups if body.vertex_groups[g.group].name.startswith(('hand_','thumb_','index_','middle_','ring_','pinky_')))
    if head>.30 or hand>.15:protected.add([v.index],1,'REPLACE')
# Vertex-group weighting is deliberately not used for blind whole-body collapse.
# A modest ratio retains the full smooth face sufficiently for this single hero.
original_body_triangles=sum(len(p.vertices)-2 for p in body.data.polygons)

# Rebuild the fitted cap in head bind space; no helmet rim or raised visor.
for obj in list(scene.objects):
    if obj.type=='MESH' and (obj.name.startswith(('White_Cap','Cap_'))):bpy.data.objects.remove(obj,do_unlink=True)
pos,norm,index,uv,color=caps.cap_geometry('forward');basis=rig.data.bones['head'].matrix_local
verts=[tuple(basis@Vector(p)) for p in pos];data=bpy.data.meshes.new('V19_Fitted_Baseball_Cap');data.from_pydata(verts,[],index.tolist());data.update();cap=bpy.data.objects.new('Baseball_Cap_V19',data);scene.collection.objects.link(cap);cap.parent=rig
group=cap.vertex_groups.new(name='head');group.add(list(range(len(verts))),1,'REPLACE');mod=cap.modifiers.new('Head_Skin','ARMATURE');mod.object=rig
white=bpy.data.materials['White_Cotton_Cap'];white.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.84,.86,.81,1);white.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.90;data.materials.append(white)
for p in data.polygons:p.use_smooth=True
colors=data.color_attributes.new(name='Cap_Fabric_Detail',type='FLOAT_COLOR',domain='POINT')
for c,value in zip(colors.data,color):c.color=value
color_node=white.node_tree.nodes.new('ShaderNodeVertexColor');color_node.layer_name=colors.name;white.node_tree.links.new(color_node.outputs['Color'],white.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for obj in list(scene.objects):
    if obj.type=='MESH' and obj.name.startswith('Eye_'):bpy.data.objects.remove(obj,do_unlink=True)
# Compare actual runtime rays with posed anatomy in head-local coordinates.
# The inner orbital surface is behind the visible lid (~95 mm forward from
# head origin); measurements of only its deepest point misplaced the eyeball.
head_origin=rig.data.bones['head'].head_local
head_bind=rig.data.bones['head'].matrix_local
bm=bmesh.new();bm.from_mesh(body.data);eye_patch=[]
for face in bm.faces:
    center=head_bind.inverted()@face.calc_center_median()
    # The base anatomy includes a closed, pink socket surface, not an opening.
    # Carve only the inner aperture; keep the surrounding eyelid and brow.
    if center.z>.040 and ((abs(center.x)-.027)/.0105)**2+((center.y-.036)/.0048)**2<1:eye_patch.append(face)
bmesh.ops.delete(bm,geom=eye_patch,context='FACES');bm.to_mesh(body.data);bm.free();body.data.update()
print('Removed closed inner-orbit patches',len(eye_patch),flush=True)
for side in [-1,1]:
    for part,radius,material_name in [('Sclera',.0108,'Eyes_Sclera'),('Iris',.0065,'Eyes_Brown_Iris'),('Pupil',.0025,'Eyes_Pupil')]:
        if part=='Sclera':
            location=head_bind@Vector((side*.027,.036,.0855))
            bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=radius,location=location)
            eye=bpy.context.object;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        else:
            # Follow globe curvature so the flat iris cannot float in front of
            # the lids. Lid anatomy naturally occludes the outer iris edge.
            verts=[];faces=[]
            for ring in range(9):
                r=radius*ring/8
                for segment in range(32):
                    a=segment*2*math.pi/32;forward=.0855+math.sqrt(.0108**2-r*r)+(.00010 if part=='Pupil' else .00005)
                    verts.append(tuple(head_bind@Vector((side*.027+r*math.cos(a),.036+r*math.sin(a),forward))))
            for ring in range(8):
                for segment in range(32):
                    a=ring*32+segment;b=ring*32+(segment+1)%32;faces.append((a,b,b+32,a+32))
            data=bpy.data.meshes.new(part+'_Curved_Surface');data.from_pydata(verts,[],faces);data.update();eye=bpy.data.objects.new('Eye_'+str(side)+'_'+part,data);scene.collection.objects.link(eye)
        eye.name='Eye_'+str(side)+'_'+part;eye.data.materials.append(bpy.data.materials[material_name])
        for polygon in eye.data.polygons:polygon.use_smooth=True
        group=eye.vertex_groups.new(name='head');group.add(list(range(len(eye.data.vertices))),1,'REPLACE');modifier=eye.modifiers.new('Head_Skin','ARMATURE');modifier.object=rig;eye.parent=rig
for name,rgba,rough in [('Eyes_Sclera',(.82,.80,.73,1),.45),('Eyes_Brown_Iris',(.070,.034,.010,1),.42),('Eyes_Pupil',(.008,.006,.004,1),.30),('Competition_Green_Fabric',(.015,.29,.115,1),.86),('Green_Ribbed_Binding',(.020,.25,.10,1),.91),('Dark_Competition_Shorts',(.026,.045,.052,1),.88),('Oiled_Brown_Wood',(.34,.16,.055,1),.62)]:
    shader=bpy.data.materials[name].node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=rgba;shader.inputs['Roughness'].default_value=rough;shader.inputs['Metallic'].default_value=0

# Regenerate actual contact morphs for the changed stroke, using full anatomy.
motion_report=motion.apply_motion_v19(rig,paddle,scene,foot_targets={'l':[.095,-.36,.11],'r':[-.095,-.36,.11]})
shirt=scene.objects['Competition_Tank_Top_Loose']
shirt_surface=BVHTree.FromPolygons([v.co for v in shirt.data.vertices],[p.vertices[:] for p in shirt.data.polygons])
for obj in scene.objects:
    if obj.type!='MESH' or not obj.name.startswith('Uniform_Print'):continue
    back='Khmer' in obj.name
    for vertex in obj.data.vertices:
        origin=Vector((vertex.co.x,.5 if back else -.5,vertex.co.z))
        point,_,_,_=shirt_surface.ray_cast(origin,Vector((0,-1 if back else 1,0)))
        if point is not None:vertex.co.y=point.y+(.006 if back else -.006)
    obj.vertex_groups.clear()
    low=obj.vertex_groups.new(name='spine_01');high=obj.vertex_groups.new(name='spine_03')
    for vertex in obj.data.vertices:
        u=max(0,min(1,(vertex.co.z-1.05)/.23));u=u*u*(3-2*u)
        low.add([vertex.index],1-u,'REPLACE');high.add([vertex.index],u,'REPLACE')
garments=[o for o in scene.objects if o.type=='MESH' and (o.name.startswith(('Tank_Top','Uniform_Print')) or o.name in {'Competition_Tank_Top_Loose','Competition_Shorts_Loose'})]
for obj in garments:
    for vertex in obj.data.vertices:
        entries=sorted([(e.group,e.weight) for e in vertex.groups if e.weight>1e-8],key=lambda e:e[1],reverse=True)[:4]
        for group in obj.vertex_groups:group.remove([vertex.index])
        total=sum(weight for _,weight in entries)
        for group,weight in entries:obj.vertex_groups[group].add([vertex.index],weight/total,'REPLACE')
contact_regions={}
for label,allowed in [('shirt',{'pelvis','spine_01','spine_02','spine_03'}),('shorts',{'pelvis','spine_01','thigh_l','thigh_r'})]:
    influence=[sum(e.weight for e in vertex.groups if collision_body.vertex_groups[e.group].name in allowed) for vertex in collision_body.data.vertices]
    contact_regions[label]=[polygon.vertices[:] for polygon in collision_body.data.polygons if min(influence[i] for i in polygon.vertices)>.65]
rests={o.name:[v.co.copy() for v in o.data.vertices] for o in garments}
weights={o.name:[[(o.vertex_groups[e.group].name,e.weight) for e in v.groups] for v in o.data.vertices] for o in garments}
for o in garments:o.shape_key_add(name='Basis')
max_contact=0;contact_samples=0
for frame in range(1,50):
    scene.frame_set(frame);bpy.context.view_layer.update();posed=collision_body.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    surfaces={label:BVHTree.FromPolygons([v.co for v in posed.vertices],faces) for label,faces in contact_regions.items()};surfaces['shoulder']=BVHTree.FromObject(collision_body,bpy.context.evaluated_depsgraph_get());bone_matrices={b.name:b.matrix@rig.data.bones[b.name].matrix_local.inverted() for b in rig.pose.bones}
    for obj in garments:
        surface=surfaces['shorts' if obj.name=='Competition_Shorts_Loose' else 'shirt']
        key=obj.shape_key_add(name=f'V19_Cloth_Contact_{frame:02}')
        for i,(rest,influences) in enumerate(zip(rests[obj.name],weights[obj.name])):
            # Actual shoulders need the full anatomy rather than a torso BVH
            # boundary. The 15 mm correction limit prevents distant snapping.
            local_surface=surfaces['shoulder'] if obj.name=='Competition_Tank_Top_Loose' and rest.z>1.35 else surface
            deform=Matrix(((0,0,0,0),)*4)
            for name,weight in influences:
                if name in bone_matrices:deform+=bone_matrices[name]*weight
            point=deform@rest;nearest,normal,_,distance=local_surface.find_nearest(point)
            if nearest is not None and (point-nearest).dot(normal)<.004 and distance<.02:
                correction=nearest+normal*.004-point
                if correction.length>.015:correction*=.015/correction.length
                key.data[i].co=rest+deform.to_3x3().inverted_safe()@correction;max_contact=max(max_contact,correction.length);contact_samples+=1
        for time,value in [(max(1,frame-1),0),(frame,1),(min(49,frame+1),0)]:key.value=1 if time==frame else value;key.keyframe_insert('value',frame=time)
        key.value=0
    if frame%12==0:print('V19 cloth contact',frame,'/49',flush=True)
bpy.data.objects.remove(collision_body,do_unlink=True)
scene.frame_set(18);bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'athlete-v19.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True,export_apply=True)
# Blender's glTF exporter does not translate arbitrary MixRGB trees. Persist
# the exact same tint as standard glTF baseColorFactor without modifying pixels.
glb_path=out/'athlete-v19.glb';raw=glb_path.read_bytes();json_length=struct.unpack_from('<I',raw,12)[0];model=json.loads(raw[20:20+json_length])
for material in model.get('materials',[]):
    if material.get('name')=='Skin_CC0_Asian_Male':material['pbrMetallicRoughness']['baseColorFactor']=[.60,.43,.29,1]
encoded=json.dumps(model,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);remaining=raw[20+json_length:]
glb_path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(remaining))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+remaining)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'athlete-v19.blend'))
report={'source':'MakeHuman/MPFB via Innerscene CC0','bodyTrianglesBeforeEyeOpenings':original_body_triangles,'faceAndFingerTopologyPreservedExceptInnerClosedEyePatch':True,'eyePatchFacesRemoved':len(eye_patch),'skinSourcePixelsUnmodified':True,'skinBaseColorFactor':[.60,.43,.29,1],'garments':garment_report,'clothingContactSamples':contact_samples,'maxClothingCorrectionM':max_contact,'motion':motion_report,'caps':'Fitted six-panel forward baseball cap','scope':'One detailed seated athlete; not a full-crew mobile LOD'}
(out/'hero-build-report.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report),flush=True)

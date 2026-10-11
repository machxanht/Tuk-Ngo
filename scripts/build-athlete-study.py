"""Author one detailed generic Tum Nup 2 rower in Blender, using real 2024 references.

Run with Blender --background --python this_file -- --output DIRECTORY.
The licensed body is retained; garments, cap and paddle are newly authored meshes.
No press photograph is used as a texture. Dimensions and motion are estimates.
"""
import argparse, json, math, sys
from pathlib import Path
import bpy
import bmesh, numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
out = Path(args.output).resolve(); out.mkdir(parents=True, exist_ok=True)
repo = Path(__file__).resolve().parent.parent
cache = repo.parent / 'tools/asset-cache/young-asian-male'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(repo/'public/assets/human/makehuman-athlete-base.glb'))
scene=bpy.context.scene
rig=next(o for o in scene.objects if o.type=='ARMATURE')
body=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>10000)
body.name='Athlete_Study_Anatomy_CC0'; rig.name='Athlete_Study_Rig'
for obj in list(scene.objects):
    if obj not in {rig,body} and obj.type=='MESH': bpy.data.objects.remove(obj,do_unlink=True)

def material(name,color,roughness=.65):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=roughness
    return mat

skin=material('Skin_CC0_Asian_Male',(.80,.68,.57),.48)
nodes=skin.node_tree.nodes; links=skin.node_tree.links; bs=nodes.get('Principled BSDF')
image=nodes.new('ShaderNodeTexImage'); image.image=bpy.data.images.load(str(cache/'young_lightskinned_male_diffuse3.png')); image.image.pack()
# Warm the licensed generic skin map once, with a neutral material multiplier.
pixels=np.empty(len(image.image.pixels),dtype=np.float32);image.image.pixels.foreach_get(pixels)
pixels=pixels.reshape((-1,4));pixels[:,:3]*=np.array([.68,.62,.55],dtype=np.float32)
image.image.pixels.foreach_set(pixels.ravel());image.image.pack()
links.new(image.outputs['Color'],bs.inputs['Base Color'])
bs.inputs['Subsurface Weight'].default_value=.055
bs.inputs['Subsurface Radius'].default_value=(1,.38,.2)
body.data.materials.clear();body.data.materials.append(skin)
# Keep face, hands and joint detail instead of reducing the complete actor to the crew LOD.
for p in body.data.polygons:p.use_smooth=True
# The standalone review retains the full source detail. Crew LOD is a separate
# step after visual acceptance, and must not collapse face or finger geometry.

# Garment weights are interpolated from nearby licensed anatomy, then limited to
# torso / pelvis / thighs. Cloth at the armhole must not inherit arm rotation.
tree=KDTree(len(body.data.vertices))
for v in body.data.vertices:tree.insert(v.co,v.index)
tree.balance()
def skin_mesh(obj,allowed=None):
    for group in body.vertex_groups:
        if group.name in rig.data.bones:obj.vertex_groups.new(name=group.name)
    for v in obj.data.vertices:
        influences={}
        for _,index,distance in tree.find_n(v.co,4):
            influence=1/max(distance,.002)**2
            for entry in body.data.vertices[index].groups:
                name=body.vertex_groups[entry.group].name
                if name not in rig.data.bones or (allowed and name not in allowed):continue
                influences[name]=influences.get(name,0)+entry.weight*influence
        influences=dict(sorted(influences.items(),key=lambda item:item[1],reverse=True)[:4])
        total=sum(influences.values())
        if not total:influences={'spine_03' if v.co.z>1.10 else 'pelvis':1};total=1
        for name,value in influences.items():obj.vertex_groups[name].add([v.index],value/total,'REPLACE')
    mod=obj.modifiers.new('Anatomical_Skin','ARMATURE');mod.object=rig
    obj.parent=rig

def mesh(name,verts,faces,mat,uv=None,weights=True,allowed=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);data.materials.append(mat)
    for p in data.polygons:p.use_smooth=True
    if uv:
        layer=data.uv_layers.new(name='UVMap')
        for loop in data.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
    if weights:skin_mesh(obj,allowed)
    return obj

# The CC0 anatomical base contains eyelids/socket anatomy but no separate eyes.
# These fitted head-relative positions also underpin the existing crew's eye
# accessories. Keep the eyelids; add small sclera, brown iris and pupil meshes.
eye_white=material('Eyes_Sclera',(.64,.61,.53),.32)
eye_iris=material('Eyes_Brown_Iris',(.045,.022,.009),.28)
eye_pupil=material('Eyes_Pupil',(.003,.003,.002),.18)
head_origin=rig.data.bones['head'].head_local
for sign,side in [(-1,'Right'),(1,'Left')]:
    for part,radius,depth,forward,mat in [('Sclera',.010,.50,.069,eye_white),('Iris',.005,.40,.074,eye_iris),('Pupil',.0024,.32,.076,eye_pupil)]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=radius,location=(head_origin.x+sign*.027,head_origin.y-forward,head_origin.z+.046))
        obj=bpy.context.object;obj.name=f'Eye_{side}_{part}';obj.scale.y=depth;obj.data.materials.append(mat)
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        for polygon in obj.data.polygons:polygon.use_smooth=True
        group=obj.vertex_groups.new(name='head');group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
        modifier=obj.modifiers.new('Head_Attachment','ARMATURE');modifier.object=rig;obj.parent=rig

green=material('Competition_Green_Fabric',(.012,.34,.135),.72)
shirt_bones={'pelvis','spine_01','spine_02','spine_03','clavicle_l','clavicle_r'}
trim=material('Green_Ribbed_Binding',(.014,.245,.095),.79)
navy=material('Dark_Competition_Shorts',(.012,.060,.033),.78)
white=material('White_Cotton_Cap',(.88,.89,.86),.76)
hair=material('Short_Black_Hair',(.014,.009,.006),.83)
wood=material('Oiled_Brown_Wood',(.32,.105,.030),.34)
gripmat=material('Pale_Grip_Wrap',(.72,.75,.69),.68)
blue=material('Blue_Shaft_Tape',(.015,.12,.36),.43)

def fabric(mat,scale,bump=.00055):
    n=mat.node_tree.nodes;l=mat.node_tree.links;s=n.get('Principled BSDF')
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=scale;tex.inputs['Detail'].default_value=2
    b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=.28;b.inputs['Distance'].default_value=bump
    l.new(tex.outputs['Fac'],b.inputs['Height']);l.new(b.outputs['Normal'],s.inputs['Normal'])
# The exported material uses the same plain fabric roughness as the studio.
# Silhouette folds are geometry; unsupported procedural shaders are not proof
# of detail that would survive in the tablet GLB.
# Loft an actual loose tank top. The shoulder / neck / armhole boundary is
# continuous, and raised folds change silhouette rather than just the normal map.
N=112; M=34
topkeys=[(0,1.323),(.34,1.34),(.62,1.414),(.86,1.419),(1.12,1.32),(math.pi/2,1.215),(2.03,1.32),(2.32,1.415),(2.58,1.420),(math.pi,1.392)]
def interp(keys,t):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if a<=t<=b:u=(t-a)/(b-a);u=u*u*(3-2*u);return x+(y-x)*u
    return keys[-1][1]
def cloth_point(theta,v):
    a=math.acos(math.cos(theta)); top=interp(topkeys,a);z=.914+(top-.914)*v
    rx=interp([(.91,.174),(1.0,.177),(1.10,.182),(1.20,.211),(1.30,.215),(1.42,.182)],z)
    ry=interp([(.91,.128),(1.04,.125),(1.20,.128),(1.30,.121),(1.42,.084)],z)
    center=interp([(.91,-.016),(1.04,-.035),(1.20,-.035),(1.30,-.015),(1.42,-.012)],z)
    # Fabric hangs clear of abdomen, with side tension folds and an uneven hem.
    folds=(.0035*math.sin(theta*9+v*7)+.0020*math.sin(theta*19-v*9))*math.sin(math.pi*v)
    folds+=.007*math.sin(theta*6+v*4)*(1-v)**2
    z+=.005*math.sin(theta*5)*(1-v)**6
    return (math.sin(theta)*(rx+folds),center-math.cos(theta)*(ry+folds),z)
verts=[];uv=[];faces=[]
for j in range(M+1):
    for i in range(N+1):
        t=2*math.pi*i/N;v=j/M;verts.append(cloth_point(t,v));uv.append((i/N,v))
for j in range(M):
    for i in range(N):
        k=j*(N+1)+i;faces.append((k,k+1,k+N+2,k+N+1))
# A tank top has THREE upper boundary loops (neck and two armholes). An open
# cylindrical loft alone has one loop and leaves disconnected shoulder tabs.
# Stitch the front and back panels using their exact loft boundary vertices.
inner_index=8;outer_index=18
inner=math.pi*2*inner_index/N;outer=math.pi*2*outer_index/N
def shoulder_point(theta,u,sign):
    front=Vector(cloth_point(theta,1));back=Vector(cloth_point(math.pi-theta,1))
    p=front.lerp(back,u);p.z+=.023*math.sin(math.pi*u)
    p.x*=sign
    return tuple(p)
for sign,side in [(1,'Right'),(-1,'Left')]:
    rows=[]
    for j in range(17):
        row=[]
        for i in range(inner_index,outer_index+1):
            if j==0:idx=M*(N+1)+(i if sign==1 else N-i)
            elif j==16:idx=M*(N+1)+(N//2-i if sign==1 else N//2+i)
            else:
                idx=len(verts);verts.append(shoulder_point(math.pi*2*i/N,j/16,sign));uv.append((i/N,1+j/100))
            row.append(idx)
        rows.append(row)
    for j in range(16):
        for i in range(outer_index-inner_index):
            face=(rows[j][i],rows[j][i+1],rows[j+1][i+1],rows[j+1][i])
            faces.append(tuple(reversed(face)) if sign==1 else face)
shirt=mesh('Competition_Tank_Top_Loose',verts,faces,green,uv,allowed=shirt_bones)
bm=bmesh.new();bm.from_mesh(shirt.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(shirt.data);bm.free()
# Keep the stitched control mesh in both Blender and GLB. Applying subdivision
# to a shape-key mesh drops its exported contact corrections. Binding supplies
# the visible edge thickness; the cloth itself is a two-sided export material.

def tube(name,points,radius,mat,allowed=None,weights=True):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=2;curve.bevel_depth=radius;curve.bevel_resolution=3
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for point,co in zip(spline.points,points):point.co=(*co,1)
    obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj);obj.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
    if weights:skin_mesh(obj,allowed)
    return obj
neck=[cloth_point(-inner+2*inner*i/24,1) for i in range(25)]
neck += [shoulder_point(inner,j/16,1) for j in range(1,17)]
neck += [cloth_point(math.pi-inner+2*inner*i/24,1) for i in range(1,25)]
neck += [shoulder_point(inner,1-j/16,-1) for j in range(1,17)]
tube('Tank_Top_Neck_Binding',neck,.0032,trim,shirt_bones)
for sign,side in [(1,'Right'),(-1,'Left')]:
    pts=[shoulder_point(outer,j/16,sign) for j in range(17)]
    pts += [tuple(Vector(cloth_point(math.pi-outer-(math.pi-2*outer)*i/48,1))*Vector((sign,1,1))) for i in range(1,49)]
    tube('Tank_Top_'+side+'_Armhole_Binding',pts,.0032,trim,shirt_bones)
tube('Tank_Top_Hem',[cloth_point(2*math.pi*i/N,.008) for i in range(N+1)],.0028,trim,{'pelvis','spine_01'})
for t in [math.pi/2,3*math.pi/2]:tube('Tank_Top_Side_Seam',[cloth_point(t,j/M) for j in range(M+1)],.0012,trim,{'pelvis','spine_01','spine_02','spine_03'})

# Loose shorts have a separate waistband and two real leg openings. The main
# shorts mesh follows the body but receives outward ease and gathered cloth folds.
short_verts=[];short_faces=[];short_uv=[]
# Continuous rings give each leg a complete clean hem, independent of body faces.
for side in [-1,1]:
    start=len(short_verts)
    for j in range(13):
        u=j/12;z=.60+.32*u
        for i in range(65):
            t=2*math.pi*i/64
            short_verts.append((side*.095+(.105-.04*u)*math.sin(t),-.022+(.115-.008*u)*math.cos(t),z))
            short_uv.append((i/64,u))
    for j in range(12):
        for i in range(64):
            k=start+j*65+i;short_faces.append((k,k+1,k+66,k+65))
shorts=mesh('Competition_Shorts_Loose',short_verts,short_faces,navy,short_uv,allowed={'pelvis','thigh_l','thigh_r'})
bm=bmesh.new();bm.from_mesh(shorts.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(shorts.data);bm.free()
sm=shorts.modifiers.new('Cloth_Smoothing','SMOOTH');sm.factor=.35;sm.iterations=5
bpy.context.view_layer.objects.active=shorts;shorts.modifiers.move(len(shorts.modifiers)-1,0);bpy.ops.object.modifier_apply(modifier=sm.name)
mod=shorts.modifiers.new('Cloth_Edge_Thickness','SOLIDIFY');mod.thickness=.0018
v=[];f=[]
for j in range(5):
    z=.858+j*.011
    for i in range(97):
        theta=i*math.pi*2/96
        v.append((.163*math.sin(theta),-.025-.107*math.cos(theta),z))
for j in range(4):
    for i in range(96):k=j*97+i;f.append((k,k+1,k+98,k+97))
waist=mesh('Shorts_Continuous_Waistband',v,f,navy,allowed={'pelvis','spine_01'})
mod=waist.modifiers.new('Waistband_Thickness','SOLIDIFY');mod.thickness=.002

ink=material('White_Uniform_Print',(.86,.89,.85),.72)
font=bpy.data.fonts.load('C:/Windows/Fonts/arialbd.ttf')
def lettering(text,x,y,z,size,back=False):
    data=bpy.data.curves.new('Uniform_Print','FONT');data.body=text;data.size=size;data.align_x='CENTER';data.font=font;data.resolution_u=3
    obj=bpy.data.objects.new('Uniform_Print_'+text,data);scene.collection.objects.link(obj);data.materials.append(ink)
    obj.location=(x,y,z);obj.rotation_euler=(math.pi/2,0,math.pi if back else 0)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);obj.select_set(False)
    for v in obj.data.vertices:
        rx=interp([(.91,.174),(1.0,.177),(1.10,.182),(1.20,.211),(1.30,.215),(1.42,.182)],v.co.z)
        theta=math.asin(max(-.98,min(.98,v.co.x/rx)));theta=math.pi-theta if back else theta
        top=interp(topkeys,math.acos(math.cos(theta)));level=(v.co.z-.914)/(top-.914)
        v.co.y=cloth_point(theta,level)[1]+(.003 if back else -.003)
    skin_mesh(obj,{'spine_01','spine_02','spine_03'})
lettering('TUM NÚP 2',-.105,-.119,1.276,.017)
# Khmer text is shaped by Windows DrawString in build-athlete-study.ps1.
textmat=material('Khmer_Back_Print_Only',(1,1,1),.8)
textmat.surface_render_method='DITHERED'
textimage=bpy.data.images.load(str(out/'koun-khmer.png'));textimage.pack()
tex=textmat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=textimage
textmat.node_tree.links.new(tex.outputs['Color'],textmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
textmat.node_tree.links.new(tex.outputs['Alpha'],textmat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'])
v=[];f=[];uv=[]
for j in range(7):
    for i in range(33):
        theta=math.pi-.72+1.44*i/32;z=1.22+j*.011
        top=interp(topkeys,math.acos(math.cos(theta)));q=Vector(cloth_point(theta,(z-.914)/(top-.914)));q.y+=.003
        v.append(tuple(q));uv.append((.329+i/32*.344,.281+j/6*.484))
for j in range(6):
    for i in range(32):
        k=j*33+i;f.append((k,k+1,k+34,k+33))
printobj=mesh('Uniform_Print_Koun_Khmer',v,f,textmat,uv,allowed={'spine_01','spine_02','spine_03'})
printobj['text']='កូនខ្មែរ';printobj['translation']='Koun Khmer'
bpy.data.fonts.remove(font)

# A six-panel fabric cap with shaped rear visor, seams, sweatband and button.
# Backwards white caps are visible on the selected 2024 athletes.
capverts=[];capfaces=[]
for j in range(17):
    elevation=(math.pi/2)*j/16
    for i in range(73):
        theta=2*math.pi*i/72
        capverts.append((.096*math.cos(elevation)*math.sin(theta),-.040+.107*math.cos(elevation)*math.cos(theta),1.637+.077*math.sin(elevation)))
for j in range(16):
    for i in range(72):k=j*73+i;capfaces.append((k,k+1,k+74,k+73))
cap=mesh('White_Cap_Six_Panels',capverts,capfaces,white,allowed={'head'})
mod=cap.modifiers.new('Cotton_Thickness','SOLIDIFY');mod.thickness=.0015
for panel in range(6):
    theta=panel*math.pi/3
    tube('Cap_Panel_Seam',[(.0965*math.cos(t)*math.sin(theta),-.040+.1075*math.cos(t)*math.cos(theta),1.637+.078*math.sin(t)) for t in [j*math.pi/2/24 for j in range(25)]],.0008,white,{'head'})
tube('Cap_Sweatband',[(.096*math.sin(i*math.pi*2/72),-.040+.107*math.cos(i*math.pi*2/72),1.638) for i in range(73)],.0035,white,{'head'})
v=[];f=[]
for j in range(9):
    for i in range(49):
        angle=-1.12+2.24*i/48;r=j/8
        x=.088*math.sin(angle)*(1+r*.11);y=-.040+.107*math.cos(angle)+r*.074*math.cos(angle)
        z=1.639-.018*r-.009*(x/.10)**2;v.append((x,y,z))
for j in range(8):
    for i in range(48):k=j*49+i;f.append((k,k+1,k+50,k+49))
visor=mesh('Cap_Curved_Rear_Visor',v,f,white,allowed={'head'});mod=visor.modifiers.new('Visor_Edge','SOLIDIFY');mod.thickness=.0025
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.006,location=(0,-.04,1.716));button=bpy.context.object;button.name='Cap_Button';button.data.materials.append(white)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);skin_mesh(button,{'head'})

# A long rounded wooden dam, with a tapered oval shaft, lens-section blade and
# pale rounded hand grip. The broad blade plane faces the water pull.
paddle=bpy.data.objects.new('Dam_Wood_152cm',None);scene.collection.objects.link(paddle)
paddle['lengthM']=1.52;paddle['dimensionsEvidence']='APPROXIMATE from real photograph, not field measured'
def attach(obj):obj.parent=paddle
shaft=tube('Dam_Tapered_Shaft',[(0,0,-.025),(0,0,-.34),(0,0,-.71),(0,0,-1.04)],.0145,wood,weights=False);attach(shaft)
# Blade half-width profile is narrow at neck and has a round toe, not a point.
blade_keys=[(0,.020),(.07,.039),(.18,.067),(.30,.079),(.39,.072),(.455,.044),(.48,0)]
v=[];f=[];uv=[]
for j in range(41):
    d=.48*j/40;w=interp(blade_keys,d) if d<.39 else .072*math.sqrt(max(0,1-((d-.39)/.09)**2))
    for i in range(49):
        theta=2*math.pi*i/48;v.append((.0075*math.cos(theta)*(1-.3*j/40),w*math.sin(theta),-1.04-d));uv.append((i/48,j/40))
for j in range(40):
    for i in range(48):k=j*49+i;f.append((k,k+1,k+50,k+49))
blade=mesh('Dam_Long_Rounded_Blade',v,f,wood,uv,weights=False);attach(blade)
handle=tube('Dam_Rounded_Hand_Grip',[(0,-.052,0),(0,.052,0)],.016,gripmat,weights=False);attach(handle)
band=tube('Dam_Blue_Identification_Tape',[(0,0,-.285),(0,0,-.325)],.0152,blue,weights=False);attach(band)

# Rest-frame basis helpers retain the anatomical bone roll. Every frame is baked
# as ordinary bone rotations; the exported GLB needs no Blender IK constraints.
rig.location.z=-.35;bpy.context.view_layer.update()
pb=rig.pose.bones
rest={b.name:b.matrix.copy() for b in pb}
def pos(name):return rig.matrix_world@pb[name].head
def quat(name):return (rig.matrix_world@pb[name].matrix).to_quaternion()
def setq(name,q):
    b=pb[name];matrix=(rig.matrix_world@b.matrix).copy();matrix=Matrix.LocRotScale(matrix.translation,q,Vector((1,1,1)));b.matrix=rig.matrix_world.inverted()@matrix;bpy.context.view_layer.update()
def direction(name,child,desired):
    q=(pos(child)-pos(name)).normalized().rotation_difference(Vector(desired).normalized())@quat(name);setq(name,q)
def frameq(x,y):
    y=y.normalized();x=(x-y*x.dot(y)).normalized();z=x.cross(y).normalized();return Matrix((x,y,z)).transposed().to_quaternion()
feet={s:quat('foot_'+s) for s in ['l','r']}
for s,sign in [('l',1),('r',-1)]:
    direction('thigh_'+s,'calf_'+s,(sign*.07,-.94,-.27))
    direction('calf_'+s,'foot_'+s,(0,-.02,-1));setq('foot_'+s,feet[s])
arms=[]
for s,sign in [('l',1),('r',-1)]:
    upper='upperarm_'+s;lower='lowerarm_'+s;hand='hand_'+s
    u=(pos(lower)-pos(upper)).normalized();fore=(pos(hand)-pos(lower)).normalized();hinge=u.cross(fore).normalized()
    handdir=(pos('middle_01_'+s)-pos(hand)).normalized();across=(pos('index_01_'+s)-pos('pinky_01_'+s)).normalized()
    palm=(pos('middle_01_'+s)-pos(hand))*.90
    arms.append({'s':s,'sign':sign,'upper':upper,'lower':lower,'hand':hand,'uLen':(pos(lower)-pos(upper)).length,'fLen':(pos(hand)-pos(lower)).length,'palmLen':palm.length,'upperFrame':frameq(hinge,u).inverted()@quat(upper),'foreFrame':frameq(hinge,fore).inverted()@quat(lower),'handFrame':frameq(across,handdir).inverted()@quat(hand)})
presets={b.name:b.matrix_basis.copy() for b in pb}
# Keep complete chest / shoulder anatomy behind the moving vest: a surface
# covered at rest can be exposed when the shoulder rises. Cloth contact morphs
# handle torso clearance; remove only permanently covered crotch / upper legs.
collision_body=body.copy();collision_body.data=body.data.copy();collision_body.name='Temporary_Full_Anatomy_Collision';scene.collection.objects.link(collision_body)
bm=bmesh.new();bm.from_mesh(body.data)
remove=[]
for f in bm.faces:
    def covered(v):
        x,y,z=v.co
        return .625<z<.915 and abs(x)<.30
    if all(covered(v) for v in f.verts):remove.append(f)
bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(body.data);bm.free();body.data.update()
keys=[0,.13,.32,.53,.60,.86,1]
leans=[34,32,20,2,8,30,34]
top_forward=[.44,.44,.40,.32,.38,.48,.44]
top_height=[1.18,1.15,1.11,1.04,1.24,1.25,1.18]
shaft_sweep=[23,9,-8,-33,-25,33,23]
max_gap=0;max_reach_excess=0;max_grip_path_correction=0
def values(values,t):return interp(list(zip(keys,values)),t)
def pose(t):
    global max_gap,max_reach_excess,max_grip_path_correction
    for b in pb:b.matrix_basis=presets[b.name]
    bpy.context.view_layer.update()
    lean=math.radians(values(leans,t))
    for name,factor in [('spine_01',.7),('spine_03',.3),('head',-.6)]:setq(name,Quaternion(Vector((1,0,0)),lean*factor)@quat(name))
    # Author the reachable upper-hand arc first. The long blade follows it;
    # raising the blade must not lift the hand beyond anatomical arm reach.
    angle=math.radians(values(shaft_sweep,t));dx=.33
    axis=Vector((dx,math.sin(angle)*math.sqrt(1-dx*dx),math.cos(angle)*math.sqrt(1-dx*dx)))
    top=Vector((-.1584,-values(top_forward,t),values(top_height,t)))
    authored_top=top.copy()
    # Project the shared paddle into both arm reach annuli. This keeps the
    # authored recovery lift while preventing a locked elbow / detached grip.
    for _ in range(24):
        for i,a in enumerate(arms):
            center=pos(a['upper'])+(axis*.53 if i else Vector((0,0,0)))
            reach=a['fLen']+a['palmLen'];upper=a['uLen']
            low=math.sqrt(upper*upper+reach*reach-2*upper*reach*math.cos(math.radians(55)))
            high=math.sqrt(upper*upper+reach*reach-2*upper*reach*math.cos(math.radians(145)))
            delta=top-center;distance=delta.length
            if distance<low:top=center+delta.normalized()*low
            elif distance>high:top=center+delta.normalized()*high
    max_grip_path_correction=max(max_grip_path_correction,(top-authored_top).length)
    width=(Vector((1,0,0))-axis*axis.x).normalized();thickness=width.cross(axis).normalized()
    paddle.location=top;paddle.rotation_mode='QUATERNION';paddle.rotation_quaternion=Matrix((thickness,width,axis)).transposed().to_quaternion()
    for i,a in enumerate(arms):
        grip=top if i==0 else top-axis*.53
        origin=pos(a['upper']);delta=grip-origin;distance=delta.length;reach=a['fLen']+a['palmLen']
        max_reach_excess=max(max_reach_excess,distance-a['uLen']-reach)
        d=min(distance,a['uLen']+reach-.0001);unit=delta.normalized()
        along=(a['uLen']**2-reach**2+d*d)/(2*d);height=math.sqrt(max(0,a['uLen']**2-along**2))
        # A down/back pole becomes parallel to the lower-hand reach on recovery
        # and flips the elbow plane. A lateral pole keeps the elbow on its side
        # of the torso throughout this authored reachable grip arc.
        pole=Vector((a['sign'],0,0));pole=(pole-unit*pole.dot(unit)).normalized()
        elbow=origin+unit*along+pole*height;end=elbow+(origin+unit*d-elbow).normalized()*a['fLen']
        u=(elbow-origin).normalized();fore=(end-elbow).normalized();hinge=u.cross(fore).normalized()
        setq(a['upper'],frameq(hinge,u)@a['upperFrame']);setq(a['lower'],frameq(hinge,fore)@a['foreFrame'])
        handdir=(grip-end).normalized();bar=width if i==0 else axis
        # Keep wrist roll in its anatomical elbow plane. Switching from shaft
        # to a fallback axis near parallel alignment caused a visible snap.
        setq(a['hand'],frameq(hinge,handdir)@a['handFrame'])
        max_gap=max(max_gap,abs(distance-d))
        # Fixed curl angles cannot guarantee contact after a wrist roll. Place
        # each finger around the actual shaft / cross-grip in world space.
        bar=bar.normalized()
        for finger in ['index','middle','ring','pinky','thumb']:
            first=f'{finger}_01_{a["s"]}';base=pos(first)
            center=grip+bar*(base-grip).dot(bar)
            radial=(base-center).normalized()
            wrap=-1 if finger=='thumb' else 1
            for n,angle in zip([1,2,3],[65,135,205]):
                name=f'{finger}_0{n}_{a["s"]}';b=pb[name]
                target=center+Quaternion(bar,math.radians(angle*wrap))@radial*.017
                source=(rig.matrix_world@b.tail)-pos(name)
                desired=target-pos(name)
                if source.length>.0001 and desired.length>.0001:setq(name,source.normalized().rotation_difference(desired.normalized())@quat(name))
    bpy.context.view_layer.update()

scene.render.fps=30;scene.frame_start=1;scene.frame_end=49
for frame in range(1,50):
    scene.frame_set(frame);pose((frame-1)/48)
    for b in pb:
        b.rotation_mode='QUATERNION';b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
    paddle.keyframe_insert('location',frame=frame);paddle.keyframe_insert('rotation_quaternion',frame=frame)
for obj in [rig,paddle]:
    if obj.animation_data and obj.animation_data.action:obj.animation_data.action.name='Rowing_Study_2024'

# Correct cloth contact against the FULL posed anatomy, before covered skin was
# removed. Keep the correction as ordinary morph keys so the same collision
# correction survives GLB export. This is authored contact correction, not a
# claim of a physical cloth simulation.
garments=[o for o in scene.objects if o.type=='MESH' and (o.name.startswith('Tank_Top') or o==shirt or o.name.startswith('Uniform_Print'))]
rest_vertices={o.name:[v.co.copy() for v in o.data.vertices] for o in garments}
groups={o.name:[[(o.vertex_groups[e.group].name,e.weight) for e in v.groups] for v in o.data.vertices] for o in garments}
for o in garments:o.shape_key_add(name='Basis')
max_cloth_correction=0;corrected_vertices=0
for frame in range(1,50):
    scene.frame_set(frame);bpy.context.view_layer.update()
    surface=BVHTree.FromObject(collision_body,bpy.context.evaluated_depsgraph_get())
    bone_matrices={b.name:b.matrix@rig.data.bones[b.name].matrix_local.inverted() for b in pb}
    for obj in garments:
        key=obj.shape_key_add(name=f'Cloth_Contact_{frame:02}')
        for i,(rest,weights) in enumerate(zip(rest_vertices[obj.name],groups[obj.name])):
            deform=Matrix(((0,0,0,0),)*4)
            for name,weight in weights:
                if name in bone_matrices:deform+=bone_matrices[name]*weight
            point=deform@rest
            nearest,normal,_,distance=surface.find_nearest(point)
            if nearest is not None:
                signed=(point-nearest).dot(normal)
                if signed<.005 and distance<.10:
                    correction=(nearest+normal*.005)-point
                    key.data[i].co=rest+deform.to_3x3().inverted_safe()@correction
                    max_cloth_correction=max(max_cloth_correction,correction.length);corrected_vertices+=1
        for time,value in [(max(1,frame-1),0),(frame,1),(min(49,frame+1),0)]:
            if time==frame:value=1
            key.value=value;key.keyframe_insert('value',frame=time)
        key.value=0
    print(f'Cloth contact {frame}/49',flush=True) if frame%12==0 else None
bpy.data.objects.remove(collision_body,do_unlink=True)
scene.frame_set(8)
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'athlete-rower-study.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True,export_apply=True)
report={'bodySource':'MakeHuman/MPFB via Innerscene CC0','newMeshes':['stitched loose tank top','binding and seams','loose shorts and continuous waistband','six-panel white cap','curved visor','rounded wooden dam'],'realReference':'Thanh Nien / Duy Tan, 15 November 2024, photos 8 and 11','dimensions':'approximate','paddleLengthM':1.52,'bladeLengthM':.48,'bladeWidthM':.158,'animationFrames':49,'maxHandReachExcessM':max_reach_excess,'maxArmReachClampM':max_gap,'maxGripPathCorrectionM':max_grip_path_correction,'bodyTriangles':sum(len(p.vertices)-2 for p in body.data.polygons),'clothContactFrames':49,'maxClothCorrectionM':max_cloth_correction,'clothCorrectedVertexSamples':corrected_vertices}
(out/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report),flush=True)

# Keep an editable source with the actual constructed meshes and baked pose keys.
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'athlete-rower-study.blend'))
if args.render:
    scene.world=bpy.data.worlds.new('Studio_World')
    world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.19,.20,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.25));floor=bpy.context.object;floor.data.materials.append(material('Studio_Floor',(.11,.13,.14),.9))
    def light(name,loc,power,size):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,-.1,.6))-obj.location).to_track_quat('-Z','Y').to_euler()
    light('Key',(2,-3,4),380,3);light('Fill',(-3,-1,2),180,2.5);light('Rim',(0,3,3),420,2)
    data=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO';data.ortho_scale=2.12
    scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
    for name,loc,frame in [('front',(2,-3,1.75),8),('side',(-3,-.8,1.2),8),('back',(2,3,1.6),8),('drive',(-3,-.8,1.2),23),('release',(-3,-.8,1.2),34)]:
        scene.frame_set(frame);camera.location=loc;camera.rotation_euler=(Vector((-.13,-.2,.64))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)

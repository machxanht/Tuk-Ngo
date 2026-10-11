"""Build shared mesh crew LOD and explicit role animation from the real-reference study.
The accepted hull is appended byte-for-byte by merge-role-crew.mjs, never rebuilt here.
"""
import bpy, bmesh, math, json, sys
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
repo=Path(__file__).resolve().parent.parent
out=repo.parent/'asset-studio/crew-v11';out.mkdir(parents=True,exist_ok=True)
sprint='--sprint' in sys.argv
bpy.ops.wm.open_mainfile(filepath=str(repo/'assets/blender/athlete-rower-study.blend'))
scene=bpy.context.scene
rig=next(o for o in scene.objects if o.type=='ARMATURE')
paddle=scene.objects['Dam_Wood_152cm']
source_meshes=[o for o in scene.objects if o.type=='MESH' and o.parent==rig]
paddle_meshes=list(paddle.children)
poses=[];paddles=[]
for frame in range(1,50):
    scene.frame_set(frame)
    poses.append({b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones})
    paddles.append((paddle.location.copy(),paddle.rotation_quaternion.copy()))
scene.frame_set(1)
rig.animation_data_clear();paddle.animation_data_clear()
# Skin retains the licensed UV map; fingers, face, garments and cap remain modeled.
for obj in source_meshes+paddle_meshes:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    if obj.data.shape_keys:obj.shape_key_clear()
    obj.animation_data_clear()
    for modifier in list(obj.modifiers):
        if modifier.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=modifier.name)
    if 'Anatomy' in obj.name:
        # glTF splits physical vertices at UV/normal seams. Decimating these
        # disconnected islands tears the skin into isolated triangles. Weld
        # physical seams first; Blender keeps distinct UVs on face loops.
        bm=bmesh.new();bm.from_mesh(obj.data)
        # Below the armhole the vest covers the full torso width; above it,
        # retain lateral anatomy so raised shoulders keep a complete contour.
        covered=[f for f in bm.faces if all(.885<v.co.z<1.285 and abs(v.co.x)<(.23 if v.co.z<1.205 else .167) for v in f.verts)]
        bmesh.ops.delete(bm,geom=covered,context='FACES')
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
        bm.to_mesh(obj.data);bm.free();obj.data.update()
    if len(obj.data.polygons)>100:
        mod=obj.modifiers.new('Crew_Silhouette_LOD','DECIMATE')
        mod.ratio=.055 if 'Anatomy' in obj.name else .18
        # Evaluate in rest space, keeping skin weights as ordinary vertex groups.
        arm=next((m for m in obj.modifiers if m.type=='ARMATURE'),None)
        if arm:arm.show_viewport=False
        bpy.ops.object.modifier_apply(modifier=mod.name)
        if arm:arm.show_viewport=True
    obj.select_set(False)
# Consolidate the authored shell into two skin objects per actor. Geometry is
# shared across actors; only forward-cap geometry is a second small variant.
consolidated=[]
join_groups=[[o for o in source_meshes if ('Cap_' in o.name)==flag] for flag in [False,True]]
for cap_group,group in zip([False,True],join_groups):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    bpy.ops.object.join();merged=group[0];merged.name='Cap_Baseball_LOD' if cap_group else 'Athlete_Clothed_Anatomy_LOD'
    consolidated.append(merged)
source_meshes=consolidated
support={a['id']:a for a in json.loads((out/'support-plan.json').read_text())}
source_hip=(rig.matrix_world@rig.pose.bones['pelvis'].head).z
foot_orientation={s:rig.pose.bones['foot_'+s].matrix.to_quaternion().copy() for s in ['l','r']}
root=bpy.data.objects.new('Crew_55_Real_2024_Roles',None);scene.collection.objects.link(root)
root['component']='crew';root['seatedPairs']=8;root['standingPairs']=17
root['roleEvidence']='Thanh Nien Duy Tan 2024 photo11: seated bow caller, raised central controller; standing rowers and helmsmen from real race footage. Counts are authored approximation.'
actors=[]
def actor(id,role,x,side=0,posture='standing'):
    a=bpy.data.objects.new(f'Athlete_{id}_{role}',None);scene.collection.objects.link(a);a.parent=root
    a['component']='athlete';a['id']=id;a['role']=role;a['posture']=posture;a['capOrientation']='forward' if id%3==0 else 'backward'
    plan=support[id]
    a.location=(x,plan['lat'],plan['hip']-source_hip)
    a.rotation_euler.z=math.pi/2 if role!='BOW_CALLER' else -math.pi/2
    if side>0:a.scale.x=-1
    ar=rig.copy();ar.data=rig.data.copy();ar.name=f'{a.name}_Rig';scene.collection.objects.link(ar);ar.parent=a;ar.animation_data_clear()
    for obj in source_meshes:
        m=obj.copy();m.name=f'{a.name}_{obj.name}';scene.collection.objects.link(m);m.parent=ar
        for mod in m.modifiers:
            if mod.type=='ARMATURE':mod.object=ar
        if side>0 and 'Clothed' in obj.name:
            m.data=obj.data.copy();uv=m.data.uv_layers.active.data
            loops=[i for p in m.data.polygons if m.data.materials[p.material_index].name=='Khmer_Back_Print_Only' for i in p.loop_indices]
            if loops:
                center=min(uv[i].uv.x for i in loops)+max(uv[i].uv.x for i in loops)
                for i in loops:uv[i].uv.x=center-uv[i].uv.x
                a['backPrintReadable']=True
        if 'Cap_' in obj.name and a['capOrientation']=='forward':
            # Rotate the modeled crown/seams/visor around the anatomical head.
            m.data=obj.data.copy()
            for v in m.data.vertices:v.co.x=-v.co.x;v.co.y=-.080-v.co.y
        if role=='MID_CONTROLLER' and 'Clothed' in obj.name:
            m.data=obj.data.copy()
            mat=bpy.data.materials.get('Controller_Light_Blue')
            if not mat:
                mat=bpy.data.materials.new('Controller_Light_Blue');mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.12,.55,.78,1)
            for i,slot in enumerate(m.data.materials):
                if slot and slot.name in ['Competition_Green_Fabric','Green_Ribbed_Binding']:m.data.materials[i]=mat
        if role=='BOW_CALLER' and 'Clothed' in obj.name:
            m.data=obj.data.copy()
            mat=bpy.data.materials.get('Caller_Olive')
            if not mat:
                mat=bpy.data.materials.new('Caller_Olive');mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.12,.19,.07,1)
            for i,slot in enumerate(m.data.materials):
                if slot and slot.name in ['Competition_Green_Fabric','Green_Ribbed_Binding']:m.data.materials[i]=mat
    pad=None
    if role in ['ROWER','HELMSMAN']:
        pad=paddle.copy();pad.name=f'Paddle_{id}' if role=='ROWER' else f'Steering_Oar_{id-52}';scene.collection.objects.link(pad);pad.parent=a;pad.animation_data_clear();pad['component']='paddle';pad['role']=role;pad['id']=id
        pad['lengthM']=1.52 if posture=='seated' else 1.75
        pad['length']=pad['lengthM']
        for obj in paddle_meshes:
            m=obj.copy();m.name=pad.name+'_'+obj.name;scene.collection.objects.link(m);m.parent=pad
        if posture=='standing':
            # Extend only the shaft/blade below the lower hand; grip spacing remains .53m.
            length=4.2 if role=='HELMSMAN' else 1.75
            for m in pad.children:
                m.data=m.data.copy()
                for v in m.data.vertices:
                    if v.co.z<-.53:v.co.z=-.53+(v.co.z+.53)*(length-.53)/(1.52-.53)
    actors.append((a,ar,pad,role,posture,side));return a
for row in range(25):
    for side in [-1,1]:actor(2+2*row+(side>0),'ROWER',10-row*20/24,side,'seated' if row<8 else 'standing')
actor(1,'BOW_CALLER',11.7,0,'seated')
actor(52,'MID_CONTROLLER',3.75)
for i in range(3):actor(53+i,'HELMSMAN',-11.2-.95*i,(-1 if i%2 else 1))
def direction(ar,name,child,target):
    b=ar.pose.bones[name];c=ar.pose.bones[child]
    q=(c.head-b.head).normalized().rotation_difference(Vector(target).normalized())
    matrix=b.matrix.copy();matrix=Matrix.LocRotScale(matrix.translation,q@matrix.to_quaternion(),Vector((1,1,1)));b.matrix=matrix
    bpy.context.view_layer.update()
def steer_grips(ar,pad,axis,rower=False):
    # Project the handle into BOTH anatomical reach spheres before solving.
    # Clamping the arm alone leaves its hand floating off an unreachable shaft.
    for iteration in range(16):
        for i,suffix in enumerate(['l','r']):
            upper=ar.pose.bones['upperarm_'+suffix];fore=ar.pose.bones['lowerarm_'+suffix];hand=ar.pose.bones['hand_'+suffix]
            target=pad.location-axis*((0 if rower else .12) if i==0 else .53)-ar.location
            delta=target-upper.head
            reach=(fore.head-upper.head).length+(hand.head-fore.head).length+(ar.pose.bones['middle_01_'+suffix].head-hand.head).length*.90-.002
            if delta.length>reach:pad.location+=upper.head+delta.normalized()*reach-target
    for i,suffix in enumerate(['l','r']):
        target=pad.location-axis*((0 if rower else .12) if i==0 else .53)-ar.location
        upper=ar.pose.bones['upperarm_'+suffix];fore=ar.pose.bones['lowerarm_'+suffix];hand=ar.pose.bones['hand_'+suffix]
        shoulder=upper.head.copy();ul=(fore.head-shoulder).length;fl=(hand.head-fore.head).length
        palm=(ar.pose.bones['middle_01_'+suffix].head-hand.head).length*.90
        delta=target-shoulder;dist=min(delta.length,ul+fl+palm-.001);unit=delta.normalized()
        along=(ul*ul-(fl+palm)**2+dist*dist)/(2*dist);height=math.sqrt(max(0,ul*ul-along*along))
        pole=Vector((1 if shoulder.x>0 else -1,0,-.2));pole=(pole-unit*pole.dot(unit)).normalized()
        elbow=shoulder+unit*along+pole*height
        direction(ar,'upperarm_'+suffix,'lowerarm_'+suffix,elbow-shoulder)
        direction(ar,'lowerarm_'+suffix,'hand_'+suffix,target-elbow)
        direction(ar,'hand_'+suffix,'middle_01_'+suffix,target-ar.pose.bones['hand_'+suffix].head)
def planted_legs(a,ar):
    # Anatomical two-bone solve. Foot targets stay in boat space throughout
    # the stroke, and knees fold forward instead of dropping through the hull.
    for f in support[a['id']]['feet']:
        s=f['bone'];thigh=ar.pose.bones['thigh_'+s];calf=ar.pose.bones['calf_'+s];foot=ar.pose.bones['foot_'+s]
        local_target=Vector(f['target']);local_target.z-=a.location.z
        target=ar.matrix_local.inverted()@local_target
        origin=thigh.head.copy();u=(calf.head-origin).length;v=(foot.head-calf.head).length
        delta=target-origin;d=min(delta.length,u+v-.002);axis=delta.normalized()
        along=(u*u-v*v+d*d)/(2*d);height=math.sqrt(max(0,u*u-along*along))
        pole=Vector((0,-1,.25));pole=(pole-axis*pole.dot(axis)).normalized()
        knee=origin+axis*along+pole*height
        direction(ar,'thigh_'+s,'calf_'+s,knee-origin)
        direction(ar,'calf_'+s,'foot_'+s,target-knee)
        foot.matrix=Matrix.LocRotScale(foot.head,foot_orientation[s],Vector((1,1,1)))
        bpy.context.view_layer.update()
for frame in range(1,50):
    scene.frame_set(frame);t=(frame-1)/48
    pair_pose={}
    for a,ar,pad,role,posture,side in actors:
        if role=='ROWER' and a['id']%2 and a['id']-1 in pair_pose:
            # A port/starboard pair uses the same local rig solve, reflected
            # by the actor transform. Avoid evaluating identical IK twice.
            cached,pad_position,pad_rotation=pair_pose[a['id']-1]
            for b in ar.pose.bones:
                p,q,s=cached[b.name];b.location=p;b.rotation_mode='QUATERNION';b.rotation_quaternion=q;b.scale=s
                b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
            pad.location=pad_position;pad.rotation_mode='QUATERNION';pad.rotation_quaternion=pad_rotation
            pad.keyframe_insert('location',frame=frame);pad.keyframe_insert('rotation_quaternion',frame=frame)
            continue
        for b in ar.pose.bones:
            p,q,s=poses[frame-1][b.name];b.location=p;b.rotation_mode='QUATERNION';b.rotation_quaternion=q;b.scale=s
        if posture=='standing':
            for suffix in ['l','r']:
                for name in ['thigh_','calf_','foot_']:ar.pose.bones[name+suffix].rotation_quaternion=Quaternion()
                ar.pose.bones['thigh_'+suffix].rotation_quaternion=Quaternion(Vector((1,0,0)),.08 if role=='MID_CONTROLLER' else .65)
                ar.pose.bones['calf_'+suffix].rotation_quaternion=Quaternion(Vector((1,0,0)),-.12 if role=='MID_CONTROLLER' else -.95)
        bpy.context.view_layer.update()
        if role=='ROWER':
            pad.location,pad.rotation_quaternion=paddles[frame-1];pad.rotation_mode='QUATERNION'
            if posture=='standing':
                # A visibly deeper standing drive, with bent knees instead of the seated squat.
                ar.pose.bones['spine_01'].rotation_quaternion=Quaternion(Vector((1,0,0)),.075*math.sin(t*2*math.pi))@ar.pose.bones['spine_01'].rotation_quaternion
            if sprint:
                ar.pose.bones['spine_01'].rotation_quaternion=Quaternion(Vector((1,0,0)),.08*math.sin(t*2*math.pi))@ar.pose.bones['spine_01'].rotation_quaternion
                pad.location.y+=.065*math.sin(t*2*math.pi)
                pad.location.z-=.025*max(0,math.sin(t*2*math.pi))
            if posture=='standing' or sprint:
                bpy.context.view_layer.update()
                steer_grips(ar,pad,pad.rotation_quaternion@Vector((0,0,1)),rower=True)
        else:
            # Role behaviors are independent of the rowing cycle.
            for name in ['spine_01','spine_02','spine_03','neck','head','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r']:
                if name in ar.pose.bones:ar.pose.bones[name].rotation_quaternion=Quaternion()
            if role=='BOW_CALLER':
                direction(ar,'upperarm_l','lowerarm_l',(-.35,-.45,.7+.1*math.sin(t*2*math.pi)))
                direction(ar,'lowerarm_l','hand_l',(.1,-.15,.95))
                direction(ar,'upperarm_r','lowerarm_r',(.1,-.3,-.8));direction(ar,'lowerarm_r','hand_r',(0,-.8,-.2))
            elif role=='MID_CONTROLLER':
                direction(ar,'upperarm_l','lowerarm_l',(-.3,-.2,.85));direction(ar,'lowerarm_l','hand_l',(.0,-.1,1))
                direction(ar,'upperarm_r','lowerarm_r',(.25,-.65,.45+.1*math.cos(t*2*math.pi)));direction(ar,'lowerarm_r','hand_r',(0,-.8,.5))
            else:
                # Long sweep oars stay aft and in the water while steering slowly side-to-side.
                direction(ar,'upperarm_l','lowerarm_l',(-.35,-.15,-.8));direction(ar,'lowerarm_l','hand_l',(.3,-.95,-.15))
                direction(ar,'upperarm_r','lowerarm_r',(.35,-.1,-.8));direction(ar,'lowerarm_r','hand_r',(-.3,-.95,-.15))
                pad.location=(0,-.43,.67);pad.rotation_mode='QUATERNION'
                axis=Vector((side*(.20+.055*math.sin(t*2*math.pi)),.83,.56)).normalized()
                pad.rotation_quaternion=Vector((0,0,1)).rotation_difference(axis)
                steer_grips(ar,pad,axis)
                pad['lengthM']=4.2
                pad['length']=4.2
        planted_legs(a,ar)
        if role=='ROWER':pair_pose[a['id']]=({b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in ar.pose.bones},pad.location.copy(),pad.rotation_quaternion.copy())
        for b in ar.pose.bones:b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
        if pad:pad.keyframe_insert('location',frame=frame);pad.keyframe_insert('rotation_quaternion',frame=frame)
lod_triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in source_meshes)
for obj in [rig,paddle,*source_meshes,*paddle_meshes]:bpy.data.objects.remove(obj,do_unlink=True)
scene.frame_start=1;scene.frame_end=49;scene.render.fps=64
scene.frame_set(8)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out/('crew-only-sprint.glb' if sprint else 'crew-only.glb')),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True,export_apply=False)
if not sprint:
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(repo/'assets/blender/crew-v11.blend'))
report={'crew':55,'seatedPairs':8,'standingPairs':17,'roles':{'ROWER':50,'BOW_CALLER':1,'MID_CONTROLLER':1,'HELMSMAN':3},'capForward':sum(a['capOrientation']=='forward' for a,*_ in actors),'capBackward':sum(a['capOrientation']=='backward' for a,*_ in actors),'sourceTrianglesPerActor':lod_triangles,'limits':['Authored approximate postures and cycle; not mocap','8 seated pairs are user-selected approximation','Helmsman hand contact and collision require visual QA']}
(out/('role-report-sprint.json' if sprint else 'role-report.json')).write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report),flush=True)

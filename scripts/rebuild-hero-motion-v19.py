"""One seated-rower motion helper. No geometry/material mutation.
Blender --background --python this_file patches the original study externally.
Root may import apply_motion_v19(rig,paddle,scene) after creating garments.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion

def apply_motion_v19(rig,paddle,scene,bone_aliases=None,foot_targets=None):
    pb=rig.pose.bones
    if bone_aliases:
        raise ValueError('Alternate rigs require bone-roll/palm calibration; aliases alone are not safe retargeting. Use this helper on the study rig until calibrated.')
    rig.animation_data_clear();paddle.animation_data_clear()
    for b in pb:b.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    def pos(n):return rig.matrix_world@pb[n].head
    def quat(n):return (rig.matrix_world@pb[n].matrix).to_quaternion()
    def setq(n,q):
        b=pb[n];m=Matrix.LocRotScale(pos(n),q,Vector((1,1,1)));b.matrix=rig.matrix_world.inverted()@m;bpy.context.view_layer.update()
    def direction(n,c,d):setq(n,(pos(c)-pos(n)).normalized().rotation_difference(Vector(d).normalized())@quat(n))
    def frameq(x,y):
        y=y.normalized();x=(x-y*x.dot(y)).normalized();return Matrix((x,y,x.cross(y).normalized())).transposed().to_quaternion()
    neutral_head=quat('head');neutral_neck=quat('neck_01')
    feet={s:quat('foot_'+s) for s in ['l','r']}
    for s,sign in [('l',1),('r',-1)]:
        direction('thigh_'+s,'calf_'+s,(sign*.07,-.94,-.27));direction('calf_'+s,'foot_'+s,(0,-.02,-1));setq('foot_'+s,feet[s])
    foot_solve={'maxTargetGapM':0,'maxReachExcessM':0,'boneSideX':{s:pos('thigh_'+s).x for s in ['l','r']}}
    if foot_targets:
        for s in ['l','r']:
            target=Vector(foot_targets[s]);origin=pos('thigh_'+s);u=(pos('calf_'+s)-origin).length;v=(pos('foot_'+s)-pos('calf_'+s)).length;delta=target-origin;distance=delta.length;d=max(.0001,min(distance,u+v-.00001));unit=delta.normalized();along=(u*u-v*v+d*d)/(2*d);height=math.sqrt(max(0,u*u-along*along))
            # Knee points toward the bow (-Y), with slight anatomical side bias.
            pole=Vector((.12 if s=='l' else -.12,-1,.15));pole=(pole-unit*pole.dot(unit)).normalized();knee=origin+unit*along+pole*height
            direction('thigh_'+s,'calf_'+s,knee-origin);direction('calf_'+s,'foot_'+s,target-pos('calf_'+s));setq('foot_'+s,feet[s])
            foot_solve['maxTargetGapM']=max(foot_solve['maxTargetGapM'],(pos('foot_'+s)-target).length);foot_solve['maxReachExcessM']=max(foot_solve['maxReachExcessM'],distance-u-v)
    arms=[]
    for s,sign in [('l',1),('r',-1)]:
        u,l,h='upperarm_'+s,'lowerarm_'+s,'hand_'+s
        upper=(pos(l)-pos(u)).normalized();fore=(pos(h)-pos(l)).normalized();hinge=upper.cross(fore).normalized()
        hd=(pos('middle_01_'+s)-pos(h)).normalized();across=(pos('index_01_'+s)-pos('pinky_01_'+s)).normalized()
        arms.append(dict(s=s,sign=sign,u=u,l=l,h=h,ul=(pos(l)-pos(u)).length,fl=(pos(h)-pos(l)).length,pl=(pos('middle_01_'+s)-pos(h)).length*.9,uf=frameq(hinge,upper).inverted()@quat(u),lf=frameq(hinge,fore).inverted()@quat(l),hf=frameq(across,hd).inverted()@quat(h)))
    presets={b.name:b.matrix_basis.copy() for b in pb};targets={s:pos('foot_'+s).copy() for s in ['l','r']}
    keys=[0,.13,.32,.53,.60,.86,1]
    def curve(values,t):
        for i,(a,b) in enumerate(zip(keys,keys[1:])):
            if a<=t<=b:q=(t-a)/(b-a);q=q*q*(3-2*q);return values[i]*(1-q)+values[i+1]*q
        return values[-1]
    report={'frames':49,'maxPalmGapM':0,'maxFootDriftM':0,'elbowFlexDegrees':[180,0],'maxReachExcessM':0,'headWorldDriftRadians':0,'footSolve':foot_solve,'footTargets':foot_targets,'footPositions':{},'headWorldBounds':{'min':[float('inf')]*3,'max':[-float('inf')]*3},'pelvisWorldBounds':{'min':[float('inf')]*3,'max':[-float('inf')]*3},'limits':['Authored seated rhythm from real2024 footage; not mocap','Foot stationarity is not a hull collision check','Garment morphs need regeneration for the changed pose']}
    scene.frame_start=1;scene.frame_end=49;scene.render.fps=64
    for frame in range(1,50):
        scene.frame_set(frame);t=(frame-1)/48
        for b in pb:b.matrix_basis=presets[b.name]
        bpy.context.view_layer.update()
        lean=math.radians(curve([28,27,17,3,7,25,28],t))
        for n,factor in [('spine_01',.7),('spine_03',.3)]:setq(n,Quaternion(Vector((1,0,0)),lean*factor)@quat(n))
        # Neutral forward gaze follows neither torso tuck nor an angry nod.
        setq('neck_01',neutral_neck);setq('head',neutral_head)
        angle=math.radians(curve([23,9,-8,-33,-25,33,23],t));dx=.33
        axis=Vector((dx,math.sin(angle)*math.sqrt(1-dx*dx),math.cos(angle)*math.sqrt(1-dx*dx)))
        top=Vector((-.1584,-curve([.44,.44,.40,.32,.38,.48,.44],t),curve([1.18,1.15,1.11,1.04,1.24,1.25,1.18],t)))
        for _ in range(24):
            for i,a in enumerate(arms):
                center=pos(a['u'])+(axis*.53 if i else Vector());reach=a['fl']+a['pl'];u=a['ul'];low=math.sqrt(u*u+reach*reach-2*u*reach*math.cos(math.radians(55)));high=math.sqrt(u*u+reach*reach-2*u*reach*math.cos(math.radians(145)));delta=top-center;d=delta.length
                if d<low:top=center+delta.normalized()*low
                elif d>high:top=center+delta.normalized()*high
        width=(Vector((1,0,0))-axis*axis.x).normalized();thickness=width.cross(axis).normalized();paddle.location=top;paddle.rotation_mode='QUATERNION';paddle.rotation_quaternion=Matrix((thickness,width,axis)).transposed().to_quaternion()
        for i,a in enumerate(arms):
            grip=top-axis*(.53 if i else 0);origin=pos(a['u']);delta=grip-origin;distance=delta.length;reach=a['fl']+a['pl'];d=min(distance,a['ul']+reach-.0001);unit=delta.normalized();along=(a['ul']**2-reach**2+d*d)/(2*d);height=math.sqrt(max(0,a['ul']**2-along**2))
            pole=Vector((a['sign'],-.20,-.15));pole=(pole-unit*pole.dot(unit)).normalized();elbow=origin+unit*along+pole*height;end=elbow+(origin+unit*d-elbow).normalized()*a['fl'];upper=(elbow-origin).normalized();fore=(end-elbow).normalized();hinge=upper.cross(fore).normalized()
            setq(a['u'],frameq(hinge,upper)@a['uf']);setq(a['l'],frameq(hinge,fore)@a['lf']);setq(a['h'],frameq(hinge,(grip-end).normalized())@a['hf'])
            # Fingers wrap around actual cross grip/shaft; geometry stays intact.
            bar=width if i==0 else axis
            for finger in ['index','middle','ring','pinky','thumb']:
                first=f'{finger}_01_{a["s"]}';base=pos(first);center=grip+bar*(base-grip).dot(bar);radial=(base-center).normalized();wrap=-1 if finger=='thumb' else 1
                for k,deg in zip([1,2,3],[65,135,205]):
                    n=f'{finger}_0{k}_{a["s"]}';target=center+Quaternion(bar,math.radians(deg*wrap))@radial*.017;source=(rig.matrix_world@pb[n].tail)-pos(n);desired=target-pos(n)
                    if source.length>.0001 and desired.length>.0001:setq(n,source.normalized().rotation_difference(desired.normalized())@quat(n))
            gap=(pos(a['h']).lerp(pos('middle_01_'+a['s']),.9)-grip).length;report['maxPalmGapM']=max(report['maxPalmGapM'],gap);report['maxReachExcessM']=max(report['maxReachExcessM'],distance-a['ul']-reach)
            flex=math.degrees(math.acos(max(-1,min(1,(-upper).dot(fore)))));report['elbowFlexDegrees'][0]=min(report['elbowFlexDegrees'][0],flex);report['elbowFlexDegrees'][1]=max(report['elbowFlexDegrees'][1],flex)
        for s in ['l','r']:
            point=pos('foot_'+s);report['maxFootDriftM']=max(report['maxFootDriftM'],(point-targets[s]).length);report['footPositions'][s]=list(point)
            if foot_targets:report['footSolve']['maxTargetGapM']=max(report['footSolve']['maxTargetGapM'],(point-Vector(foot_targets[s])).length)
        for key,point in [('headWorldBounds',pos('head')),('pelvisWorldBounds',rig.matrix_world@pb['thigh_l'].head.lerp(pb['thigh_r'].head,.5))]:
            for k in range(3):report[key]['min'][k]=min(report[key]['min'][k],point[k]);report[key]['max'][k]=max(report[key]['max'][k],point[k])
        report['headWorldDriftRadians']=max(report['headWorldDriftRadians'],quat('head').rotation_difference(neutral_head).angle)
        for b in pb:b.rotation_mode='QUATERNION';b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
        paddle.keyframe_insert('location',frame=frame);paddle.keyframe_insert('rotation_quaternion',frame=frame)
    for o in [rig,paddle]:
        if o.animation_data and o.animation_data.action:o.animation_data.action.name='Seated_Rowing_V19_80SPM'
    return report

if __name__=='__main__':
    repo=Path(__file__).resolve().parent.parent;out=repo.parent/'asset-studio/coherent-v19/motion';out.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(repo/'assets/blender/athlete-rower-study.blend'))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');paddle=bpy.data.objects.get('Dam_Wood_152cm');report=apply_motion_v19(rig,paddle,bpy.context.scene)
    (out/'motion-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(out/'athlete-motion-v19.blend'))
    bpy.context.scene.frame_set(1);bpy.ops.export_scene.gltf(filepath=str(out/'athlete-motion-v19.glb'),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True)
    scene=bpy.context.scene
    if not scene.camera:
        data=bpy.data.cameras.new('MotionReview');cam=bpy.data.objects.new('MotionReview',data);scene.collection.objects.link(cam);scene.camera=cam
    cam=scene.camera;cam.location=(3,-4,2.2);cam.rotation_euler=(Vector((0,-.25,.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.8
    scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    if not any(o.type=='LIGHT' for o in scene.objects):
        d=bpy.data.lights.new('MotionReview','AREA');d.energy=700;d.size=4;o=bpy.data.objects.new('MotionReview',d);scene.collection.objects.link(o);o.location=(1,-3,4)
    for f in [1,13,25,37]:scene.frame_set(f);scene.render.filepath=str(out/f'phase-{(f-1)/48:.2f}.png');bpy.ops.render.render(write_still=True)

"""Deterministic MakeHuman rowing bake; local +Z up, bow -Y.

build_motion authors 97 samples / second with ordinary pose keys only. Actor
transforms must have positive uniform scale. Coordinates are actor-local metres;
place the actor origin on the boat floor before calling. No export or mesh edits.
"""
import math
import bpy
from mathutils import Vector, Matrix, Quaternion


def build_motion(rig, paddle, scene, posture='seated', side=-1, role='rower'):
    if posture not in ('seated', 'standing') or side not in (-1, 1):
        raise ValueError('posture seated/standing; side -1/+1')
    if role not in ('rower','caller','controller','helm'):
        raise ValueError('Unknown crew role')
    if min(rig.scale) <= 0 or max(rig.scale)-min(rig.scale) > 1e-5:
        raise ValueError('Use positive uniform actor scale; mirror targets, never the mesh.')
    pb = rig.pose.bones
    rig.animation_data_clear()
    paddle.animation_data_clear()
    for b in pb:
        b.matrix_basis = Matrix.Identity(4)
        b.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()

    def pos(n):
        return pb[n].head.copy()

    def quat(n):
        return pb[n].matrix.to_quaternion()

    def setq(n, q):
        pb[n].matrix = Matrix.LocRotScale(pos(n), q, Vector((1, 1, 1)))
        bpy.context.view_layer.update()

    def direction(n, child, target):
        setq(n, (pos(child)-pos(n)).normalized().rotation_difference(target.normalized()) @ quat(n))

    def frameq(x, y):
        y = y.normalized()
        x = (x-y*x.dot(y)).normalized()
        return Matrix((x, y, x.cross(y).normalized())).transposed().to_quaternion()

    neutral = {n: quat(n) for n in ('head', 'neck_01', 'foot_l', 'foot_r')}
    arms = {}
    for s, sign in (('l', 1), ('r', -1)):
        u, f, h = 'upperarm_'+s, 'lowerarm_'+s, 'hand_'+s
        ud, fd = (pos(f)-pos(u)).normalized(), (pos(h)-pos(f)).normalized()
        hinge = ud.cross(fd).normalized()
        hd = (pos('middle_01_'+s)-pos(h)).normalized()
        across = (pos('index_01_'+s)-pos('pinky_01_'+s)).normalized()
        arms[s] = dict(u=u, f=f, h=h, sign=sign,
                       ul=(pos(f)-pos(u)).length, fl=(pos(h)-pos(f)).length,
                       pl=(pos('middle_01_'+s)-pos(h)).length*.9,
                       uf=frameq(hinge, ud).inverted() @ quat(u),
                       ff=frameq(hinge, fd).inverted() @ quat(f),
                       hf=frameq(across, hd).inverted() @ quat(h))
    # Translate the common anatomical root in pose space, preserving bind data.
    root = next(b for b in pb if b.parent is None)
    pelvis = (pos('thigh_l')+pos('thigh_r'))*.5
    pelvis_height = .55 if posture == 'seated' else .90
    rm = root.matrix.copy()
    rm.translation.z += pelvis_height-pelvis.z
    root.matrix = rm
    bpy.context.view_layer.update()
    base = {b.name: b.matrix_basis.copy() for b in pb}
    foot_targets = {s: Vector((pos('thigh_'+s).x, -.30 if posture == 'seated' else -.06, .075)) for s in ('l', 'r')}
    leg_lengths = {s: ((pos('calf_'+s)-pos('thigh_'+s)).length,
                       (pos('foot_'+s)-pos('calf_'+s)).length) for s in ('l', 'r')}
    report = dict(samples=97, durationSeconds=1, posture=posture, side=side, role=role,
                  maxPalmGapM=0., maxFootDriftM=0., maxLegReachExcessM=0.,
                  maxArmReachExcessM=0., maxGripCorrectionM=0.,
                  pelvisHeightM=pelvis_height, ankleHeightM=.075, minBladeTipZDuringDriveM=100.,
                  maxBladeTipZDuringDriveM=-100., minLongBladeTipZDuringDriveM=100.,
                  maxLongBladeTipZDuringDriveM=-100.,
                  recoveryBladeTipSamples=[], minRecoveryBladeTipZM=100.,
                  helmBladeTipSamples=[], helmGripSamples=[],
                  elbowIncludedAngleDegrees=[180., 0.], footTargets={s:list(v) for s,v in foot_targets.items()})
    knots = [0., .12, .43, .57, .72, .90, 1.]

    def curve(values, t, keyframes=knots):
        for i in range(len(keyframes)-1):
            if keyframes[i] <= t <= keyframes[i+1]:
                q = (t-keyframes[i])/(keyframes[i+1]-keyframes[i])
                q = q*q*(3-2*q)
                return values[i]*(1-q)+values[i+1]*q
        return values[-1]

    scene.frame_start, scene.frame_end, scene.render.fps = 1, 97, 96
    for frame in range(1, 98):
        scene.frame_set(frame)
        t = (frame-1)/96
        for b in pb:
            b.matrix_basis = base[b.name]
        bpy.context.view_layer.update()
        lean = math.radians(curve([25, 24, 3, 1, 11, 23, 25], t))
        if role != 'rower':
            lean = math.radians(5+2*math.sin(t*2*math.pi))
        for n, factor in (('spine_01', .65), ('spine_03', .35)):
            setq(n, Quaternion((1, 0, 0), lean*factor) @ quat(n))
        for n in ('neck_01', 'head'):
            setq(n, neutral[n])
        # Explicit two-link legs: knee bends forward, planted ankle never slides.
        for s in ('l', 'r'):
            origin, target = pos('thigh_'+s), foot_targets[s]
            u, v = leg_lengths[s]
            delta = target-origin
            distance = delta.length
            d = max(abs(u-v)+1e-5, min(distance, u+v-1e-5))
            unit = delta.normalized()
            a = (u*u-v*v+d*d)/(2*d)
            pole = Vector((.08 if s == 'l' else -.08, -1, 0))
            pole = (pole-unit*pole.dot(unit)).normalized()
            knee = origin+unit*a+pole*math.sqrt(max(0, u*u-a*a))
            direction('thigh_'+s, 'calf_'+s, knee-origin)
            direction('calf_'+s, 'foot_'+s, target-pos('calf_'+s))
            setq('foot_'+s, neutral['foot_'+s])
            report['maxLegReachExcessM'] = max(report['maxLegReachExcessM'], distance-u-v)
            report['maxFootDriftM'] = max(report['maxFootDriftM'], (pos('foot_'+s)-target).length)
        angle = math.radians(curve([27,12,-29,-35,52,58,50,27],t,
                                  [0.,.12,.43,.57,.68,.72,.90,1.]))
        if role == 'helm':
            angle = math.radians(8*math.sin(t*2*math.pi))
        axis = Vector((-side*.33, math.sin(angle)*.944, math.cos(angle)*.944)).normalized()
        if role == 'helm':
            # Bow is -Y. Shaft points up/forward; blade extends aft/down.
            axis = Quaternion((0,0,1),math.radians(8)*math.sin(t*2*math.pi)) @ Vector((-side*.18,-.83,.54)).normalized()
        top = Vector((-side*.10, -curve([.43,.46,.22,.20,.28,.40,.43],t),
                      pelvis_height+curve([.67,.64,.54,.63,.78,.74,.67],t)-(.14 if posture == 'standing' else 0)))
        desired = top.copy()
        if role == 'helm':
            top = Vector((-side*.16, -.22, pelvis_height+.52))
            desired = top.copy()
        upper_side = 'l' if side == -1 else 'r'
        ordered = [arms[upper_side], arms['r' if upper_side == 'l' else 'l']]
        # Alternating projection keeps both grip targets inside elbow limits.
        for _ in range(48):
            for i, arm in enumerate(ordered):
                center = pos(arm['u'])+axis*(.53 if i else 0)
                u, v = arm['ul'], arm['fl']+arm['pl']
                lo = math.sqrt(u*u+v*v-2*u*v*math.cos(math.radians(55)))
                hi = math.sqrt(u*u+v*v-2*u*v*math.cos(math.radians(145)))
                delta = top-center
                top = center+delta.normalized()*min(hi,max(lo,delta.length))
        report['maxGripCorrectionM'] = max(report['maxGripCorrectionM'], (top-desired).length)
        if t <= .43:
            report['minBladeTipZDuringDriveM'] = min(report['minBladeTipZDuringDriveM'],(top-axis*1.52).z)
            report['maxBladeTipZDuringDriveM'] = max(report['maxBladeTipZDuringDriveM'],(top-axis*1.52).z)
            report['minLongBladeTipZDuringDriveM'] = min(report['minLongBladeTipZDuringDriveM'],(top-axis*1.75).z)
            report['maxLongBladeTipZDuringDriveM'] = max(report['maxLongBladeTipZDuringDriveM'],(top-axis*1.75).z)
        if .68 <= t <= .90:
            tip_z = (top-axis*(1.75 if posture == 'standing' else 1.52)).z
            report['recoveryBladeTipSamples'].append({'phase':t,'tipZM':tip_z})
            report['minRecoveryBladeTipZM'] = min(report['minRecoveryBladeTipZM'],tip_z)
        if role == 'helm':
            report['helmBladeTipSamples'].append({'phase':t,'tipZM':(top-axis*4.2).z})
            report['helmGripSamples'].append({'phase':t,'upper':list(top),'lower':list(top-axis*.53)})
        width = (Vector((1,0,0))-axis*axis.x).normalized()
        thickness = width.cross(axis).normalized()
        paddle.matrix_world = rig.matrix_world @ Matrix.LocRotScale(top, Matrix((thickness,width,axis)).transposed().to_quaternion(), Vector((1,1,1)))
        paddle.rotation_mode = 'QUATERNION'
        for i, arm in enumerate(ordered):
            grip = top-axis*(.53 if i else 0)
            if role in ('caller','controller'):
                # Caller projects voice with one hand near the mouth; controller
                # raises a conducting hand on the beat and rests the other hand.
                if i == 0:
                    lift = .07 if role == 'caller' else .15*(.5+.5*math.cos(t*2*math.pi))
                    grip = pos(arm['u'])+Vector((arm['sign']*.06,-.22,lift))
                else:
                    grip = Vector((arm['sign']*.15,-.22,pelvis_height+.05))
            origin = pos(arm['u'])
            delta = grip-origin
            distance = delta.length
            u, v = arm['ul'], arm['fl']+arm['pl']
            if role in ('caller','controller'):
                lo = math.sqrt(u*u+v*v-2*u*v*math.cos(math.radians(55)))
                hi = math.sqrt(u*u+v*v-2*u*v*math.cos(math.radians(145)))
                grip = origin+delta.normalized()*min(hi,max(lo,distance))
                delta = grip-origin
                distance = delta.length
            d = min(distance,u+v-1e-5)
            unit = delta.normalized()
            a = (u*u-v*v+d*d)/(2*d)
            pole = Vector((arm['sign'], -.2, -.15))
            pole = (pole-unit*pole.dot(unit)).normalized()
            elbow = origin+unit*a+pole*math.sqrt(max(0,u*u-a*a))
            end = elbow+(origin+unit*d-elbow).normalized()*arm['fl']
            ud, fd = (elbow-origin).normalized(), (end-elbow).normalized()
            hinge = ud.cross(fd).normalized()
            setq(arm['u'],frameq(hinge,ud) @ arm['uf'])
            setq(arm['f'],frameq(hinge,fd) @ arm['ff'])
            setq(arm['h'],frameq(hinge,(grip-end).normalized()) @ arm['hf'])
            s = arm['h'][-1]
            # Wrap fingers around the actual cross handle or shaft.
            bar = width if i == 0 else axis
            for finger in (('index','middle','ring','pinky','thumb') if role in ('rower','helm') else ()):
                first = finger+'_01_'+s
                base_finger = pos(first)
                center = grip+bar*(base_finger-grip).dot(bar)
                radial = (base_finger-center).normalized()
                wrap = -1 if finger == 'thumb' else 1
                for k, deg in ((1,65),(2,135),(3,205)):
                    n = finger+'_0'+str(k)+'_'+s
                    target = center+Quaternion(bar,math.radians(deg*wrap)) @ radial*.017
                    source = pb[n].tail-pos(n)
                    desired_finger = target-pos(n)
                    if source.length > .0001 and desired_finger.length > .0001:
                        setq(n,source.normalized().rotation_difference(desired_finger.normalized()) @ quat(n))
            palm = pos(arm['h']).lerp(pos('middle_01_'+s),.9)
            report['maxPalmGapM'] = max(report['maxPalmGapM'],(palm-grip).length)
            report['maxArmReachExcessM'] = max(report['maxArmReachExcessM'],distance-u-v)
            angle_deg = math.degrees(math.acos(max(-1,min(1,(-ud).dot(fd)))))
            report['elbowIncludedAngleDegrees'][0] = min(report['elbowIncludedAngleDegrees'][0],angle_deg)
            report['elbowIncludedAngleDegrees'][1] = max(report['elbowIncludedAngleDegrees'][1],angle_deg)
        for b in pb:
            b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
            b.keyframe_insert('location',frame=frame,group=b.name)
        for prop in ('location','rotation_quaternion','scale'):
            paddle.keyframe_insert(prop,frame=frame)
    rig.animation_data.action.name = 'Hybrid_V25_'+role+'_'+posture+('_port' if side == -1 else '_starboard')
    paddle.animation_data.action.name = rig.animation_data.action.name+'_paddle'
    if role in ('caller','controller'):
        report['paddleRequired'] = False
        for field in ('minBladeTipZDuringDriveM','maxBladeTipZDuringDriveM',
                      'minLongBladeTipZDuringDriveM','maxLongBladeTipZDuringDriveM'):
            report[field] = None
    else:
        report['paddleRequired'] = True
    if role == 'helm':
        report['helmOarLengthM'] = 4.2
        report['minHelmBladeTipZM'] = min(sample['tipZM'] for sample in report['helmBladeTipSamples'])
        report['maxHelmBladeTipZM'] = max(sample['tipZM'] for sample in report['helmBladeTipSamples'])
    if role == 'rower':
        for phase in (.68,.90):
            f = 1+phase*96
            scene.frame_set(int(f),subframe=f-int(f))
            bpy.context.view_layer.update()
            tip = rig.matrix_world.inverted() @ paddle.matrix_world @ Vector((0,0,-(1.75 if posture == 'standing' else 1.52)))
            report['recoveryBladeTipSamples'].append({'phase':phase,'tipZM':tip.z})
            report['minRecoveryBladeTipZM'] = min(report['minRecoveryBladeTipZM'],tip.z)
        report['recoveryBladeTipSamples'].sort(key=lambda sample:sample['phase'])
    scene.frame_set(1)
    return report

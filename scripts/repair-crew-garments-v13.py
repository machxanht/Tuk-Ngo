"""Diagnose/preview garment-only changes. All outputs stay outside accepted assets."""
import bpy,bmesh,json,sys,math,argparse,hashlib,struct
from pathlib import Path
from mathutils import Vector
repo=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--diagnose-only',action='store_true');parser.add_argument('--render-existing',action='store_true');parser.add_argument('--render',action='store_true');parser.add_argument('--actor-kind',choices=['standing','seated','caller','controller'],default='standing');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
out=repo.parent/'asset-studio/crew-v13-garment';out.mkdir(parents=True,exist_ok=True)
if args.render_existing:args.diagnose_only=True;args.render=True
bpy.ops.wm.open_mainfile(filepath=str(out/'crew-garment-preview.blend' if args.render_existing else repo/'assets/blender/crew-v12.blend'))
scene=bpy.context.scene
wanted_role='BOW_CALLER' if args.actor_kind=='caller' else 'MID_CONTROLLER' if args.actor_kind=='controller' else 'ROWER'
actor=next(o for o in scene.objects if o.get('role')==wanted_role and (wanted_role!='ROWER' or o.get('posture')==args.actor_kind))
body=next(o for o in scene.objects if o.type=='MESH' and o.name.startswith(actor.name) and 'Clothed' in o.name)
def stats(obj):
    results={}
    for mi,material in enumerate(obj.data.materials):
        if not any(x in material.name for x in ['Fabric','Binding','Shorts','Caller_Olive','Controller_Light_Blue']):continue
        faces=[p for p in obj.data.polygons if p.material_index==mi];edges={};verts=set()
        for p in faces:
            verts.update(p.vertices)
            for a,b in p.edge_keys:edges[(min(a,b),max(a,b))]=edges.get((min(a,b),max(a,b)),0)+1
        border=[e for e,n in edges.items() if n==1];graph={}
        for a,b in border:graph.setdefault(a,set()).add(b);graph.setdefault(b,set()).add(a)
        seen=set();components=[]
        for v in graph:
            if v in seen:continue
            todo=[v];ids=[]
            while todo:
                n=todo.pop()
                if n in seen:continue
                seen.add(n);ids.append(n);todo.extend(graph[n]-seen)
            points=[obj.data.vertices[i].co for i in ids];components.append({'vertices':len(ids),'zMin':min(v.z for v in points),'zMax':max(v.z for v in points),'branches':sum(len(graph[i])!=2 for i in ids)})
        results[material.name]={'vertices':len(verts),'polygons':len(faces),'boundaryEdges':len(border),'loops':components}
    return results
report={'meshAttributes':[(a.name,a.domain,a.data_type) for a in body.data.attributes], 'actor':actor.name,'crewLOD':stats(body),'canonical':{}}
with bpy.data.libraries.load(str(repo/'assets/blender/athlete-rower-study.blend'),link=False) as (source,target):
    target.objects=[name for name in source.objects if name.startswith(('Competition_Tank','Competition_Shorts','Tank_Top_','Shorts_Continuous'))]
canonical=[o for o in target.objects if o]
for o in canonical:
    if o.type=='MESH':report['canonical'][o.name]=stats(o)
if not args.render_existing:(out/'diagnosis.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('DIAGNOSIS',json.dumps({'actor':actor.name,'materials':list(report['crewLOD'])}),flush=True)
def is_garment(mat):return any(x in mat.name for x in ['Competition_Green_Fabric','Green_Ribbed_Binding','Caller_Olive','Controller_Light_Blue'])
def anatomy_digest(obj):
    data=obj.data;keep=[p for p in data.polygons if not is_garment(data.materials[p.material_index])]
    ids=sorted({i for p in keep for i in p.vertices});h=hashlib.sha256()
    for i in ids:
        v=data.vertices[i];h.update(struct.pack('<I3f',i,*v.co))
        for e in v.groups:h.update(struct.pack('<If',e.group,e.weight))
    for p in keep:
        h.update(struct.pack('<I',p.material_index))
        for li in p.loop_indices:
            h.update(struct.pack('<I',data.loops[li].vertex_index))
            for layer in data.uv_layers:h.update(struct.pack('<2f',*layer.data[li].uv))
    return h.hexdigest()
def motion_digest():
    h=hashlib.sha256();rigs=sorted((o for o in scene.objects if o.type=='ARMATURE'),key=lambda o:o.name)
    paddles=sorted((o for o in scene.objects if o.name.startswith('Dam_') and o.type=='EMPTY'),key=lambda o:o.name)
    for frame in [1,9,17,25,33,41,49]:
        scene.frame_set(frame);bpy.context.view_layer.update()
        for ar in rigs:
            for bone in ar.pose.bones:
                h.update(struct.pack('<16f',*(v for row in (ar.matrix_world@bone.matrix) for v in row)))
        for o in paddles:h.update(struct.pack('<16f',*(v for row in o.matrix_world for v in row)))
    return h.hexdigest()
if not args.diagnose_only:
    before_motion=motion_digest()
    crew_meshes=[o for o in scene.objects if o.type=='MESH' and 'Clothed_Anatomy' in o.name]
    before_anatomy={o.name:anatomy_digest(o) for o in crew_meshes}
    before_normals={o.name:[o.data.corner_normals[li].vector.copy() for p in o.data.polygons if not is_garment(o.data.materials[p.material_index]) for li in p.loop_indices] for o in crew_meshes}
    replacements={}
    for obj in crew_meshes:
        old=obj.data
        if old not in replacements:
            keep=[p for p in old.polygons if not is_garment(old.materials[p.material_index])]
            mesh=bpy.data.meshes.new(old.name+'_GarmentSeparated')
            mesh.from_pydata([v.co[:] for v in old.vertices],[],[p.vertices[:] for p in keep]);mesh.update()
            for m in old.materials:mesh.materials.append(m)
            loop_ids=[li for p in keep for li in p.loop_indices]
            for new,p in zip(mesh.polygons,keep):new.material_index=p.material_index;new.use_smooth=p.use_smooth
            for layer in old.uv_layers:
                target=mesh.uv_layers.new(name=layer.name)
                for i,li in enumerate(loop_ids):target.data[i].uv=layer.data[li].uv
            mesh.normals_split_custom_set([old.corner_normals[li].vector for li in loop_ids])
            # Deform weights are mesh data, not merely object group names.
            group_names=[g.name for g in obj.vertex_groups]
            proxy=obj.copy();proxy.data=mesh;scene.collection.objects.link(proxy)
            for name in group_names:proxy.vertex_groups.new(name=name)
            for v in old.vertices:
                for e in v.groups:proxy.vertex_groups[e.group].add([v.index],e.weight,'REPLACE')
            bpy.data.objects.remove(proxy,do_unlink=True)
            replacements[old]=mesh
        obj.data=replacements[old]
    original=next(o for o in canonical if o.name.startswith('Competition_Tank_Top_Loose'))
    shirt=original.copy();shirt.data=original.data.copy();scene.collection.objects.link(shirt);shirt.parent=None;shirt.matrix_world.identity();shirt.shape_key_clear();shirt.animation_data_clear()
    for mod in list(shirt.modifiers):shirt.modifiers.remove(mod)
    # Limited dissolve removes nearly coplanar interior detail. Boundary loops are
    # re-audited afterwards; it also removes collinear border samples.
    bpy.ops.object.select_all(action='DESELECT');shirt.select_set(True);bpy.context.view_layer.objects.active=shirt
    mod=shirt.modifiers.new('Interior_Only_Planar_Reduction','DECIMATE');mod.decimate_type='DISSOLVE';mod.angle_limit=.12;mod.use_dissolve_boundaries=False
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # Follow the shell's actual four loops. Close the tube periodically, without
    # duplicated nearly coincident start/end rings or independent KD-tree weights.
    graph={};counts={}
    for p in shirt.data.polygons:
        for a,b in p.edge_keys:counts[(min(a,b),max(a,b))]=counts.get((min(a,b),max(a,b)),0)+1
    for (a,b),n in counts.items():
        if n==1:graph.setdefault(a,[]).append(b);graph.setdefault(b,[]).append(a)
    loops=[];seen=set()
    for start in graph:
        if start in seen:continue
        ring=[];prev=None;cur=start
        while cur not in seen:
            seen.add(cur);ring.append(cur);nxt=[i for i in graph[cur] if i!=prev];prev,cur=cur,nxt[0]
        loops.append(ring)
    assert len(loops)==4 and all(len(v)==2 for v in graph.values()),'Unexpected canonical shell boundary'
    binding_sides=6
    templates=[shirt];trim=next(m for m in bpy.data.materials if m.name=='Green_Ribbed_Binding')
    for index,ring in enumerate(loops):
        vs=[];faces=[];uv=[];weights=[];radius=.0028 if min(shirt.data.vertices[i].co.z for i in ring)<1 else .0032
        for j,vid in enumerate(ring):
            center=shirt.data.vertices[vid].co;tangent=(shirt.data.vertices[ring[(j+1)%len(ring)]].co-shirt.data.vertices[ring[j-1]].co).normalized()
            normal=shirt.data.vertices[vid].normal.copy();normal=(normal-tangent*normal.dot(tangent)).normalized();across=tangent.cross(normal).normalized()
            w=[(e.group,e.weight) for e in shirt.data.vertices[vid].groups]
            for k in range(binding_sides):vs.append(center+radius*(normal*math.cos(k*math.tau/binding_sides)+across*math.sin(k*math.tau/binding_sides)));uv.append((j/len(ring),k/binding_sides));weights.append(w)
        for j in range(len(ring)):
            for k in range(binding_sides):faces.append((j*binding_sides+k,j*binding_sides+(k+1)%binding_sides,((j+1)%len(ring))*binding_sides+(k+1)%binding_sides,((j+1)%len(ring))*binding_sides+k))
        data=bpy.data.meshes.new('Continuous_Binding_'+str(index));data.from_pydata(vs,[],faces);data.materials.append(trim);data.update()
        tube=bpy.data.objects.new('Continuous_Binding_'+str(index),data);scene.collection.objects.link(tube)
        for g in shirt.vertex_groups:tube.vertex_groups.new(name=g.name)
        for i,w in enumerate(weights):
            for g,value in w:tube.vertex_groups[g].add([i],value,'REPLACE')
        layer=data.uv_layers.new(name='UVMap')
        for li,l in enumerate(data.loops):layer.data[li].uv=uv[l.vertex_index]
        for p in data.polygons:p.use_smooth=True
        templates.append(tube)
    role_data={}
    for obj in crew_meshes:
        ar=obj.parent
        role=ar.parent.get('role')
        role_material=bpy.data.materials.get('Caller_Olive' if role=='BOW_CALLER' else 'Controller_Light_Blue' if role=='MID_CONTROLLER' else '')
        for template in templates:
            garment=template.copy();garment.data=template.data
            if role_material:
                key=(template.data,role)
                if key not in role_data:
                    role_data[key]=template.data.copy();role_data[key].materials.clear();role_data[key].materials.append(role_material)
                garment.data=role_data[key]
            garment.name=obj.name+'_'+template.name;scene.collection.objects.link(garment);garment.parent=ar;garment.matrix_parent_inverse.identity();garment.location=(0,0,0);garment.rotation_euler=(0,0,0);garment.scale=(1,1,1)
            mod=garment.modifiers.new('Original_Crew_Rig','ARMATURE');mod.object=ar
    report['bindingRadialSegments']=binding_sides
    report['repairedShell']=stats(shirt);report['repairedBindings']={o.name:stats(o) for o in templates[1:]}
    report['preservation']={'motionBefore':before_motion,'motionAfter':motion_digest(),'anatomyMatches':all(anatomy_digest(o)==before_anatomy[o.name] for o in crew_meshes),'armatures':sum(o.type=='ARMATURE' for o in scene.objects)}
    report['preservation']['maxAnatomyNormalReencodeError']=max((before_normals[o.name][i]-o.data.corner_normals[li].vector).length for o in crew_meshes for i,li in enumerate(li for p in o.data.polygons for li in p.loop_indices))
    report['preservation']['roleColors']={role:[list(o.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value) for o in scene.objects if o.type=='MESH' and o.name.startswith(a.name) and 'Competition_Tank_Top_Loose' in o.name] for role in ['BOW_CALLER','MID_CONTROLLER'] for a in scene.objects if a.get('role')==role}
    report['preservation']['motionMatches']=report['preservation']['motionBefore']==report['preservation']['motionAfter']
    print('PRESERVATION',json.dumps(report['preservation']),flush=True)
    assert report['preservation']['motionMatches'] and report['preservation']['anatomyMatches'] and report['preservation']['maxAnatomyNormalReencodeError']<.001,'Preservation gate failed'
    for o in templates:bpy.data.objects.remove(o,do_unlink=True)
    (out/'repair-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    scene.frame_set(17)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'crew-garment-preview.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(out/'crew-garment-preview.glb'),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_frame_range=True,export_force_sampling=True,export_apply=False)

if args.render:
    descendants=set([actor]);todo=list(actor.children)
    while todo:
        o=todo.pop();descendants.add(o);todo.extend(o.children)
    for o in scene.objects:
        if o.type in {'MESH','ARMATURE','EMPTY'} and o not in descendants:o.hide_render=True
    scene.world=bpy.data.worlds.new('Garment_QA_World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.20,.25,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    focus=actor.matrix_world.translation.copy()+Vector((0,0,.85))
    for name,delta,power,size in [('Key',(3,-4,5),600,4),('Fill',(-3,2,3),450,3)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=focus+Vector(delta);o.rotation_euler=(focus-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('Garment_QA_Camera');cam=bpy.data.objects.new('Garment_QA_Camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.1
    scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    for frame in [1,17,33]:
        scene.frame_set(frame);bpy.context.view_layer.update();focus=actor.matrix_world.translation.copy()+Vector((0,0,.85));cam.location=focus+Vector((3,-3,1));cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f'{"before" if args.diagnose_only and not args.render_existing else "after"}-{args.actor_kind}-phase-{frame:02}.png');bpy.ops.render.render(write_still=True)

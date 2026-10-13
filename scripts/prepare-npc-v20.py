"""Convert cached Quaternius civilian glTF; preserve source idle/wave actions; render evidence."""
import bpy, sys, os, json
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; src,out=args[:2]
polish='--polish' in args
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
if polish:
    for obj in [o for o in bpy.context.scene.objects if o.type=='MESH']:
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        # glTF flat normals split coincident face vertices; weld before subdivision
        # so each triangle does not shrink into an isolated tile.
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.00001)
        bpy.ops.object.mode_set(mode='OBJECT')
        # Preserve separate-part seams and material feature boundaries while
        # interpolating weights through one subdivision before the armature.
        crease=obj.data.attributes.get('crease_edge') or obj.data.attributes.new('crease_edge','FLOAT','EDGE')
        adjacent={e.index:[] for e in obj.data.edges}
        lookup={tuple(sorted(e.vertices)):e.index for e in obj.data.edges}
        for face in obj.data.polygons:
            for key in face.edge_keys: adjacent[lookup[tuple(sorted(key))]].append(face.material_index)
        for edge in obj.data.edges:
            mats=adjacent[edge.index]
            crease.data[edge.index].value=1.0 if len(mats)!=2 or len(set(mats))>1 else 0.0
        sub=obj.modifiers.new('One subdivision before rig','SUBSURF');sub.levels=1;sub.render_levels=1
        bpy.ops.object.modifier_move_to_index(modifier=sub.name,index=0)
        bpy.ops.object.modifier_apply(modifier=sub.name)
        for p in obj.data.polygons:p.use_smooth=True
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if bs:
            bs.inputs['Roughness'].default_value=.75
            colors={'Skin':(.32,.16,.085,1),'Skin_Darker':(.24,.12,.065,1),'Red_Dark':(.055,.045,.04,1)}
            if mat.name in colors:bs.inputs['Base Color'].default_value=colors[mat.name]
actions=list(bpy.data.actions)
keep=[a for a in actions if a.name in ['Idle','Idle_Neutral','Wave','Walk']]
for a in actions:
    if a not in keep: bpy.data.actions.remove(a)
for a in keep: a.use_fake_user=True
os.makedirs(os.path.dirname(out),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_action_filter=False,export_materials='EXPORT')
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
rig.animation_data_create(); rig.animation_data.action=next((a for a in keep if a.name=='Idle_Neutral'),keep[0])
bpy.context.scene.frame_set(12)
pts=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)));center=(lo+hi)/2;size=hi.z-lo.z
bpy.ops.object.camera_add(location=center+Vector((0,-size*1.8,size*.10)))
cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*1.22;bpy.context.scene.camera=cam
for loc,power in [((2,-3,4),550),((-2,-2,3),350)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(loc));bpy.context.object.data.energy=power;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=4
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.18,.18,.18,1)
scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.filepath='E:/AI/Um Tuk/asset-studio/coherent-v19/npc-candidates/v20-'+os.path.basename(out)+'.png';bpy.ops.render.render(write_still=True)
if polish:
    # Source wave mid-pose is an additional continuity/holes diagnostic.
    rig.animation_data.action=next(a for a in keep if a.name=='Wave')
    scene.frame_set(round(sum(rig.animation_data.action.frame_range)/2))
    scene.render.filepath='E:/AI/Um Tuk/asset-studio/coherent-v19/npc-candidates/v20-'+os.path.basename(out)+'.wave.png';bpy.ops.render.render(write_still=True)
    cam.data.ortho_scale=size*.46
    focus=center+Vector((0,0,size*.34));cam.location=focus+Vector((0,-size*1.8,size*.03));cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
    rig.animation_data.action=next(a for a in keep if a.name=='Idle_Neutral');scene.frame_set(12)
    scene.render.filepath='E:/AI/Um Tuk/asset-studio/coherent-v19/npc-candidates/v20-'+os.path.basename(out)+'.close.png';bpy.ops.render.render(write_still=True)
json.dump({'source':src,'bytes':os.path.getsize(out),'bones':[b.name for b in rig.data.bones],'actions':[a.name for a in keep],'height':size},open('E:/AI/Um Tuk/asset-studio/coherent-v19/npc-candidates/v20-'+os.path.basename(out)+'.json','w'),indent=2)

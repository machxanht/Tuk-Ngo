"""Build isolated D/F rowing comparisons from the licensed original characters."""
import argparse
import copy
import json
import math
import re
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT.parent / 'tools/asset-cache/character-comparison'
OUT = ROOT / 'public/assets/character-comparison'
QA = ROOT / 'docs/qa/character-comparison'


def load_source(model):
    if model == 'f':
        path = next((CACHE / 'f').rglob('*.blend'))
        bpy.ops.wm.open_mainfile(filepath=str(path), use_scripts=False)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        path = next((CACHE / 'd').rglob('Superhero_Male_FullBody.gltf'))
        document = json.loads(path.read_text(encoding='utf-8'))
        for image in document.get('images', []):
            image_path = path.parent / image.get('uri', '')
            if not image_path.exists() and '_png.png' in image_path.name:
                replacement = next((CACHE / 'd').rglob(image_path.name.replace('_png.png', '.png')), None)
                if replacement:
                    image_path.write_bytes(replacement.read_bytes())
        bpy.ops.import_scene.gltf(filepath=str(path))
    return path


def inspect(model):
    source = load_source(model)
    result = {'model': model, 'source': str(source), 'blenderVersion': bpy.app.version_string,
              'objects': [], 'armatures': [], 'materials': [], 'texts': []}
    for obj in bpy.data.objects:
        record = {'name': obj.name, 'type': obj.type, 'location': list(obj.location),
                  'scale': list(obj.scale), 'dimensions': list(obj.dimensions),
                  'hideRender': obj.hide_render, 'hideViewport': obj.hide_viewport,
                  'parent': obj.parent.name if obj.parent else None}
        if obj.type == 'MESH':
            record.update(vertices=len(obj.data.vertices), polygons=len(obj.data.polygons),
                modifiers=[{'type': m.type, 'name': m.name} for m in obj.modifiers],
                materials=[s.material.name if s.material else None for s in obj.material_slots],
                shapeKeys=[k.name for k in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else [])
            record['vertexGroups'] = [g.name for g in obj.vertex_groups]
            if obj.data.uv_layers.active and len(obj.data.uv_layers.active.data):
                coords = [tuple(x.uv) for x in obj.data.uv_layers.active.data]
                record['uvBounds'] = [min(x[0] for x in coords), max(x[0] for x in coords), min(x[1] for x in coords), max(x[1] for x in coords)]
            record['uvLayers'] = [{'name': uv.name, 'render': uv.active_render,
                'bounds': [min(x.uv[0] for x in uv.data), max(x.uv[0] for x in uv.data),
                           min(x.uv[1] for x in uv.data), max(x.uv[1] for x in uv.data)]}
                for uv in obj.data.uv_layers if len(uv.data)]
        result['objects'].append(record)
        if obj.type == 'ARMATURE':
            result['armatures'].append({'name': obj.name, 'bones': [{
                'name': b.name, 'deform': b.use_deform, 'head': list(b.head_local),
                'tail': list(b.tail_local), 'parent': b.parent.name if b.parent else None,
                'constraints': [{'type': c.type, 'name': c.name} for c in obj.pose.bones[b.name].constraints],
                'properties': {k: obj.pose.bones[b.name][k] for k in obj.pose.bones[b.name].keys()
                               if isinstance(obj.pose.bones[b.name][k], (str, int, float, bool))}}
                for b in obj.data.bones]})
    for material in bpy.data.materials:
        result['materials'].append({'name': material.name, 'nodes': [{
            'name': node.name, 'type': node.type,
            'image': node.image.filepath if node.type == 'TEX_IMAGE' and node.image else None}
            for node in material.node_tree.nodes] if material.use_nodes else []})
    for text in bpy.data.texts:
        result['texts'].append({'name': text.name, 'bytes': len(text.as_string()),
                               'preview': text.as_string()[:500]})
    result['actions'] = [{'name': a.name, 'asset': bool(a.asset_data), 'frames': list(a.frame_range)} for a in bpy.data.actions]
    result['images'] = [{'name': image.name, 'file': image.filepath, 'size': list(image.size)} for image in bpy.data.images]
    QA.mkdir(parents=True, exist_ok=True)
    (QA / (model + '-source.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('SOURCE_INSPECTED', model, len(result['objects']), 'objects',
          len(result['armatures']), 'armatures', sum(len(a['bones']) for a in result['armatures']), 'bones')


def pose_curves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


def source_face(rig, poses):
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    for pose in poses:
        action = bpy.data.actions[pose]
        for curve in pose_curves(action):
            if not re.fullmatch(r'pose\.bones\["[^"]+"\]\.(location|rotation_euler|rotation_quaternion|scale)', curve.data_path):
                continue
            value = curve.evaluate(action.frame_range.x)
            try:
                prop = rig.path_resolve(curve.data_path)
                prop[curve.array_index] = value
            except (ValueError, TypeError):
                # The shipped v4 pose library retains obsolete helper-bone
                # channels. Only apply transform channels on the current rig.
                continue
    rig.update_tag(refresh={'OBJECT', 'DATA', 'TIME'})
    bpy.context.view_layer.update()


def capture(obj):
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()),
                                         preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
    group_names = {g.index: g.name for g in obj.vertex_groups}
    render_uv = next((layer for layer in mesh.uv_layers if layer.active_render), mesh.uv_layers.active)
    uv = render_uv.data if render_uv else None
    result = {'name': obj.name, 'vertices': [list(obj.matrix_world @ v.co) for v in mesh.vertices],
        'faces': [list(p.vertices) for p in mesh.polygons],
        'uv': [[list(uv[i].uv) if uv else [0, 0] for i in p.loop_indices] for p in mesh.polygons],
        'materials': [s.material.name if s.material else '' for s in obj.material_slots],
        'materialIndices': [p.material_index for p in mesh.polygons],
        'weights': [[(group_names[g.group], g.weight) for g in v.groups if g.group in group_names and g.weight > .0001]
                    for v in mesh.vertices]}
    bpy.data.meshes.remove(mesh)
    return result


def snow_name(name):
    side = 'l' if name.endswith('.L') else 'r' if name.endswith('.R') else None
    direct = {'DEF-Hips': 'pelvis', 'DEF-Hip_Center': 'pelvis', 'DEF-Spine': 'spine_01',
        'DEF-RibCage': 'spine_02', 'DEF-Chest': 'spine_03', 'DEF-Neck': 'neck_01', 'DEF-Head': 'head'}
    if name in direct:
        return direct[name]
    if side:
        stem = name[:-2]
        if stem.startswith('DEF-Shoulder'):
            return 'clavicle_' + side
        for prefix, target in [('DEF-UpperArm_', 'upperarm'), ('DEF-Forearm_', 'lowerarm'),
                ('DEF-Wrist', 'hand'), ('DEF-Thigh_', 'thigh'), ('DEF-Knee_', 'calf'),
                ('DEF-Thigh', 'thigh'), ('DEF-Knee', 'calf'),
                ('DEF-Foot', 'foot'), ('DEF-Toes', 'ball')]:
            if stem.startswith(prefix):
                return target + '_' + side
        if stem.startswith('DEF-Finger_'):
            finger = stem[len('DEF-Finger_'):]
            if '_Carpal' in finger:
                return 'hand_' + side
            return finger[:-1].lower() + '_0' + finger[-1] + '_' + side
        if stem.startswith('DEF-Hip'):
            return 'pelvis'
    return 'head'


def collapse_weights(records, snow=False):
    result = []
    for row in records:
        groups = {}
        for name, value in row:
            if snow and not name.startswith('DEF-'):
                continue
            mapped = snow_name(name) if snow else ('head' if name == 'Head' else name)
            groups[mapped] = groups.get(mapped, 0) + value
        top = sorted(groups.items(), key=lambda r: r[1], reverse=True)[:4]
        total = sum(v for _, v in top) or 1
        result.append([(n, v / total) for n, v in top] or [('head', 1)])
    return result


def common_bones(rig, snow=False):
    template = json.loads((QA / 'd-source.json').read_text(encoding='utf-8'))['armatures'][0]['bones']
    mapping = {'root': 'root', 'pelvis': 'DEF-Hips', 'spine_01': 'DEF-Spine',
        'spine_02': 'DEF-RibCage', 'spine_03': 'DEF-Chest', 'neck_01': 'DEF-Neck', 'Head': 'DEF-Head'}
    for side in ['l', 'r']:
        suffix = '.' + side.upper()
        for target, source in [('clavicle', 'DEF-Shoulder'), ('upperarm', 'DEF-UpperArm_1'),
            ('lowerarm', 'DEF-Forearm_1'), ('hand', 'DEF-Wrist'), ('thigh', 'DEF-Thigh_1'),
            ('calf', 'DEF-Knee_1'), ('foot', 'DEF-Foot'), ('ball', 'DEF-Toes')]:
            mapping[target + '_' + side] = source + suffix
        for finger in ['thumb', 'index', 'middle', 'ring', 'pinky']:
            for index in range(1, 4):
                mapping[finger + '_0' + str(index) + '_' + side] = 'DEF-Finger_' + finger.title() + str(index) + suffix
    result = []
    for t in template:
        name = t['name']
        source = rig.data.bones.get(mapping.get(name, '')) if snow else rig.data.bones[name]
        if source:
            head, tail = source.head_local.copy(), source.tail_local.copy()
            if snow and name.startswith(('upperarm_', 'lowerarm_', 'thigh_', 'calf_')):
                child = {'upperarm': 'lowerarm', 'lowerarm': 'hand', 'thigh': 'calf', 'calf': 'foot'}[name.split('_')[0]] + '_' + name[-1]
                tail = rig.data.bones[mapping[child]].head_local.copy()
        else:
            parent = next(b for b in result if b['name'] == t['parent'])
            head = Vector(parent['tail'])
            tail = head + (Vector(parent['tail']) - Vector(parent['head'])).normalized() * .008
        result.append({'name': 'head' if name == 'Head' else name,
            'parent': 'head' if t['parent'] == 'Head' else t['parent'], 'head': list(head), 'tail': list(tail)})
    return result


def snow_source():
    load_source('f')
    rig = bpy.data.objects['RIG-Snow']
    # Facial action constraints are driven by animation_data.drivers. Removing
    # animation_data also removes those drivers and silently breaks eyelids.
    if rig.animation_data:
        rig.animation_data.action = None
        for track in rig.animation_data.nla_tracks:
            track.mute = True
    for obj in bpy.data.objects:
        if obj.type != 'MESH' or not obj.name.startswith('GEO-'):
            continue
        if obj.animation_data:
            for driver in obj.animation_data.drivers:
                if driver.data_path.startswith('modifiers['):
                    driver.mute = True
        for modifier in obj.modifiers:
            if modifier.type == 'SUBSURF':
                modifier.levels = modifier.render_levels = 1 if obj.name in ['GEO-snow-head', 'GEO-snow-eyebrows'] else 0
            if modifier.type == 'MASK':
                modifier.show_viewport = modifier.show_render = False
        obj.hide_viewport = False
    source_face(rig, [])
    names = ['body', 'head', 'eyes', 'eyebrows', 'hair_base', 'shirt', 'pants',
             'gums_lower', 'gums_upper', 'teeth_lower', 'teeth_upper', 'tongue']
    parts = [capture(bpy.data.objects['GEO-snow-' + n]) for n in names]
    for part in parts:
        if part['name'] == 'GEO-snow-body':
            part['clothingMask'] = [dict(row).get('mask', 0) for row in part['weights']]
        part['weights'] = collapse_weights(part['weights'], snow=True)
    facial = {'Smile': ['Eyemask Relaxed', 'Mouth Teethsmile'],
              'Effort': ['Eyemask Angry', 'Mouth Compressed'], 'Blink': ['Eyemask Closed']}
    differences = {}
    for label, poses in facial.items():
        source_face(rig, poses)
        changed = 0
        for part in parts:
            if any(n in part['name'] for n in ['head', 'eyes', 'eyebrows', 'gums', 'teeth', 'tongue']):
                variant = capture(bpy.data.objects[part['name']])
                if len(variant['vertices']) != len(part['vertices']):
                    raise ValueError('Expression changed topology')
                part.setdefault('expressions', {})[label] = variant['vertices']
                changed += sum((Vector(v) - Vector(w)).length > .0001 for v, w in zip(part['vertices'], variant['vertices']))
        differences[label] = changed
    if min(differences.values()) < 20:
        raise ValueError('Native Snow facial poses did not evaluate')
    source_face(rig, [])
    print('NATIVE_FACE_POSES', json.dumps(differences), flush=True)
    return {'parts': parts, 'bones': common_bones(rig, snow=True), 'facePoseVerticesChanged': differences}


def material(name, color, roughness=.7, texture=None, uv=None, normal=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if texture:
        image = bpy.data.images.load(str(texture), check_existing=True)
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = image
        if uv:
            coordinate = mat.node_tree.nodes.new('ShaderNodeUVMap')
            coordinate.uv_map = uv
            mat.node_tree.links.new(coordinate.outputs['UV'], node.inputs['Vector'])
        mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def make_rig(bones):
    armature = bpy.data.armatures.new('ComparisonSkeleton')
    rig = bpy.data.objects.new('ComparisonSkeleton', armature)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for b in bones:
        bone = armature.edit_bones.new(b['name'])
        bone.head, bone.tail = b['head'], b['tail']
        if (bone.tail - bone.head).length < .001:
            bone.tail = bone.head + Vector((0, 0, .01))
    for b in bones:
        if b['parent']:
            armature.edit_bones[b['name']].parent = armature.edit_bones[b['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.select_set(False)
    return rig


def mesh_part(part, rig, materials):
    mesh = bpy.data.meshes.new(part['name'])
    mesh.from_pydata(part['vertices'], [], part['faces'])
    mesh.update()
    obj = bpy.data.objects.new(part['name'], mesh)
    bpy.context.collection.objects.link(obj)
    uv = mesh.uv_layers.new(name='BaseUV')
    for polygon, coordinates in zip(mesh.polygons, part['uv']):
        polygon.use_smooth = True
        for i, value in zip(polygon.loop_indices, coordinates):
            uv.data[i].uv = value
    for mat in materials:
        mesh.materials.append(mat)
    for p, i in zip(mesh.polygons, part['materialIndices']):
        p.material_index = min(i, len(materials) - 1)
    groups = {}
    for index, influences in enumerate(part['weights']):
        for name, value in influences:
            if name not in rig.data.bones:
                name = 'head'
            if name not in groups:
                groups[name] = obj.vertex_groups.new(name=name)
            groups[name].add([index], value, 'REPLACE')
    modifier = obj.modifiers.new('Shared rowing skeleton', 'ARMATURE')
    modifier.object = rig
    obj.parent = rig
    if part.get('expressions'):
        obj.shape_key_add(name='Basis')
        for label, vertices in part['expressions'].items():
            key = obj.shape_key_add(name=label)
            key.data.foreach_set('co', np.asarray(vertices, dtype=np.float32).ravel())
    return obj


def trim_short_pants(obj, height=.59):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        dist=.00001, plane_co=(0, 0, height), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def cull_covered_body(obj, rig, clothing_mask=None):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    deform = bm.verts.layers.deform.active
    names = {g.index: g.name for g in obj.vertex_groups}
    bm.verts.ensure_lookup_table()
    mask = {v: clothing_mask[i] for i, v in enumerate(bm.verts)} if clothing_mask else {}
    neck = rig.data.bones['neck_01'].head_local.z
    remove = []
    for face in bm.faces:
        center = face.calc_center_median()
        torso = sum(sum(value for index, value in v[deform].items()
                    if names.get(index) in ['pelvis', 'spine_01', 'spine_02', 'spine_03'])
                    for v in face.verts) / len(face.verts) if deform else 0
        native_covered = center.z > .60 and mask and any(mask[v] > .5 for v in face.verts)
        if native_covered or (.60 < center.z < neck - .035 and torso > .45) or (
                .61 < center.z < rig.data.bones['pelvis'].head_local.z + .03 and abs(center.x) < .26):
            remove.append(face)
    bmesh.ops.delete(bm, geom=remove, context='FACES')
    bm.to_mesh(obj.data)
    bm.free()


def transfer_garment(part, source_rig, target_rig, body):
    source_rest = {b.name: b.matrix_local for b in source_rig.data.bones}
    target_rest = {b.name: b.matrix_local for b in target_rig.data.bones}
    tree = BVHTree.FromPolygons([v.co for v in body.data.vertices], [list(p.vertices) for p in body.data.polygons])
    result = copy.deepcopy(part)
    for i, point in enumerate(part['vertices']):
        v = Vector((0, 0, 0))
        for name, weight in part['weights'][i]:
            local = source_rest[name].inverted() @ Vector(point)
            # Snow's real clothing panels keep their folds while adapting to
            # the broader Quaternius torso and limbs.
            if name.startswith(('spine_', 'pelvis', 'upperarm_', 'thigh_')):
                local.x *= 1.34
                local.z *= 1.22
            v += (target_rest[name] @ local) * weight
        nearest, normal, _, distance = tree.find_nearest(v)
        if nearest is not None and distance < .16 and (v - nearest).dot(normal) < .014:
            v = nearest + normal * .014
        result['vertices'][i] = list(v)
    return result


def add_print_uv(obj, rig):
    layer = obj.data.uv_layers.new(name='PrintUV')
    lo = rig.data.bones['pelvis'].head_local.z - .02
    hi = rig.data.bones['neck_01'].head_local.z
    for polygon in obj.data.polygons:
        front = polygon.normal.y < 0
        for i in polygon.loop_indices:
            p = obj.data.vertices[obj.data.loops[i].vertex_index].co
            u = .5 + p.x / .7
            if not front:
                u = 1 - u
            layer.data[i].uv = ((0 if front else .5) + min(.99, max(.01, u)) * .5,
                                min(.99, max(.01, (p.z - lo) / (hi - lo))))


def create_paddle(rig):
    # Both comparisons use precisely the same existing authored paddle mesh.
    with bpy.data.libraries.load(str(ROOT / 'art/athlete/athlete-master.blend'), link=False) as (source, target):
        target.objects = [name for name in ['Race_Paddle'] if name in source.objects]
    paddle = target.objects[0]
    bpy.context.collection.objects.link(paddle)
    paddle.parent = None
    paddle.matrix_world.identity()
    paddle.name = 'ComparisonPaddle'
    # The source mesh uses Blender Z as the downward shaft axis.
    return paddle


def build(model):
    OUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    snow = snow_source()
    source_parts = [p for p in snow['parts'] if any(n in p['name'] for n in ['shirt', 'pants'])]
    if model == 'd':
        load_source('d')
        native = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
        bones = common_bones(native)
        parts = [capture(o) for o in bpy.data.objects if o.type == 'MESH' and o.parent == native]
        for part in parts:
            part['weights'] = collapse_weights(part['weights'])
        # Keep the source PBR maps rather than replacing the actual D face.
        d_materials = {m.name: m.copy() for m in bpy.data.materials}
        hair_path = next(p for p in (CACHE / 'd').rglob('Hair_SimpleParted.gltf') if 'Rigged to Head Bone' in str(p))
        previous = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(hair_path))
        for obj in set(bpy.data.objects) - previous:
            if obj.type == 'MESH' and obj.vertex_groups:
                part = capture(obj)
                part['weights'] = [[('head', 1)] for _ in part['vertices']]
                parts.append(part)
        for obj in list(bpy.data.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
    else:
        bones = snow['bones']
        parts = [p for p in snow['parts'] if not any(n in p['name'] for n in ['shirt', 'pants'])]
        bpy.ops.wm.read_factory_settings(use_empty=True)
    rig = make_rig(bones)
    cloth_source_rig = make_rig(snow['bones']) if model == 'd' else rig
    if model == 'd':
        cloth_source_rig.name = 'GarmentReferenceOnly'
    texture = CACHE / 'textures'
    skin = material('Snow portable skin', (.55, .29, .16), .67, texture / 'snow-skin.jpg')
    hair = material('Short dark hair', (.024, .016, .010), .7, texture / 'hair_diffuse.jpg')
    eyes = material('Eyes', (1, 1, 1), .3, texture / 'eyes_diffuse.jpg')
    teeth = material('Teeth', (.80, .77, .67), .48)
    mouth = material('Mouth interior', (.18, .025, .028), .7)
    jersey = material('Shared blue racing jersey', (.02, .18, .6), .78, texture / 'jersey.png', uv='PrintUV')
    shorts = material('Shared dark racing shorts', (.018, .025, .045), .85)
    objects = []
    body = None
    for part in parts:
        if model == 'd':
            mats = [hair if 'Hair' in n else d_materials.get(n) or bpy.data.materials.get(n) or skin for n in part['materials']]
            mats = mats or [hair]
        else:
            mats = ([hair] if any(n in part['name'] for n in ['hair', 'eyebrows']) else
                    [eyes] if 'eyes' in part['name'] else [teeth] if 'teeth' in part['name'] else
                    [mouth] if any(n in part['name'] for n in ['gums', 'tongue']) else [skin] * max(1, len(part['materials'])))
            if mats[0] == skin:
                part['uv'] = [[[u / 3, v] for u, v in face] for face in part['uv']]
        obj = mesh_part(part, rig, mats)
        objects.append(obj)
        if 'body' in part['name'] or 'SuperHero' in part['name']:
            body = obj
    for part in source_parts:
        if not any(n in part['name'] for n in ['shirt', 'pants']):
            continue
        if model == 'd':
            part = transfer_garment(part, cloth_source_rig, rig, body)
        obj = mesh_part(part, rig, [jersey if 'shirt' in part['name'] else shorts])
        if 'pants' in part['name']:
            trim_short_pants(obj)
        else:
            add_print_uv(obj, rig)
        objects.append(obj)
    cull_covered_body(body, rig, next((p.get('clothingMask') for p in parts if p['name'] == 'GEO-snow-body'), None))
    if cloth_source_rig != rig:
        bpy.data.objects.remove(cloth_source_rig, do_unlink=True)
    paddle = create_paddle(rig)
    objects.append(paddle)
    for obj in objects:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
    # The derived .blend and portable comparison use a compact humanoid
    # skeleton and baked native facial poses, rather than CloudRig UI controls.
    rig.name = 'ComparisonSkeleton'
    rig['sourceCharacter'] = model.upper()
    rig['faceSource'] = 'Snow native pose assets' if model == 'f' else 'No added facial morphs'
    for image in bpy.data.images:
        if image.has_data and image.source == 'FILE':
            image.pack()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [rig, *objects]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.context.preferences.filepaths.save_version = 0
    source_out = ROOT / 'art/character-comparison'
    source_out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source_out / (model + '.blend')), compress=True)
    compiled = CACHE / 'compiled'
    compiled.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(compiled / (model + '.glb')), export_format='GLB',
        use_selection=True, export_animations=False, export_yup=True, export_def_bones=True,
        export_skins=True, export_morph=True, export_tangents=True, export_materials='EXPORT', export_image_format='AUTO')
    report = {'model': model, 'meshes': len(objects), 'bones': len(rig.data.bones),
        'source': 'Quaternius Standard' if model == 'd' else 'Snow Blender Studio',
        'nativeFacialPoses': snow['facePoseVerticesChanged'] if model == 'f' else {},
        'vertices': sum(len(o.data.vertices) for o in objects), 'restGlbBytes': (compiled / (model + '.glb')).stat().st_size}
    (QA / (model + '-build.json')).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('COMPARISON_BUILT', json.dumps(report), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', choices=['d', 'f'], required=True)
    parser.add_argument('--inspect', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if args.inspect:
        inspect(args.model)
    else:
        build(args.model)


if __name__ == '__main__':
    main()

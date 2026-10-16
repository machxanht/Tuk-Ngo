"""Author fitted race equipment in Blender; source rigs and shirt stay untouched.

Run in Blender, or send this file to the local Blender MCP execute tool. The
small details GLB is used by the game. The packed .blend retains the original
anatomical source and the authored equipment for further editing.
"""
import bpy
import json
import math
import struct
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1] if '__file__' in globals() and 'author-athlete' in __file__ else Path('E:/AI/Um Tuk/github-workspace')
BASE = ROOT / 'public/assets/illustrated-v22'
OUT = ROOT / 'public/assets/athlete-master'
SOURCE = ROOT / 'art/athlete'
QA = ROOT / 'docs/qa/athlete-master'
for folder in (OUT, SOURCE, QA):
    folder.mkdir(parents=True, exist_ok=True)

# Source accessors may be interleaved; respect bufferStride, not just byteOffset.
raw = (BASE / 'athlete-rig-v27.glb').read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20 + size])
binary = raw[28 + size:]
def accessor(index):
    a = gltf['accessors'][index]
    view = gltf['bufferViews'][a['bufferView']]
    dtype = np.dtype({5126: '<f4', 5123: '<u2', 5125: '<u4', 5121: 'u1'}[a['componentType']])
    width = {'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16, 'SCALAR': 1}[a['type']]
    return np.ndarray((a['count'], width), dtype, binary,
        offset=view.get('byteOffset', 0) + a.get('byteOffset', 0),
        strides=(view.get('byteStride', width * dtype.itemsize), dtype.itemsize)).copy()

skin = gltf['skins'][0]
head_index = next(i for i, node in enumerate(skin['joints']) if gltf['nodes'][node].get('name') == 'head')
head_inverse = accessor(skin['inverseBindMatrices'])[head_index].reshape(4, 4).T
head_bind = np.linalg.inv(head_inverse)

# We author in glTF head/paddle-local metres and convert to Blender Z-up.
def xyz(point):
    x, y, z = point
    return (float(x), float(-z), float(y))

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    if material.users == 0:
        bpy.data.materials.remove(material)

def material(name, color, roughness=.78):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    vertex = m.node_tree.nodes.new('ShaderNodeVertexColor')
    vertex.layer_name = 'Color'
    m.node_tree.links.new(vertex.outputs['Color'], bsdf.inputs['Base Color'])
    return m

cotton = material('Cap_Cotton', (1, 1, 1))
hair_mat = material('Short_Hair', (.019, .014, .011), .9)
wood = material('Oiled_Paddle_Wood', (.48, .24, .075), .56)
def mesh(name, vertices, faces, mat, colors=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in vertices], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    for polygon in data.polygons:
        polygon.use_smooth = True
    attribute = data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for i, entry in enumerate(attribute.data):
        entry.color = (*(colors[i] if colors else mat.diffuse_color[:3]), 1)
    return obj

cap_v, cap_f, cap_c = [], [], []
def cap_surface(vertices, faces, shade=1):
    offset = len(cap_v)
    cap_v.extend(vertices)
    cap_f.extend(tuple(i + offset for i in f) for f in faces)
    cap_c.extend([(shade, shade, shade)] * len(vertices))

def crown(theta, phi):
    return (.087 * math.cos(phi) * math.sin(theta),
        .068 + .098 * math.sin(phi), .009 + .115 * math.cos(phi) * math.cos(theta))

# Six sewn panels; the rear opening is part of the shell silhouette.
segments, rings = 48, 12
for panel in range(6):
    vertices, faces = [], []
    for j in range(rings + 1):
        for i in range(9):
            vertices.append(crown((panel * 8 + i) / segments * math.tau, j / rings * math.pi / 2))
    for j in range(rings):
        for i in range(8):
            theta = (panel * 8 + i + .5) / segments * math.tau
            back = abs((theta - math.pi + math.pi) % math.tau - math.pi)
            midpoint = crown(theta, (j + .5) / rings * math.pi / 2)
            if back < .55 and midpoint[1] < .083 + .021 * math.cos(back / .55 * math.pi / 2):
                continue
            a = j * 9 + i
            if j == rings - 1:
                faces.append((a, a + 1, a + 9))
            else:
                faces.append((a, a + 1, a + 10, a + 9))
    cap_surface(vertices, faces, 1 - (panel % 2) * .025)

# Curved sandwich brim, with a darker underside and a rounded leading edge.
across, along = 24, 10
surfaces = []
for underside in (False, True):
    vertices, faces = [], []
    for row in range(along + 1):
        s = row / along
        for column in range(across + 1):
            q = column / across * 2 - 1
            x = .078 * q * (1 - .12 * s)
            z = .009 + .115 * math.sqrt(max(0, 1 - (.897 * q) ** 2)) + .072 * s * math.sqrt(1 - .65 * q*q)
            y = .069 - .012 * s*s - .009 * q*q - (.0025 if underside else 0)
            vertices.append((x, y, z))
    for row in range(along):
        for col in range(across):
            a = row * (across + 1) + col
            face = (a, a + 1, a + across + 2, a + across + 1)
            faces.append(tuple(reversed(face)) if underside else face)
    cap_surface(vertices, faces, .52 if underside else .93)
    surfaces.append(vertices)
edge = []
for side in (0, across):
    edge.extend([(row * (across + 1) + side, (row + 1) * (across + 1) + side) for row in range(along)])
edge.extend([(along * (across + 1) + i, along * (across + 1) + i + 1) for i in range(across)])
for a, b in edge:
    cap_surface([surfaces[0][a], surfaces[0][b], surfaces[1][b], surfaces[1][a]], [(0, 1, 2, 3)], .76)

def tube(points, radius, shade=.8, sides=5):
    vertices, faces = [], []
    for i, p in enumerate(points):
        tangent = Vector(points[min(i+1, len(points)-1)]) - Vector(points[max(0, i-1)])
        tangent.normalize()
        a = tangent.cross(Vector((0, 1, 0)))
        if a.length < .01:
            a = tangent.cross(Vector((1, 0, 0)))
        a.normalize()
        b = tangent.cross(a).normalized()
        vertices.extend(tuple(Vector(p) + radius * (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau))) for k in range(sides))
    for i in range(len(points)-1):
        for k in range(sides):
            a = i * sides + k
            faces.append((a, i*sides+(k+1)%sides, (i+1)*sides+(k+1)%sides, a+sides))
    cap_surface(vertices, faces, shade)

for panel in range(6):
    theta = panel / 6 * math.tau
    start = .42 if panel == 3 else .025
    tube([tuple(Vector(crown(theta, start + (math.pi/2-start)*j/24)) + Vector((0,.0005,0))) for j in range(25)], .00055)
# An adjustable rear strap closes the lower edge of the opening.
strap = [(-.044,.070,-.103),(.044,.070,-.103),(.044,.080,-.103),(-.044,.080,-.103)]
cap_surface(strap, [(0,1,2,3)], .88)
for x in (-.021,-.010,.001,.012,.023):
    tube([(x+.0012*math.cos(i/10*math.tau),.075+.0012*math.sin(i/10*math.tau),-.104) for i in range(11)], .0004, .38)
tube([(.0035*math.cos(i/12*math.tau),.1665,.0035*math.sin(i/12*math.tau)+.009) for i in range(13)], .0015, .9)
cap = mesh('Race_Cap', cap_v, cap_f, cotton, cap_c)

# Cut the actual anatomical scalp, so the hair follows this head rather than
# sitting on it as a separate sphere. Clip triangles along a tapered hairline.
hair_vertices, hair_faces, hair_colors = [], [], []
for primitive in gltf['meshes'][0]['primitives']:
    if gltf['materials'][primitive['material']]['name'] != 'Painted_Skin_V25':
        continue
    attrs = primitive['attributes']
    positions, normals = accessor(attrs['POSITION']), accessor(attrs['NORMAL'])
    joints, weights = accessor(attrs['JOINTS_0']), accessor(attrs['WEIGHTS_0'])
    points = (head_inverse @ np.column_stack((positions, np.ones(len(positions)))).T).T[:, :3]
    normal_matrix = head_inverse[:3,:3]
    head_weights = np.where(joints == head_index, weights, 0).sum(axis=1)
    def hairline(p):
        front = max(0, min(1, (p[2] - .015) / .055))
        return .044 + .046 * front * front * (3 - 2*front)
    for tri in accessor(primitive['indices']).reshape(-1,3):
        if min(head_weights[tri]) < .7:
            continue
        polygon = [(points[i], normal_matrix @ normals[i]) for i in tri]
        clipped = []
        for k, (a, an) in enumerate(polygon):
            b, bn = polygon[(k+1)%3]
            da, db = a[1]-hairline(a), b[1]-hairline(b)
            if da >= 0:
                clipped.append((a, an))
            if (da >= 0) != (db >= 0):
                t = da/(da-db)
                clipped.append((a+(b-a)*t, an+(bn-an)*t))
        if len(clipped) < 3:
            continue
        offset = len(hair_vertices)
        for p, normal in clipped:
            normal = normal / np.linalg.norm(normal)
            ridge = .0004*math.sin(p[0]*640+p[2]*380)
            hair_vertices.append(p + normal*(.0018+ridge))
            shade = .014 + .006*(.5+.5*math.sin(p[0]*770+p[2]*530))
            hair_colors.append((shade,shade*.82,shade*.64))
        hair_faces.extend((offset, offset+k, offset+k+1) for k in range(1,len(clipped)-1))
hair_obj = mesh('Race_Hair', hair_vertices, hair_faces, hair_mat, hair_colors)

# The paddle pivot and 1.52 m length match the protected animation tracks.
paddle_v, paddle_f, paddle_c = [], [], []
def paddle_surface(vertices, faces, tint=1):
    offset = len(paddle_v)
    paddle_v.extend(vertices)
    paddle_f.extend(tuple(i+offset for i in f) for f in faces)
    for x,y,z in vertices:
        grain = tint*(.89+.11*math.sin(x*920+y*16+math.sin(y*11)*1.6))
        paddle_c.append((.50*grain,.265*grain,.09*grain))

sections = [(-.99,.010),(-1.035,.020),(-1.08,.039),(-1.16,.058),(-1.27,.071),(-1.37,.074),(-1.44,.065),(-1.49,.041),(-1.515,.017),(-1.52,.001)]
vertices, faces = [], []
for y, width in sections:
    for i in range(16):
        theta = i/16*math.tau
        vertices.append((width*math.cos(theta),y,.005*math.sin(theta)))
for j in range(len(sections)-1):
    for i in range(16):
        a=j*16+i
        faces.append((a,j*16+(i+1)%16,(j+1)*16+(i+1)%16,a+16))
faces.extend([tuple(reversed(range(16))), tuple((len(sections)-1)*16+i for i in range(16))])
paddle_surface(vertices,faces)
vertices,faces=[],[]
for row in range(15):
    y=-.015-row/14*1.06
    radius=.0105-row/14*.002
    for i in range(12):
        theta=i/12*math.tau
        vertices.append((radius*math.cos(theta),y,radius*math.sin(theta)))
for row in range(14):
    for i in range(12):
        a=row*12+i
        faces.append((a,row*12+(i+1)%12,(row+1)*12+(i+1)%12,a+12))
paddle_surface(vertices,faces,1.12)
# Rounded palm grip with an oval cross section, not a flat white bar.
vertices,faces=[],[]
for row in range(13):
    x=(row/12*2-1)*.038
    radius=.011*math.sqrt(max(.02,1-(x/.039)**2))
    for i in range(12):
        theta=i/12*math.tau
        vertices.append((x,-.008+radius*math.cos(theta),radius*.8*math.sin(theta)))
for row in range(12):
    for i in range(12):
        a=row*12+i
        faces.append((a,row*12+(i+1)%12,(row+1)*12+(i+1)%12,a+12))
paddle_surface(vertices,faces,1.05)
paddle = mesh('Race_Paddle',paddle_v,paddle_f,wood,paddle_c)

bpy.ops.object.select_all(action='DESELECT')
for o in (cap,hair_obj,paddle):
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'athlete-details.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)

# Keep the editable source together with the unchanged anatomical reference.
bpy.ops.import_scene.gltf(filepath=str(BASE/'athlete-rig-v27.glb'))
arm = next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for obj in bpy.context.scene.objects:
    if obj not in (cap,hair_obj,paddle) and obj.type=='MESH' and any(m and m.name.startswith('White_Cotton_Cap') for m in obj.data.materials):
        obj.hide_render=True
        obj.hide_set(True)
# Accessory meshes have local glTF coordinates: bone parent inverse gives the
# same rest-to-pose transform as the game's rigid head/paddle attachments.
from mathutils import Matrix
convert=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
head_world=convert @ Matrix(head_bind.tolist()) @ convert.inverted()
for obj in (cap,hair_obj):
    obj.matrix_world=head_world
    obj.parent=arm
    modifier=obj.modifiers.new('Original_Head_Bone','ARMATURE')
    modifier.object=arm
    group=obj.vertex_groups.new(name='head')
    group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    # Armature skinning expects rest-world mesh coordinates.
    obj.data.transform(head_world)
    obj.matrix_world=Matrix.Identity(4)

source_paddle=bpy.data.objects.get('Dam_Wood_152cm')
if source_paddle:
    for child in source_paddle.children_recursive:
        if child.type=='MESH':
            child.hide_render=True
            child.hide_set(True)
    paddle.parent=source_paddle
    paddle.matrix_parent_inverse=Matrix.Identity(4)
    paddle.matrix_basis=Matrix.Identity(4)
for image in bpy.data.images:
    if image.source=='FILE' and image.has_data:
        image.pack()
bpy.context.scene.frame_set(8)
bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=24
bpy.context.scene.world.color=(.3,.3,.3)
def light(name,location,energy,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=location
    o.rotation_euler=(Vector((0,0,1.1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Soft_Key',(3,-4,5),450,4)
light('Soft_Fill',(-3,-1,3),260,3)
light('Rim',(1,3,4),400,3)
camera_data=bpy.data.cameras.new('Inspection');camera=bpy.data.objects.new('Inspection',camera_data);bpy.context.collection.objects.link(camera)
camera.location=(2.3,-3.8,2);camera.rotation_euler=(Vector((0,0,1.1))-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=2.2
bpy.context.scene.camera=camera
bpy.context.scene.render.resolution_x=900;bpy.context.scene.render.resolution_y=1000;bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.render.film_transparent=True
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'athlete-master.blend'),compress=True)
report={'source':'MakeHuman CC0 body; original approved rig retained','authoring':'Blender Python via local MCP; original procedural equipment','headBind':head_bind.tolist(),'details':{},'paddleLengthM':1.52,'sourceRigModified':False,'referencePhotosAreTextures':False}
for obj in (cap,hair_obj,paddle):
    obj.data.calc_loop_triangles()
    report['details'][obj.name]={'vertices':len(obj.data.vertices),'triangles':len(obj.data.loop_triangles)}
(QA/'authoring.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))

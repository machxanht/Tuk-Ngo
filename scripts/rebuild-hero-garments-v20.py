"""Continuous anatomical weight transfer for the visibly intersecting V19 vest."""
import bpy,bmesh,importlib.util
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def conformal_vest(source,rig,scene,material):
    """Cut a real vest pattern from the same anatomical surface/weights.

    Nearest triangles on an invented cylinder can switch between the torso and
    upper arm. This surface keeps the original continuous anatomical field.
    """
    bm=bmesh.new();bm.from_mesh(source.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));layer=bm.verts.layers.deform.active
    def data(v):
        weights={source.vertex_groups[i].name:w for i,w in v[layer].items() if source.vertex_groups[i].name in rig.data.bones}
        return (v.co.copy(),v.normal.copy(),weights)
    def mix(a,b,t):
        weights={name:a[2].get(name,0)*(1-t)+b[2].get(name,0)*t for name in set(a[2])|set(b[2])}
        return (a[0].lerp(b[0],t),a[1].lerp(b[1],t).normalized(),weights)
    def neckline(d):
        p=d[0];ratio=(p.x/.085)**2;front=1.31+.10*ratio;back=1.397+.05*ratio;blend=max(0,min(1,(p.y+.08)/.16))
        return front*(1-blend)+back*blend-p.z
    def armhole(d):
        p=d[0];ellipse=((p.y+.025)/.115)**2+((p.z-1.263)/.135)**2-1
        return max(.132-abs(p.x),ellipse*.10)
    fields=[lambda d:d[0].z-.98,lambda d:1.455-d[0].z,lambda d:.242-abs(d[0].x),neckline,armhole,lambda d:.68-sum(w for name,w in d[2].items() if name.startswith('upperarm'))]
    vertices=[];faces=[];weights=[];lookup={}
    for face in bm.faces:
        polygon=[data(v) for v in face.verts]
        for field in fields:
            if not polygon:break
            clipped=[]
            for a,b in zip(polygon,polygon[1:]+polygon[:1]):
                fa,fb=field(a),field(b);inside_a,inside_b=fa>=0,fb>=0
                if inside_a:clipped.append(a)
                if inside_a!=inside_b:
                    lo,hi=0.,1.
                    for _ in range(18):
                        t=(lo+hi)/2
                        if (field(mix(a,b,t))>=0)==inside_a:lo=t
                        else:hi=t
                    clipped.append(mix(a,b,(lo+hi)/2))
            polygon=clipped
        if len(polygon)<3:continue
        indices=[]
        for position,normal,influences in polygon:
            ease=.010 if position.z>1.34 else .014;point=position+normal*ease;key=tuple(round(x,6) for x in point)
            if key not in lookup:lookup[key]=len(vertices);vertices.append(tuple(point));weights.append(influences)
            indices.append(lookup[key])
        if len(set(indices))>=3:faces.append(tuple(dict.fromkeys(indices)))
    bm.free();mesh=bpy.data.meshes.new('Anatomical_Cotton_Vest_V20');mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new('Competition_Tank_Top_Loose',mesh);scene.collection.objects.link(obj);mesh.materials.append(material)
    groups={bone.name:obj.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
    for i,influences in enumerate(weights):
        selected=sorted(influences.items(),key=lambda e:e[1],reverse=True)[:4];total=sum(w for _,w in selected)
        for name,w in selected:groups[name].add([i],w/total,'REPLACE')
    for polygon in mesh.polygons:polygon.use_smooth=True
    obj.parent=rig;modifier=obj.modifiers.new('Anatomical_Skin','ARMATURE');modifier.object=rig
    return obj

def transfer_weights(target,source,rig):
    points=[v.co.copy() for v in source.data.vertices]
    faces=[tuple(p.vertices) for p in source.data.polygons]
    tree=BVHTree.FromPolygons(points,faces)
    groups={bone.name:target.vertex_groups.get(bone.name) or target.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
    for group in target.vertex_groups:group.remove(list(range(len(target.data.vertices))))
    max_distance=0
    for vertex in target.data.vertices:
        point,_,index,distance=tree.find_nearest(vertex.co);max_distance=max(max_distance,distance)
        indices=faces[index][:3];a,b,c=[points[i] for i in indices]
        ab=b-a;ac=c-a;ap=point-a;d00=ab.dot(ab);d01=ab.dot(ac);d11=ac.dot(ac);d20=ap.dot(ab);d21=ap.dot(ac);den=d00*d11-d01*d01
        if abs(den)<1e-20:coefficients=[1,0,0]
        else:
            v=(d11*d20-d01*d21)/den;w=(d00*d21-d01*d20)/den;coefficients=[max(0,1-v-w),max(0,v),max(0,w)]
        weights={}
        for i,coefficient in zip(indices,coefficients):
            for entry in source.data.vertices[i].groups:
                name=source.vertex_groups[entry.group].name
                if name in groups:weights[name]=weights.get(name,0)+entry.weight*coefficient
        selected=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4];total=sum(w for _,w in selected)
        if total<1e-8:raise RuntimeError('No anatomical weights at '+target.name+':'+str(vertex.index))
        for name,weight in selected:groups[name].add([vertex.index],weight/total,'REPLACE')
    return {'vertices':len(target.data.vertices),'maxTransferDistanceM':max_distance,'method':'Nearest triangle barycentric interpolation, normalized top four influences'}

def replace_garments_v20(rig,body,scene):
    path=Path(__file__).with_name('rebuild-hero-garments-v19.py');spec=importlib.util.spec_from_file_location('garments_v19',path);legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
    report=legacy.replace_garments_v19(rig,body,scene)
    previous_shirt=scene.objects['Competition_Tank_Top_Loose'];material=previous_shirt.data.materials[0];bpy.data.objects.remove(previous_shirt,do_unlink=True)
    shirt=conformal_vest(body,rig,scene,material)
    # Source topology is triangulated before transfer so barycentric coordinates
    # refer to a unique anatomical triangle rather than one nearest vertex.
    bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
    armature=next(m for m in shirt.modifiers if m.type=='ARMATURE');shirt.modifiers.remove(armature)
    bpy.context.view_layer.objects.active=shirt
    solid=shirt.modifiers.new('Cotton_Thickness','SOLIDIFY');solid.thickness=.0018;solid.offset=1;solid.use_even_offset=True;bpy.ops.object.modifier_apply(modifier=solid.name)
    armature=shirt.modifiers.new('Anatomical_Skin','ARMATURE');armature.object=rig
    report['shirtWeightTransfer']={'vertices':len(shirt.data.vertices),'method':'Conformal source torso with interpolated original weights; no nearest-arm switching'}
    # The cloth edge is sewn geometry, following the same underlying weights.
    # Four boundary components become thin green binding tubes.
    outer=bmesh.new();outer.from_mesh(shirt.data)
    # A solidified surface has no open edges; use the original tube surface
    # saved by the modifier at the start of the vertex range for clean loops.
    original_count=len(shirt.data.vertices)//2
    edge_adjacency={}
    counts={}
    for polygon in shirt.data.polygons:
        if all(i<original_count for i in polygon.vertices):
            ids=list(polygon.vertices)
            for a,b in zip(ids,ids[1:]+ids[:1]):key=tuple(sorted((a,b)));counts[key]=counts.get(key,0)+1
    for (a,b),count in counts.items():
        if count==1:edge_adjacency.setdefault(a,[]).append(b);edge_adjacency.setdefault(b,[]).append(a)
    remaining=set(edge_adjacency);bindings=[]
    while remaining:
        first=next(iter(remaining));loop=[first];previous=None;current=first
        for _ in range(len(edge_adjacency)+1):
            remaining.discard(current);candidates=[i for i in edge_adjacency[current] if i!=previous]
            if not candidates:break
            next_vertex=candidates[0]
            if next_vertex==first:break
            loop.append(next_vertex);previous,current=current,next_vertex
        if len(loop)<3:continue
        curve=bpy.data.curves.new('Sewn_Cotton_Binding','CURVE');curve.dimensions='3D';curve.bevel_depth=.0025;curve.bevel_resolution=1;curve.resolution_u=1
        spline=curve.splines.new('POLY');spline.points.add(len(loop)-1);spline.use_cyclic_u=True
        for point,index in zip(spline.points,loop):position=shirt.data.vertices[index].co;point.co=(*position,1)
        obj=bpy.data.objects.new('Tank_Top_Sewn_Binding_'+str(len(bindings)),curve);scene.collection.objects.link(obj);curve.materials.append(bpy.data.materials['Green_Ribbed_Binding'])
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
        obj.parent=rig;modifier=obj.modifiers.new('Anatomical_Skin','ARMATURE');modifier.object=rig
        transfer_weights(obj,body,rig)
        for polygon in obj.data.polygons:polygon.use_smooth=True
        bindings.append(obj.name)
    outer.free()
    report['sewnBindings']=bindings;report['clothThicknessM']=.0018
    report['legacyJersey']=report.pop('jersey')
    report['jersey']={'vertices':len(shirt.data.vertices),'stage':'Fitted solidified pattern before contact bake','sewnOpeningBindings':len(bindings)}
    report['fix']='Vest pattern and shoulders share the source anatomical surface and original weights'
    return report

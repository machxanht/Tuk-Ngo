"""Replace only study jersey/shorts; call before motion and contact rebake."""
import bpy,bmesh,math
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree

def replace_garments_v19(rig,body,scene):
    old=bpy.data.objects.get('Competition_Tank_Top_Loose');green=old.data.materials[0]
    shortsold=bpy.data.objects.get('Competition_Shorts_Loose');navy=shortsold.data.materials[0]
    removed=[]
    for o in list(scene.objects):
        if o.name.startswith(('Competition_Tank_Top','Tank_Top_','Competition_Shorts','Shorts_Continuous')):
            removed.append(o.name);bpy.data.objects.remove(o,do_unlink=True)
    kd=KDTree(len(body.data.vertices))
    for v in body.data.vertices:kd.insert(v.co,v.index)
    kd.balance()
    def bind(o,allowed):
        groups={g.name:o.vertex_groups.new(name=g.name) for g in body.vertex_groups if g.name in allowed}
        for v in o.data.vertices:
            _,idx,_=kd.find(v.co);weights={}
            for w in body.data.vertices[idx].groups:
                name=body.vertex_groups[w.group].name
                if name in groups:weights[name]=w.weight
            total=sum(weights.values())
            if total<1e-8:weights={'pelvis':1} if 'pelvis' in groups else {'spine_03':1};total=1
            for name,w in weights.items():groups[name].add([v.index],w/total,'REPLACE')
        o.parent=rig;m=o.modifiers.new('Anatomical_Skin','ARMATURE');m.object=rig
    def mesh(name,v,f,mat):
        d=bpy.data.meshes.new(name);d.from_pydata(v,[],f);d.update();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(mat)
        bm=bmesh.new();bm.from_mesh(d);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
        for p in d.polygons:p.use_smooth=True
        return o
    # Welded single surface, exact strap endpoints, no oscillating hem folds.
    N=96;M=24
    topkeys=[(0,1.305),(.42,1.35),(.66,1.418),(1.0,1.40),(math.pi/2,1.22),(2.14,1.40),(2.48,1.418),(2.72,1.405),(math.pi,1.395)]
    def interp(points,t):
        for (a,x),(b,y) in zip(points,points[1:]):
            if a<=t<=b:u=(t-a)/(b-a);u=u*u*(3-2*u);return x*(1-u)+y*u
        return points[-1][1]
    def point(t,u):
        z=.92+(interp(topkeys,math.acos(math.cos(t)))-.92)*u;rx=interp([(.92,.181),(1.10,.192),(1.30,.222),(1.43,.188)],z);ry=interp([(.92,.140),(1.10,.135),(1.30,.139),(1.43,.095)],z)
        return Vector((math.sin(t)*rx,-.025-math.cos(t)*ry,z))
    v=[tuple(point(i*2*math.pi/N,j/M)) for j in range(M+1) for i in range(N)];f=[]
    for j in range(M):
        for i in range(N):a=j*N+i;b=j*N+(i+1)%N;f.append((a,b,b+N,a+N))
    inner=8;outer=17
    for sign in [1,-1]:
        rows=[]
        for j in range(13):
            row=[]
            for i in range(inner,outer+1):
                front=i if sign==1 else N-i;back=N//2-i if sign==1 else N//2+i
                if j==0:idx=M*N+front
                elif j==12:idx=M*N+back
                else:
                    p=point(i*2*math.pi/N,1).lerp(point(math.pi-i*2*math.pi/N,1),j/12);p.z+=.016*math.sin(math.pi*j/12);p.x*=sign;idx=len(v);v.append(tuple(p))
                row.append(idx)
            rows.append(row)
        for j in range(12):
            for i in range(outer-inner):face=(rows[j][i],rows[j][i+1],rows[j+1][i+1],rows[j+1][i]);f.append(face if sign<0 else face[::-1])
    shirt=mesh('Competition_Tank_Top_Loose',v,f,green)
    bind(shirt,{'pelvis','spine_01','spine_02','spine_03'})
    for group in shirt.vertex_groups:group.remove(list(range(len(shirt.data.vertices))))
    for x in shirt.data.vertices:
        u=max(0,min(1,(x.co.z-1.05)/.23));u=u*u*(3-2*u)
        shirt.vertex_groups['spine_01'].add([x.index],1-u,'REPLACE');shirt.vertex_groups['spine_03'].add([x.index],u,'REPLACE')
    # Closed overlapping volumes unioned before removing waist/leg end caps.
    # This produces a real crotch joining the waistband and both leg openings.
    parts=[]
    for name,cx,rx,ry,z0,z1 in [('Waist',0,.181,.139,.835,.92),('LegL',.095,.119,.125,.60,.88),('LegR',-.095,.119,.125,.60,.88)]:
        verts=[(cx+(rx if name=='Waist' or z==z1 else .089)*math.sin(i*2*math.pi/64),-.025+ry*math.cos(i*2*math.pi/64),z) for z in [z0,z1] for i in range(64)]
        faces=[(i,(i+1)%64,(i+1)%64+64,i+64) for i in range(64)]+[tuple(range(63,-1,-1)),tuple(range(64,128))];parts.append(mesh('Temporary_'+name,verts,faces,navy))
    shorts=parts[0];shorts.name='Competition_Shorts_Loose';bpy.context.view_layer.objects.active=shorts
    for other in parts[1:]:
        mod=shorts.modifiers.new('Crotch_Union','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=other;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(other,do_unlink=True)
    bm=bmesh.new();bm.from_mesh(shorts.data);caps=[face for face in bm.faces if all(abs(x.co.z-.92)<.00001 or abs(x.co.z-.60)<.00001 for x in face.verts)];bmesh.ops.delete(bm,geom=caps,context='FACES');bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(shorts.data);bm.free()
    bind(shorts,{'pelvis','spine_01','thigh_l','thigh_r'})
    # A continuous hip-to-thigh field avoids nearest-surface seam discontinuity
    # where two anatomical legs meet the authored crotch panel.
    for group in shorts.vertex_groups:group.remove(list(range(len(shorts.data.vertices))))
    for x in shorts.data.vertices:
        u=max(0,min(1,(.87-x.co.z)/.22));u=u*u*(3-2*u);side='thigh_l' if x.co.x>=0 else 'thigh_r'
        shorts.vertex_groups['pelvis'].add([x.index],1-u,'REPLACE');shorts.vertex_groups[side].add([x.index],u,'REPLACE')
    # Use the complete licensed anatomical pelvis/thigh surface as the final
    # tailored shell. The visible study body has deliberately deleted crotch
    # faces, so copying it would create real garment holes.
    before=set(scene.objects);source=Path(__file__).resolve().parent.parent/'public/assets/human/makehuman-athlete-base.glb'
    bpy.ops.import_scene.gltf(filepath=str(source));imported=set(scene.objects)-before
    full=max((o for o in imported if o.type=='MESH'),key=lambda o:len(o.data.vertices));shell=full.copy();shell.data=full.data.copy();scene.collection.objects.link(shell);shell.animation_data_clear()
    for modifier in list(shell.modifiers):shell.modifiers.remove(modifier)
    bm=bmesh.new();bm.from_mesh(shell.data)
    layer=bm.verts.layers.deform.active;allowed={g.index for g in shell.vertex_groups if g.name in {'pelvis','spine_01','thigh_l','thigh_r'}}
    bmesh.ops.delete(bm,geom=[face for face in bm.faces if any(sum(w for index,w in vertex[layer].items() if index in allowed)<.5 for vertex in face.verts)],context='FACES')
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    for z,normal in [(.60,(0,0,-1)),(1.00,(0,0,1))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,0,z),plane_no=normal,clear_outer=True,dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    # Remove source UV/material seam duplication before normal offset; otherwise
    # independently offset normals create narrow cracks between surface islands.
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    for vertex in bm.verts:vertex.co+=vertex.normal*.014
    bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(shell.data);bm.free()
    shell.data.materials.clear();shell.data.materials.append(navy);shell.parent=rig;shell.matrix_parent_inverse=rig.matrix_world.inverted();shell.location=(0,0,0);shell.rotation_euler=(0,0,0);shell.scale=(1,1,1)
    # Same MPFB rig and existing anatomical weights; no cross-leg interpolation
    # is introduced at the crotch. Rest coordinates are in rig bind space.
    shell.matrix_parent_inverse.identity();modifier=shell.modifiers.new('Anatomical_Skin','ARMATURE');modifier.object=rig
    bpy.data.objects.remove(shorts,do_unlink=True);shorts=shell;shorts.name='Competition_Shorts_Loose'
    for o in imported:bpy.data.objects.remove(o,do_unlink=True)
    for polygon in shorts.data.polygons:polygon.use_smooth=True
    # Jersey lower edge sits above the pelvis/thigh fold rather than wrapping
    # into the adjacent thigh nearest-point region during seated contact.
    for vertex in shirt.data.vertices:
        if vertex.co.z<1.02:vertex.co.z+=.045*(1-(vertex.co.z-.92)/.10)
    # Preserve print mesh and its existing spine weights; keep back decal clear.
    for o in scene.objects:
        if 'Khmer' in o.name or 'Back_Print' in o.name:
            if o.type=='MESH':
                for x in o.data.vertices:x.co.y+=.008
    def boundaries(o):
        bm=bmesh.new();bm.from_mesh(o.data);edges=[e for e in bm.edges if e.is_boundary];remaining=set(edges);loops=0
        while remaining:
            loops+=1;todo=[remaining.pop()]
            while todo:
                e=todo.pop()
                for vert in e.verts:
                    for linked in vert.link_edges:
                        if linked in remaining:remaining.remove(linked);todo.append(linked)
        report={'vertices':len(bm.verts),'boundaryLoops':loops,'nonManifoldInterior':sum(not e.is_manifold and not e.is_boundary for e in bm.edges)};bm.free();return report
    return {'removed':removed,'jersey':boundaries(shirt),'shorts':boundaries(shorts),'limits':['Contact rebake required','Boundary counts do not prove visual fit','Existing print placement requires back view review']}

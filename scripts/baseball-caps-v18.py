"""Replace only crew cap meshes with fitted six-panel baseball caps.

Usage: python scripts/baseball-caps-v18.py INPUT_GLB OUTPUT_GLB
Works on the shared V17 crew and the eight already-baked team assets. Head
inverse binds place the new geometry; all motion, faces, kits and hull stay intact.
"""
import argparse, copy, hashlib, json, math, struct
from pathlib import Path
import numpy as np

DT = {5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
NC = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

class Mesh:
    def __init__(self):
        self.p=[]; self.n=[]; self.c=[]; self.uv=[]; self.f=[]; self.features={}
    def vertex(self,p,n,color=1,uv=(0,0)):
        i=len(self.p);self.p.append(p);self.n.append(n);self.c.append((color,color,color,1));self.uv.append(uv);return i
    def face(self,a,b,c):
        cross=np.cross(np.subtract(self.p[b],self.p[a]),np.subtract(self.p[c],self.p[a]))
        if np.linalg.norm(cross)<1e-12:return
        if np.dot(cross,np.add(np.add(self.n[a],self.n[b]),self.n[c]))<0:b,c=c,b
        self.f.append((a,b,c))
    def quad(self,a,b,c,d):self.face(a,b,c);self.face(a,c,d)
    def tube(self,points,radius,color=1,sides=3):
        rings=[];points=np.asarray(points)
        for i,p in enumerate(points):
            tangent=points[min(i+1,len(points)-1)]-points[max(i-1,0)];tangent/=np.linalg.norm(tangent)
            ref=np.array([0.,0.,1.]) if abs(tangent[2])<.85 else np.array([0.,1.,0.])
            u=np.cross(tangent,ref);u/=np.linalg.norm(u);v=np.cross(tangent,u)
            ring=[]
            for k in range(sides):
                a=k*math.tau/sides;n=u*math.cos(a)+v*math.sin(a);ring.append(self.vertex(p+radius*n,n,color))
            rings.append(ring)
        for a,b in zip(rings,rings[1:]):
            for k in range(sides):l=(k+1)%sides;self.quad(a[k],a[l],b[l],b[k])
    def finish(self):
        pos=np.asarray(self.p);ix=np.asarray(self.f,dtype=np.uint16);normal=np.zeros_like(pos)
        tri=pos[ix];fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
        for c in range(3):np.add.at(normal,ix[:,c],fn)
        length=np.linalg.norm(normal,axis=1);valid=length>1e-12;normal[valid]/=length[valid,None]
        normal[~valid]=np.asarray(self.n)[~valid]
        return pos,normal,ix,np.asarray(self.uv),np.asarray(self.c)

def cap_geometry(orientation):
    mesh=Mesh();segments=48;rings=8;center_z=.0005
    def crown(theta,t):
        rear=abs((theta-math.pi+math.pi)%math.tau-math.pi)
        opening=.020*math.sqrt(max(0,1-(rear/.48)**2))
        base=.080+.005*math.cos(theta)+opening
        angle=t*math.pi/2;radius=max(0,math.cos(angle))**.76
        # 1 mm fitting allowance clears the measured scalp between vertices,
        # including triangle centres where the first fit touched by 0.016 mm.
        return np.array([.080*radius*math.sin(theta),base+(.159-base)*math.sin(angle)**.87,center_z+.111*radius*math.cos(theta)])
    # Six fabric panels: close-fitting crown and a real rear arch opening.
    rows=[]
    for r in range(rings):
        t=r/rings;row=[]
        for k in range(segments+1):
            theta=math.tau*k/segments;p=crown(theta,t);n=np.array([p[0],max(.004,p[1]-.079),p[2]-center_z])
            row.append(mesh.vertex(p,n,1,(k/segments,t)))
        rows.append(row)
    for a,b in zip(rows,rows[1:]):
        for k in range(segments):mesh.quad(a[k],a[k+1],b[k+1],b[k])
    top=mesh.vertex((0,.159,center_z),(0,1,0))
    for k in range(segments):mesh.face(rows[-1][k],rows[-1][k+1],top)
    # A thin hem instead of the old raised, helmet-like rim.
    mesh.tube([crown(k*math.tau/segments,0) for k in range(segments+1)],.0007,.94)
    for panel in range(6):
        theta=panel*math.pi/3
        points=[]
        for r in range(13):
            p=crown(theta,r/12);n=np.array([p[0],max(.004,p[1]-.079),p[2]-center_z]);n/=np.linalg.norm(n);points.append(p+n*.00055)
        mesh.tube(points,.00045,.84)
    # Curved, closed bill: ~8.3 cm front projection, 1.8 mm thick.
    surfaces=[];columns=24;depths=4
    for underside in [False,True]:
        grid=[]
        for r in range(depths+1):
            t=r/depths;row=[]
            for k in range(columns+1):
                angle=-1.09+2.18*k/columns
                x=(.079+.010*t)*math.sin(angle)
                z=center_z+(.111+.083*t)*math.cos(angle)
                y=crown(angle,0)[1]-.0005-.010*t-.008*t*(x/.088)**2-(.0018 if underside else 0)
                row.append(mesh.vertex((x,y,z),(0,-1 if underside else 1,0),.65 if underside else .97,(k/columns,t)))
            grid.append(row)
        for a,b in zip(grid,grid[1:]):
            for k in range(columns):mesh.quad(a[k],a[k+1],b[k+1],b[k])
        surfaces.append(grid)
    upper,lower=surfaces
    # Separate side-wall vertices keep a crisp, genuinely thin edge.
    boundary=[(depths,k) for k in range(columns+1)]+[(r,columns) for r in range(depths-1,-1,-1)]+[(0,k) for k in range(columns-1,-1,-1)]+[(r,0) for r in range(1,depths)]
    for (r,k),(s,l) in zip(boundary,boundary[1:]+boundary[:1]):
        pts=[mesh.p[upper[r][k]],mesh.p[upper[s][l]],mesh.p[lower[s][l]],mesh.p[lower[r][k]]]
        normal=np.array([pts[0][0],0,pts[0][2]-center_z]);normal/=np.linalg.norm(normal)
        ids=[mesh.vertex(p,normal,.86) for p in pts];mesh.quad(*ids)
    # Short rear adjustable strap; the opening stays visibly open above it.
    strap=[]
    for k in range(13):
        theta=math.pi-.48+.96*k/12;x=.0803*math.sin(theta);z=center_z+.1113*math.cos(theta)
        strap.append([mesh.vertex((x,y,z),(x,0,z-center_z),.84) for y in [.075,.083]])
    for a,b in zip(strap,strap[1:]):mesh.quad(a[0],b[0],b[1],a[1])
    # Small flattened crown button, not a protruding knob.
    circle=[mesh.vertex((.004*math.sin(k*math.tau/12),.1605,center_z+.004*math.cos(k*math.tau/12)),(0,1,0),.9) for k in range(12)]
    button=mesh.vertex((0,.1617,center_z),(0,1,0),.96)
    for k in range(12):mesh.face(circle[k],circle[(k+1)%12],button)
    # Tiny side ventilation holes provide fabric-cap cues in a close portrait.
    for theta in [math.pi/3,2*math.pi/3,4*math.pi/3,5*math.pi/3]:
        p=crown(theta,.30);normal=np.array([p[0],p[1]-.079,p[2]-center_z]);normal/=np.linalg.norm(normal)
        p+=normal*.0008;u=np.cross(normal,np.array([0.,1.,0.]));u/=np.linalg.norm(u);v=np.cross(normal,u)
        dot=mesh.vertex(p,normal,.40);edge=[mesh.vertex(p+.0011*(u*math.sin(k*math.tau/8)+v*math.cos(k*math.tau/8)),normal,.53) for k in range(8)]
        for k in range(8):mesh.face(dot,edge[k],edge[(k+1)%8])
    pos,norm,ix,uv,color=mesh.finish()
    if orientation=='backward':pos[:,[0,2]]*=-1;norm[:,[0,2]]*=-1
    assert np.isfinite(pos).all() and np.isfinite(norm).all()
    return pos,norm,ix,uv,color

def run(src,out):
    raw=Path(src).read_bytes();sz=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+sz]);original=raw[28+sz:];binary=bytearray(original)
    animation=copy.deepcopy(j.get('animations'));skins=copy.deepcopy(j['skins']);nodes_before=copy.deepcopy(j['nodes']);old_materials=copy.deepcopy(j['materials']);records=[]
    def read(i):
        a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt=np.dtype(DT[a['componentType']]);c=NC[a['type']]
        return np.ndarray((a['count'],c),dt,buffer=original,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',c*dt.itemsize),dt.itemsize)).copy()
    def append(arr,typ,component=5126,normalized=False,target=34962):
        arr=np.asarray(arr,dtype=DT[component]);binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(arr.tobytes());vi=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':arr.nbytes,'target':target});ai=len(j['accessors']);a={'bufferView':vi,'componentType':component,'count':len(arr),'type':typ}
        if normalized:a['normalized']=True
        if typ=='VEC3':a.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
        j['accessors'].append(a);return ai
    reachable=set()
    def visit(i):
        if i in reachable:return
        reachable.add(i)
        for c in j['nodes'][i].get('children',[]):visit(c)
    for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i)
    def descendants(i):
        yield i
        for c in j['nodes'][i].get('children',[]):yield from descendants(c)
    actors=[(i,n) for i,n in enumerate(j['nodes']) if i in reachable and n.get('extras',{}).get('component')=='athlete' and n.get('name','').startswith('Athlete_')]
    geometries={orientation:cap_geometry(orientation) for orientation in ['forward','backward']}
    cap_nodes=set();cap_materials=set()
    for actor_i,actor in actors:
        orientation=actor['extras']['capOrientation'];cap=[i for i in descendants(actor_i) if 'Cap_Baseball_LOD' in j['nodes'][i].get('name','') and 'mesh' in j['nodes'][i]]
        assert len(cap)==1,('Expected one consolidated cap',actor['name'],cap)
        node_i=cap[0];node=j['nodes'][node_i];old=j['meshes'][node['mesh']];assert len(old['primitives'])==1
        skin=j['skins'][node['skin']];head=next(k for k,i in enumerate(skin['joints']) if j['nodes'][i].get('name','').split('_')[0]=='head')
        ibm=read(skin['inverseBindMatrices'])[head].reshape(4,4).T;inverse=np.linalg.inv(ibm)
        pos,norm,ix,uv,color=geometries[orientation]
        transformed=(np.c_[pos,np.ones(len(pos))]@inverse.T)[:,:3];normals=norm@ibm[:3,:3];normals/=np.linalg.norm(normals,axis=1)[:,None]
        indices=ix.copy()
        if np.linalg.det(inverse[:3,:3])<0:indices[:,[1,2]]=indices[:,[2,1]]
        joints=np.zeros((len(pos),4),dtype=np.uint16);joints[:,0]=head;weights=np.zeros((len(pos),4),dtype=np.uint8);weights[:,0]=255
        attrs={'POSITION':append(transformed,'VEC3'),'NORMAL':append(normals,'VEC3'),'TEXCOORD_0':append(uv,'VEC2'),'JOINTS_0':append(joints,'VEC4',5123),'WEIGHTS_0':append(weights,'VEC4',5121,True),'COLOR_0':append(np.round(color*255),'VEC4',5121,True)}
        material=old['primitives'][0]['material'];cap_materials.add(material)
        primitive={'attributes':attrs,'indices':append(indices.reshape(-1,1),'SCALAR',5123,False,34963),'material':material,'mode':4}
        node['mesh']=len(j['meshes']);j['meshes'].append({'name':actor['name']+'_Baseball_Cap_V18','primitives':[primitive],'extras':{'capStyleV18':'six-panel baseball cap','orientation':orientation,'billLengthM':.083,'billThicknessM':.0018,'rearOpening':True}})
        cap_nodes.add(node_i);actor.setdefault('extras',{})['capStyleV18']='six-panel baseball cap'
        records.append({'id':actor['extras']['id'],'orientation':orientation,'headJoint':head,'node':node['name'],'vertices':len(pos),'triangles':len(indices),'headLocalBounds':{'min':pos.min(0).tolist(),'max':pos.max(0).tolist()}})
    for index in cap_materials:
        material=j['materials'][index];material['pbrMetallicRoughness']['roughnessFactor']=.92;material['pbrMetallicRoughness']['metallicFactor']=0
    for i,previous in enumerate(nodes_before):
        expected=copy.deepcopy(previous)
        if i in cap_nodes:expected['mesh']=j['nodes'][i]['mesh']
        if any(i==a for a,_ in actors):expected.setdefault('extras',{})['capStyleV18']='six-panel baseball cap'
        assert expected==j['nodes'][i],('Non-cap node mutation',i)
    assert len(records)==55 and j.get('animations')==animation and j['skins']==skins
    assert bytes(binary[:len(original)])==original
    for i,m in enumerate(old_materials):
        expected=copy.deepcopy(m)
        if i in cap_materials:expected['pbrMetallicRoughness'].update(roughnessFactor=.92,metallicFactor=0)
        assert expected==j['materials'][i]
    j['buffers'][0]['byteLength']=len(binary);text=json.dumps(j,separators=(',',':')).encode();text+=b' '*((-len(text))%4);binary.extend(b'\0'*((-len(binary))%4))
    result=struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary
    target=Path(out);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(result)
    report={'input':str(src),'output':str(out),'pass':True,'caps':len(records),'animationSkinAndNonCapNodesPreserved':True,'originalBinPrefixSha256':hashlib.sha256(original).hexdigest(),'bytes':len(result),'records':records}
    target.with_suffix('.caps-v18.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print(json.dumps({k:v for k,v in report.items() if k!='records'}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('output');args=parser.parse_args();run(args.input,args.output)

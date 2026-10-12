"""Bake deterministic adult facial variants without changing rig/animation/body bytes.
Usage: python scripts/athlete-faces-v17.py INPUT_GLB OUTPUT_GLB
Requires numpy. Output belongs outside accepted public assets until visual approval.
"""
import argparse,copy,hashlib,json,struct
from pathlib import Path
import numpy as np
DT={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def run(src,dst):
 raw=Path(src).read_bytes();jl=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+jl]);original=raw[28+jl:];binary=bytearray(original)
 animation=copy.deepcopy(j.get('animations',[]));skins=copy.deepcopy(j.get('skins',[]));report=[]
 def read(ai):
  a=j['accessors'][ai];v=j['bufferViews'][a['bufferView']];dt=np.dtype(DT[a['componentType']]);nc=NC[a['type']]
  return np.ndarray((a['count'],nc),dt,buffer=original,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',nc*dt.itemsize),dt.itemsize)).copy()
 def append(arr,typ):
  arr=np.asarray(arr,dtype='<f4');binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(arr.tobytes());vi=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':arr.nbytes,'target':34962});ai=len(j['accessors']);a={'bufferView':vi,'componentType':5126,'count':len(arr),'type':typ}
  if typ=='VEC3':a.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
  j['accessors'].append(a);return ai
 reachable=set()
 def visit(i):
  if i in reachable:return
  reachable.add(i)
  for c in j['nodes'][i].get('children',[]):visit(c)
 for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i)
 actors=[(i,n) for i,n in enumerate(j['nodes']) if i in reachable and n.get('extras',{}).get('component')=='athlete' and n.get('name','').startswith('Athlete_')]
 def descendants(i):
  yield i
  for c in j['nodes'][i].get('children',[]):yield from descendants(c)
 for actor_i,actor in actors:
  aid=int(actor['extras']['id']);variant=(aid-1)%16;rng=np.random.default_rng(170000+variant);params=rng.uniform(-1,1,7)
  candidates=[j['nodes'][i] for i in descendants(actor_i) if 'mesh' in j['nodes'][i] and 'skin' in j['nodes'][i]]
  for node in candidates:
   oldmesh=j['meshes'][node['mesh']]
   if not any(j['materials'][p.get('material',0)].get('name')=='Skin_CC0_Asian_Male' for p in oldmesh['primitives']):continue
   skin=j['skins'][node['skin']];head=next(k for k,ni in enumerate(skin['joints']) if j['nodes'][ni].get('name')=='head');ibm=read(skin['inverseBindMatrices'])[head].reshape(4,4).T.astype(float);inv=np.linalg.inv(ibm);mesh=copy.deepcopy(oldmesh)
   for prim in mesh['primitives']:
    if j['materials'][prim.get('material',0)].get('name')!='Skin_CC0_Asian_Male':continue
    attrs=prim['attributes'];pos=read(attrs['POSITION']).astype(float);norm=read(attrs['NORMAL']).astype(float);jj=read(attrs['JOINTS_0']);ww=read(attrs['WEIGHTS_0']);hw=np.sum((jj==head)*ww,axis=1)
    q=(np.c_[pos,np.ones(len(pos))]@ibm.T)[:,:3];x,y,z=q.T
    # Leave neck seam and entire cap-contact scalp unchanged. Smooth taper to zero.
    fade=np.clip((y+.064)/.018,0,1)*np.clip((.073-y)/.018,0,1)*np.clip((hw-.72)/.23,0,1)
    def g(cx,cy,cz,sx,sy,sz):return np.exp(-.5*((x-cx)/sx)**2-.5*((y-cy)/sy)**2-.5*((z-cz)/sz)**2)
    jaw=g(0,-.040,.055,.070,.018,.065);cheek=g(0,.005,.065,.070,.025,.040);nose=g(0,.017,.105,.015,.025,.025);brow=g(0,.053,.065,.060,.011,.030);chin=g(0,-.049,.075,.031,.012,.035);ear=g(0,.024,-.015,.090,.035,.040)*(np.abs(x)>.064)
    delta=np.zeros_like(q)
    delta[:,0]=np.sign(x)*(params[0]*.015*jaw+params[1]*.011*cheek+params[5]*.005*ear)+params[6]*.0015*cheek
    delta[:,1]=params[2]*.008*chin+params[4]*.004*brow
    delta[:,2]=params[3]*.013*nose+params[2]*.008*chin+params[4]*.004*brow+params[1]*.003*cheek
    delta*=fade[:,None];out=pos+delta@inv[:3,:3].T;changed=np.linalg.norm(delta,axis=1)>1e-8;out[~changed]=pos[~changed];delta[~changed]=0
    assert np.array_equal(out[~changed],pos[~changed])
    # Recompute geometric normals only near changed vertices, retain original body normals.
    ix=read(prim['indices']).reshape(-1,3).astype(int);tri=out[ix];fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);sums=np.zeros_like(out)
    for c in range(3):np.add.at(sums,ix[:,c],fn)
    touched=np.zeros(len(out),bool);touched[ix[np.any(changed[ix],axis=1)].reshape(-1)]=True
    length=np.linalg.norm(sums,axis=1);valid=touched&(length>1e-12);norm[valid]=sums[valid]/length[valid,None]
    color=np.ones((len(pos),4));tone=rng.uniform(-.06,.06,3);color[:,:3]+=fade[:,None]*tone[None,:]
    # Local subtle brow and beard-shadow contrast; CC0 skin image remains in place.
    browdetail=(g(-.030,.047,.063,.022,.004,.026)+g(.030,.047,.063,.022,.004,.026))
    shadow=(.16*(variant%3==0)*jaw+(.14+.12*(variant%4)/3)*browdetail)*fade
    color[:,:3]*=1-shadow[:,None];color=np.clip(color,0,1)
    attrs['POSITION']=append(out,'VEC3');attrs['NORMAL']=append(norm,'VEC3');attrs['COLOR_0']=append(color,'VEC4')
    report.append({'athleteId':aid,'variant':variant,'changedFaceVertices':int(changed.sum()),'maxDisplacementM':float(np.linalg.norm(delta,axis=1).max()),'unchangedBodyVertices':int((~changed).sum()),'positionAccessor':attrs['POSITION'],'normalAccessor':attrs['NORMAL'],'parameters':params.tolist()})
   for prim in mesh['primitives']:
    mat=j['materials'][prim.get('material',0)]
    if mat.get('name')=='Eyes_Brown_Iris':
     iris=copy.deepcopy(mat);iris['name']='V17_Brown_Iris_'+str(aid);iris['pbrMetallicRoughness']['baseColorFactor']=[.026+.012*(variant%4),.012+.008*(variant%3),.005+.004*(variant%2),1];prim['material']=len(j['materials']);j['materials'].append(iris)
   mesh['name']='V17_Face_Athlete_'+str(aid)+'_Variant_'+str(variant);mesh['extras']={'faceVariantV17':variant,'bakedGeometry':True,'uniqueAthleteGeometry':aid};node['mesh']=len(j['meshes']);j['meshes'].append(mesh);actor['extras']['faceVariantV17']=variant
 assert j.get('animations',[])==animation and j.get('skins',[])==skins
 assert bytes(binary[:len(original)])==original
 assert len(report)==len(actors)==55
 j['buffers'][0]['byteLength']=len(binary);jb=json.dumps(j,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);binary.extend(b'\0'*((-len(binary))%4));result=struct.pack('<III',0x46546c67,2,12+8+len(jb)+8+len(binary))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+binary
 target=Path(dst);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(result);summary={'input':str(src),'output':str(dst),'variants':16,'athletes':55,'originalBinPrefixSha256':hashlib.sha256(original).hexdigest(),'animationAndSkinJsonUnchanged':True,'report':report};target.with_suffix('.faces-v17.json').write_text(json.dumps(summary,indent=2),encoding='utf-8');print(json.dumps({'athletes':55,'variants':16,'changedVertices':sum(r['changedFaceVertices'] for r in report),'maxDisplacementM':max(r['maxDisplacementM'] for r in report),'output':str(target)}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('input_glb');p.add_argument('output_glb');a=p.parse_args();run(a.input_glb,a.output_glb)

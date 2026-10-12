"""Measure skin surface depth at each pupil and align existing ocular meshes.
Usage: python scripts/athlete-faces-v17-eyes.py INPUT_GLB OUTPUT_GLB
No guessed whole-head scaling: per-eye offsets derive from triangle intersections.
"""
import json,struct,copy,argparse
from pathlib import Path
import numpy as np
DT={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'};NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def run(src,out):
 raw=Path(src).read_bytes();sz=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+sz]);original=raw[28+sz:];binary=bytearray(original);animation=copy.deepcopy(j.get('animations'));skins=copy.deepcopy(j['skins']);report=[]
 def read(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt=np.dtype(DT[a['componentType']]);c=NC[a['type']];return np.ndarray((a['count'],c),dt,buffer=original,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',c*dt.itemsize),dt.itemsize)).copy()
 def append(p):
  p=np.asarray(p,dtype='<f4');binary.extend(b'\0'*((-len(binary))%4));off=len(binary);binary.extend(p.tobytes());vi=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':p.nbytes,'target':34962});ai=len(j['accessors']);j['accessors'].append({'bufferView':vi,'componentType':5126,'count':len(p),'type':'VEC3','min':p.min(0).tolist(),'max':p.max(0).tolist()});return ai
 reachable=set()
 def visit(i):
  if i in reachable:return
  reachable.add(i)
  for c in j['nodes'][i].get('children',[]):visit(c)
 for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i)
 for ni in sorted(reachable):
  node=j['nodes'][ni]
  if 'mesh' not in node or 'skin' not in node:continue
  mesh=j['meshes'][node['mesh']];skinprim=next((p for p in mesh['primitives'] if j['materials'][p.get('material',0)].get('name')=='Skin_CC0_Asian_Male'),None);pupilprim=next((p for p in mesh['primitives'] if j['materials'][p.get('material',0)].get('name')=='Eyes_Pupil'),None)
  if skinprim is None or pupilprim is None:continue
  sk=j['skins'][node['skin']];head=next(k for k,i in enumerate(sk['joints']) if j['nodes'][i].get('name')=='head');m=read(sk['inverseBindMatrices'])[head].reshape(4,4).T;inv=np.linalg.inv(m)
  def local(p):return (np.c_[read(p['attributes']['POSITION']),np.ones(j['accessors'][p['attributes']['POSITION']]['count'])]@m.T)[:,:3]
  sq=local(skinprim);a=skinprim['attributes'];hw=((read(a['JOINTS_0'])==head)*read(a['WEIGHTS_0'])).sum(1);ix=read(skinprim['indices']).reshape(-1,3);ix=ix[np.all((hw>.72)[ix],axis=1)];tri=sq[ix];pq=local(pupilprim);offset={}
  v0=tri[:,0];e1=tri[:,1]-v0;e2=tri[:,2]-v0;direction=np.array([0.,0.,-1.]);h=np.cross(np.broadcast_to(direction,e2.shape),e2);det=(e1*h).sum(1);valid=np.abs(det)>1e-12;f=np.zeros_like(det);f[valid]=1/det[valid]
  def surface_at(x,y):
   origin=np.array([x,y,.5]);ss=origin-v0;u=f*(ss*h).sum(1);qq=np.cross(ss,e1);v=f*(qq*direction).sum(1);t=f*(e2*qq).sum(1);ok=valid&(u>=0)&(v>=0)&(u+v<=1)&(t>0);depth=.5-t[ok];return float(depth.max()) if len(depth) else None
  for sign in [-1,1]:
   sel=pq[:,0]*sign>0;center=pq[sel].mean(0);pupilfront=pq[sel,2].max();ys=np.arange(center[1]-.022,center[1]+.010,.0005);depths=[surface_at(center[0],y) for y in ys];safe=[(y,z) for y,z in zip(ys,depths) if z is not None];minimum=min(z for y,z in safe);assert minimum<float(pupilfront)-.001,('No measured orbital aperture',node['name'],sign,minimum)
   # Deep concavity is the actual eye opening, distinct from closed lid/brow.
   band=[y for y,z in safe if z<=minimum+.004];target_y=float(np.mean(band));surface=surface_at(center[0],target_y);shift_y=target_y-float(center[1]);shift_z=max(0,surface+.0008-float(pupilfront));assert abs(shift_y)<.022 and shift_z<.01,('Unexpected orbit correction',shift_y,shift_z)
   offset[sign]=(shift_y,shift_z);report.append({'node':node['name'],'eyeSide':sign,'originalPupilCenterY':float(center[1]),'measuredApertureCenterY':target_y,'verticalOffsetM':shift_y,'pupilFrontHeadLocalZ':float(pupilfront),'skinAtApertureHeadLocalZ':surface,'forwardOffsetM':shift_z,'clearanceM':.0008})
  clone=copy.deepcopy(mesh)
  for prim in clone['primitives']:
   name=j['materials'][prim.get('material',0)].get('name','')
   if not(name.startswith('Eyes_') or name.startswith('V17_Brown_Iris_')):continue
   pos=read(prim['attributes']['POSITION']).astype(float);q=local(prim);delta=np.zeros_like(pos);delta[:,1]=np.where(q[:,0]<0,offset[-1][0],offset[1][0]);delta[:,2]=np.where(q[:,0]<0,offset[-1][1],offset[1][1]);pos+=delta@inv[:3,:3].T;prim['attributes']['POSITION']=append(pos)
  clone['name']=mesh.get('name','')+'_MeasuredEyes';node['mesh']=len(j['meshes']);j['meshes'].append(clone)
 assert len(report)==110;assert j.get('animations')==animation and j['skins']==skins;assert bytes(binary[:len(original)])==original
 j['buffers'][0]['byteLength']=len(binary);txt=json.dumps(j,separators=(',',':')).encode();txt+=b' '*((-len(txt))%4);binary.extend(b'\0'*((-len(binary))%4));result=struct.pack('<III',0x46546c67,2,28+len(txt)+len(binary))+struct.pack('<II',len(txt),0x4e4f534a)+txt+struct.pack('<II',len(binary),0x004e4942)+binary;Path(out).write_bytes(result);Path(out).with_suffix('.eyes.json').write_text(json.dumps(report,indent=2));print('Measured110eyes offsetrange',min(x['forwardOffsetM'] for x in report),max(x['forwardOffsetM'] for x in report))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');a=p.parse_args();run(a.input,a.output)

"""Check delivered crown surfaces against the actual skinned scalp, in head space.

This tests vertex, edge midpoint and triangle-centre clearance on all 55 caps,
plus head-only weights, both orientations, and the new mesh metadata.
"""
import argparse,json,struct
from pathlib import Path
import numpy as np
DT={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

def run(source,output):
    raw=Path(source).read_bytes();sz=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+sz]);binary=raw[28+sz:]
    def read(ai):
        a=j['accessors'][ai];v=j['bufferViews'][a['bufferView']];dt=np.dtype(DT[a['componentType']]);nc=NC[a['type']]
        result=np.ndarray((a['count'],nc),dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',nc*dt.itemsize),dt.itemsize)).copy()
        if a.get('normalized'):result=result.astype(float)/np.iinfo(dt).max
        return result
    def descendants(i):
        yield i
        for c in j['nodes'][i].get('children',[]):yield from descendants(c)
    reachable=set()
    def visit(i):
        if i in reachable:return
        reachable.add(i)
        for c in j['nodes'][i].get('children',[]):visit(c)
    for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i)
    results=[]
    for ai in sorted(reachable):
        actor=j['nodes'][ai]
        if actor.get('extras',{}).get('component')!='athlete':continue
        assert actor['extras']['capStyleV18']=='six-panel baseball cap'
        for ni in descendants(ai):
            node=j['nodes'][ni]
            if 'mesh' not in node or 'skin' not in node:continue
            skin=j['skins'][node['skin']];head=next(k for k,i in enumerate(skin['joints']) if j['nodes'][i]['name'].split('_')[0]=='head')
            ibm=read(skin['inverseBindMatrices'])[head].reshape(4,4).T
            for prim in j['meshes'][node['mesh']]['primitives']:
                pos=read(prim['attributes']['POSITION']);q=(np.c_[pos,np.ones(len(pos))]@ibm.T)[:,:3]
                if j['materials'][prim['material']]['name']=='Skin_CC0_Asian_Male':
                    weights=read(prim['attributes']['WEIGHTS_0']);joints=read(prim['attributes']['JOINTS_0']);hw=np.sum(weights*(joints==head),axis=1);ix=read(prim['indices']).reshape(-1,3);ix=ix[np.all((hw>.5)[ix],axis=1)];scalp=q[ix]
                if 'Cap_Baseball_LOD' in node['name']:
                    mesh=j['meshes'][node['mesh']];assert mesh['extras']['orientation']==actor['extras']['capOrientation'];assert mesh['extras']['billThicknessM']==.0018
                    weights=read(prim['attributes']['WEIGHTS_0']);joints=read(prim['attributes']['JOINTS_0']);assert np.all(weights[:,0]==1) and np.all(weights[:,1:]==0) and np.all(joints[:,0]==head)
                    ix=read(prim['indices']).reshape(-1,3);crown=ix[np.all(ix<393,axis=1)];tri=q[crown]
                    points=np.concatenate([q[:393],tri.mean(1),(tri[:,0]+tri[:,1])/2,(tri[:,1]+tri[:,2])/2,(tri[:,2]+tri[:,0])/2])
                    points=np.unique(np.round(points,8),axis=0)
        origin=np.array([0.,.060,0.]);a=scalp[:,0];e1=scalp[:,1]-a;e2=scalp[:,2]-a;delta=origin-a;qq=np.cross(delta,e1);gaps=[]
        for point in points:
            direction=point-origin;length=np.linalg.norm(direction);direction/=length;h=np.cross(direction,e2);det=(e1*h).sum(1);valid=np.abs(det)>1e-10;f=np.zeros_like(det);f[valid]=1/det[valid];u=f*(delta*h).sum(1);v=f*(qq*direction).sum(1);t=f*(e2*qq).sum(1);ok=valid&(u>=0)&(v>=0)&(u+v<=1)&(t>0)
            if ok.any():gaps.append(float(length-t[ok].max()))
        assert len(gaps)>1000
        results.append({'id':actor['extras']['id'],'orientation':actor['extras']['capOrientation'],'surfaceSamples':len(gaps),'minimumRadialScalpClearanceM':min(gaps),'penetratingSamples':sum(g<0 for g in gaps)})
    report={'pass':len(results)==55 and all(r['penetratingSamples']==0 for r in results),'caps':len(results),'surfaceSamples':sum(r['surfaceSamples'] for r in results),'minimumRadialScalpClearanceM':min(r['minimumRadialScalpClearanceM'] for r in results),'headOnlyWeights':True,'records':results,'limits':'Static scalp/crown clearance; visual animation inspection is also required.'}
    target=Path(output);target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='records'}));assert report['pass']

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('output');args=parser.parse_args();run(args.input,args.output)

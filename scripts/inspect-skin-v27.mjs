import {NodeIO} from '@gltf-transform/core';
import {BufferGeometry,BufferAttribute} from 'three';
const doc=await new NodeIO().read(process.argv[2]||'public/assets/illustrated-v22/athlete-rig-v25.glb');
const report=[];
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
 const mat=p.getMaterial();if(mat?.getName()!=='Painted_Skin_V25')continue;
 const pos=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0'),normal=p.getAttribute('NORMAL'),a=pos.getArray(),u=uv?.getArray(),n=normal?.getArray(),duplicates=new Map();
 const trial=new BufferGeometry();trial.setAttribute('position',new BufferAttribute(new Float32Array(a),3));trial.setIndex(new BufferAttribute(p.getIndices().getArray(),1));trial.computeVertexNormals();const recalculated=trial.attributes.normal.array,newNormals=new Map();
 const ranges={all:[[Infinity,Infinity],[-Infinity,-Infinity]],head:[[Infinity,Infinity],[-Infinity,-Infinity]]};let splitNormalPositions=0,duplicatePositions=0,recalculatedSplitNormalPositions=0;
 for(let i=0;i<pos.getCount();i++){
  for(const key of ['all',...(a[i*3+1]>1.4?['head']:[])])for(let k=0;k<2;k++){ranges[key][0][k]=Math.min(ranges[key][0][k],u?.[i*2+k]??0);ranges[key][1][k]=Math.max(ranges[key][1][k],u?.[i*2+k]??0);}
  const key=Array.from(a.slice(i*3,i*3+3),v=>v.toFixed(5)).join(',');
  if(duplicates.has(key)){duplicatePositions++;const old=duplicates.get(key);if(n&&Math.max(...old.map((v,k)=>Math.abs(v-n[i*3+k])))>.05)splitNormalPositions++;}else duplicates.set(key,n?Array.from(n.slice(i*3,i*3+3)):[]);
  if(newNormals.has(key)){if(Math.max(...newNormals.get(key).map((v,k)=>Math.abs(v-recalculated[i*3+k])))>.05)recalculatedSplitNormalPositions++;}else newNormals.set(key,Array.from(recalculated.slice(i*3,i*3+3)));
 }
 report.push({mesh:mesh.getName(),vertices:pos.getCount(),triangles:p.getIndices().getCount()/3,uvPresent:!!uv,uv:ranges,duplicatePositions,splitNormalPositions,recalculatedSplitNormalPositions,positionMin:pos.getMin([]),positionMax:pos.getMax([])});trial.dispose();
}
console.log(JSON.stringify(report,null,2));

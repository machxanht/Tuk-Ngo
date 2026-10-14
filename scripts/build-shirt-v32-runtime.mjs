// Original GLB endpoint correspondence for a separate shirt GPU skin shader.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import * as T from 'three';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(repo,'public/assets/illustrated-v22/athlete-rig-v27.glb'),bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
function read(id){
 const a=json.accessors[id],view=json.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],width={5126:4,5123:2,5125:4,5121:1}[a.componentType],method={5126:'getFloat32',5123:'getUint16',5125:'getUint32',5121:'getUint8'}[a.componentType],d=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
 return Array.from({length:a.count},(_,i)=>Array.from({length:size},(_,k)=>d[method]((view.byteOffset||0)+(a.byteOffset||0)+i*(view.byteStride||size*width)+k*width,true)));
}
const node=json.nodes.find(n=>n.name==='Athlete_Study_Anatomy_CC0'),prim=json.meshes[node.mesh].primitives[0],skin=json.skins[node.skin],jointNames=skin.joints.map(i=>json.nodes[i].name),positions=read(prim.attributes.POSITION),normals=read(prim.attributes.NORMAL),jointIndices=read(prim.attributes.JOINTS_0),jointWeights=read(prim.attributes.WEIGHTS_0),faces=read(prim.indices).flat(),inverses=read(skin.inverseBindMatrices);
assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale,'Source anatomy requires bind transform application');
const arms={};for(const s of ['l','r']){const a=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(inverses[jointNames.indexOf('upperarm_'+s)]).invert()),b=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(inverses[jointNames.indexOf('lowerarm_'+s)]).invert());arms[s]={start:a,axis:b.sub(a)};}
function original(i){return {position:new T.Vector3().fromArray(positions[i]),bary:new Map([[i,1]])};}
function mix(a,b,t){const bary=new Map();for(const [i,w] of a.bary)bary.set(i,(bary.get(i)||0)+w*(1-t));for(const [i,w] of b.bary)bary.set(i,(bary.get(i)||0)+w*t);return {position:a.position.clone().lerp(b.position,t),bary};}
function neck(r){const p=r.position,front=1.31+.10*(p.x/.085)**2,back=1.397+.05*(p.x/.085)**2,blend=Math.max(0,Math.min(1,(-p.z+.08)/.16));return front*(1-blend)+back*blend-p.y;}
function cuff(r,s){const p=r.position,arm=arms[s],sign=s==='l'?1:-1;return Math.max(Math.min(.24-Math.abs(p.x),1.12-p.y),.10-p.x*sign,(.72-p.clone().sub(arm.start).dot(arm.axis)/arm.axis.lengthSq())*arm.axis.length());}
const fields=[r=>r.position.y-.98,neck,r=>cuff(r,'l'),r=>cuff(r,'r')],vertices=[],indices=[],lookup=new Map();
function emit(r){
 const key=r.position.toArray().map(v=>v.toFixed(7)).join(',');if(lookup.has(key))return lookup.get(key);
 const endpoints=[...r.bary].filter(([,w])=>w>1e-9).map(([sourceVertex,baryWeight])=>({sourceVertex,baryWeight,position:positions[sourceVertex],normal:normals[sourceVertex],jointIndices:jointIndices[sourceVertex],jointWeights:jointWeights[sourceVertex]}));
 assert(endpoints.length<=3);assert(Math.abs(endpoints.reduce((sum,e)=>sum+e.baryWeight,0)-1)<1e-6);
 const p=new T.Vector3(),normal=new T.Vector3();for(const e of endpoints){const n=new T.Vector3().fromArray(e.normal);normal.addScaledVector(n,e.baryWeight);p.addScaledVector(new T.Vector3().fromArray(e.position).addScaledVector(n,.0055),e.baryWeight);}
 const side=r.position.x>=0?'l':'r',arm=arms[side],along=r.position.clone().sub(arm.start).dot(arm.axis)/arm.axis.lengthSq();
 const sleeveMix=Math.abs(r.position.x)>.13?T.MathUtils.smoothstep(along,.02,.18):0;
 const index=vertices.length;lookup.set(key,index);vertices.push({position:p.toArray(),normal:normal.normalize().toArray(),uv:[r.position.x+.5,(r.position.y-.98)/.5],sleeveMix,endpoints});return index;
}
for(let f=0;f<faces.length;f+=3){
 let poly=faces.slice(f,f+3).map(original);
 for(const field of fields){
  const clipped=[];for(let k=0;k<poly.length;k++){
   const a=poly[k],b=poly[(k+1)%poly.length],fa=field(a),fb=field(b);if(fa>=0)clipped.push(a);
   if((fa>=0)!==(fb>=0)){let lo=0,hi=1;for(let step=0;step<26;step++){const t=(lo+hi)/2;if((field(mix(a,b,t))>=0)===(fa>=0))lo=t;else hi=t;}clipped.push(mix(a,b,(lo+hi)/2));}
  }poly=clipped;if(!poly.length)break;
 }
 for(let k=1;k<poly.length-1;k++){const triangle=[poly[0],poly[k],poly[k+1]],a=triangle[0].position,b=triangle[1].position.clone().sub(a),c=triangle[2].position.clone().sub(a);if(b.cross(c).lengthSq()>1e-16)indices.push(...triangle.map(emit));}
}
const edges=new Map(),adj=new Map();for(let k=0;k<indices.length;k+=3)for(let j=0;j<3;j++){const a=indices[k+j],b=indices[k+(j+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a);}
const boundary=new Map();for(const [key,count] of edges){assert(count<=2);if(count===1){const [a,b]=key.split(',').map(Number);if(!boundary.has(a))boundary.set(a,[]);if(!boundary.has(b))boundary.set(b,[]);boundary.get(a).push(b);boundary.get(b).push(a);}}
assert([...boundary.values()].every(n=>n.length===2));
function components(graph){let count=0,remaining=new Set(graph.keys());while(remaining.size){count++;const stack=[remaining.values().next().value];remaining.delete(stack[0]);while(stack.length)for(const n of graph.get(stack.pop()))if(remaining.delete(n))stack.push(n);}return count;}
const topology={vertices:vertices.length,triangles:indices.length/3,components:components(adj),boundaryLoops:components(boundary),nonmanifoldEdges:0};assert(topology.components===1&&topology.boundaryLoops===4);
const data={version:32,source:'athlete-rig-v27.glb',sourceSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),axes:'glTF Y-up; bow +Z (Blender -Y); bind coordinates of original GLB anatomical mesh',normalOffsetM:.0055,jointNames,topology,indices,vertices};
for(const v of vertices)for(const e of v.endpoints){assert.deepEqual(e.position,positions[e.sourceVertex]);assert.deepEqual(e.jointWeights,jointWeights[e.sourceVertex]);assert(Math.abs(e.jointWeights.reduce((a,b)=>a+b,0)-1)<1e-4);}
const dir=path.resolve(repo,'../asset-studio/garment-v32');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'shirt-runtime-original-glb.json'),JSON.stringify(data));console.log(JSON.stringify({topology,sourceSHA256:data.sourceSHA256,sourceEndpointValidation:'exact original GLB positions/normals/joint indices/weights',maxEndpoints:Math.max(...vertices.map(v=>v.endpoints.length))},null,2));

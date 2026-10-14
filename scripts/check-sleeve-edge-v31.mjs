import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
globalThis.window={};
const {shortSleeves}=await import('../src/race/hybrid-team-style-v28.mjs');
const bytes=fs.readFileSync(new URL('../public/assets/illustrated-v22/athlete-rig-v27.glb',import.meta.url));
const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength)),bin=bytes.subarray(28+jsonLength);
function accessor(id){
 const a=gltf.accessors[id],view=gltf.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
 const Type={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType],length=a.count*size;
 const array=new Type(length),stride=view.byteStride||size*Type.BYTES_PER_ELEMENT;
 const d=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),read={5126:'getFloat32',5123:'getUint16',5125:'getUint32',5121:'getUint8'}[a.componentType];
 for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)array[i*size+k]=d[read]((view.byteOffset||0)+(a.byteOffset||0)+i*stride+k*Type.BYTES_PER_ELEMENT,true);
 return new T.BufferAttribute(array,size,a.normalized||false);
}
const node=gltf.nodes.find(n=>n.name==='Athlete_Study_Anatomy_CC0'),primitive=gltf.meshes[node.mesh].primitives[0],body=new T.BufferGeometry();
for(const [name,key] of Object.entries({position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',skinIndex:'JOINTS_0',skinWeight:'WEIGHTS_0'}))body.setAttribute(name,accessor(primitive.attributes[key]));
body.setIndex(accessor(primitive.indices));
const skin=gltf.skins[node.skin],jointNames=skin.joints.map(id=>gltf.nodes[id].name),inverse=accessor(skin.inverseBindMatrices),boneInverses=skin.joints.map((_,i)=>new T.Matrix4().fromArray(inverse.array,i*16));
const sleeve=shortSleeves(body,jointNames,{boneInverses}),position=sleeve.getAttribute('position'),weights=sleeve.getAttribute('skinWeight'),joints=sleeve.getAttribute('skinIndex');
assert(position.count>0);let intersections=0,maxCuffDeviation=0,maxPosedDistance=0,maxCorrectedDistance=0;
for(const attribute of Object.values(sleeve.attributes))for(const v of attribute.array)assert(Number.isFinite(v));
for(let i=0;i<position.count;i++){
 let total=0;for(let k=0;k<4;k++){assert(weights.getComponent(i,k)>=0);assert(joints.getComponent(i,k)<jointNames.length);total+=weights.getComponent(i,k);}assert(Math.abs(total-1)<1e-5);
 if(sleeve.userData.sourceBarycentric[i].length>1){
  intersections++;const p=new T.Vector3().fromBufferAttribute(position,i),side=p.x>0?'l':'r';
  const a=new T.Vector3().setFromMatrixPosition(boneInverses[jointNames.indexOf('upperarm_'+side)].clone().invert()),b=new T.Vector3().setFromMatrixPosition(boneInverses[jointNames.indexOf('lowerarm_'+side)].clone().invert()),axis=b.sub(a);
  maxCuffDeviation=Math.max(maxCuffDeviation,Math.abs(p.sub(a).dot(axis)/axis.lengthSq()-sleeve.userData.fit.cuffAlong)*axis.length());
 }
}
assert(intersections>0);assert(maxCuffDeviation<1e-6);
function skinned(geometry,i,matrices){const p=new T.Vector3().fromBufferAttribute(geometry.attributes.position,i),out=new T.Vector3();for(let k=0;k<4;k++){const weight=geometry.attributes.skinWeight.getComponent(i,k);if(weight)out.addScaledVector(p.clone().applyMatrix4(matrices[geometry.attributes.skinIndex.getComponent(i,k)]),weight);}return out;}
for(const angle of [-1.1,-.5,0,.5,1.1]){
 const matrices=jointNames.map((name,i)=>{
  if(!/upperarm|lowerarm|clavicle/.test(name))return new T.Matrix4();
  const pivot=new T.Vector3().setFromMatrixPosition(boneInverses[i].clone().invert()),rotation=new T.Matrix4().makeRotationZ(angle*(name.endsWith('_l')?1:-1)*(/clavicle/.test(name)?.2:1));
  return new T.Matrix4().makeTranslation(...pivot).multiply(rotation).multiply(new T.Matrix4().makeTranslation(...pivot.clone().negate()));
 });
 for(let i=0;i<position.count;i++){
  const reference=new T.Vector3();for(const [source,amount] of sleeve.userData.sourceBarycentric[i])reference.addScaledVector(skinned(body,source,matrices),amount);
  maxPosedDistance=Math.max(maxPosedDistance,skinned(sleeve,i,matrices).distanceTo(reference));
  const corrected=new T.Vector3();for(const [source,amount]of sleeve.userData.sourceBarycentric[i]){const point=new T.Vector3().fromBufferAttribute(body.attributes.position,source).addScaledVector(new T.Vector3().fromBufferAttribute(body.attributes.normal,source),.0045),out=new T.Vector3();for(let k=0;k<4;k++)out.addScaledVector(point.clone().applyMatrix4(matrices[body.attributes.skinIndex.getComponent(source,k)]),body.attributes.skinWeight.getComponent(source,k));corrected.addScaledVector(out,amount);}maxCorrectedDistance=Math.max(maxCorrectedDistance,corrected.distanceTo(reference));
 }
}
assert(maxCorrectedDistance<.006,`Corrected correspondence ${maxCorrectedDistance} >= 6mm`);
console.log(JSON.stringify({vertices:position.count,triangles:sleeve.index.count/3,intersections,maxCuffDeviationM:maxCuffDeviation,maxNaiveInterpolatedDistanceM:maxPosedDistance,maxCorrectedPosedDistanceM:maxCorrectedDistance,maxDiscardedWeight:sleeve.userData.fit.maxDiscardedWeight},null,2));

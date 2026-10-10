import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {pathToFileURL} from 'node:url';

// Bake the licensed anatomical source into GPU crowd poses. No image generation.
const meshoptPath=process.argv[2];
if(!meshoptPath)throw Error('Pass the installed meshoptimizer/meshopt_simplifier.module.js path');
const {MeshoptSimplifier}=await import(pathToFileURL(meshoptPath));await MeshoptSimplifier.ready;
const bytes=await fs.readFile('public/assets/human/makehuman-athlete-base.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene;root.updateMatrixWorld(true);let skin;const bones=new Map();
root.traverse(o=>{if(o.isSkinnedMesh)skin=o;if(o.isBone)bones.set(o.name,o);});
const original=skin.geometry,p=original.attributes.position,j=original.attributes.skinIndex,w=original.attributes.skinWeight;
// Weld physical seams for simplification; keep source weights on retained vertices.
const welded=new Map(),ids=[],remap=[];
for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e6)).join(',');if(!welded.has(key)){welded.set(key,ids.length);ids.push(i);}remap.push(welded.get(key));}
const pos=Float32Array.from(ids.flatMap(i=>[p.getX(i),p.getY(i),p.getZ(i)]));
const indices=Uint32Array.from(original.index.array,i=>remap[i]);
const preset=new Map([...bones.values()].map(b=>[b,b.quaternion.clone()]));
const V=(x,y,z)=>new T.Vector3(x,y,z),wp=o=>o.getWorldPosition(V(0,0,0)),wq=o=>o.getWorldQuaternion(new T.Quaternion());
function setQ(b,q){b.quaternion.copy(wq(b.parent).invert().multiply(q));b.updateWorldMatrix(false,true);}
function point(b,child,dir){setQ(b,new T.Quaternion().setFromUnitVectors(wp(child).sub(wp(b)).normalize(),dir.clone().normalize()).multiply(wq(b)));}
function frame(x,y){y=y.clone().normalize();x=x.clone().addScaledVector(y,-x.dot(y)).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,x.clone().cross(y).normalize()));}
const arms=['l','r'].map((suffix,i)=>{
 const upper=bones.get('upperarm_'+suffix),elbow=bones.get('lowerarm_'+suffix),hand=bones.get('hand_'+suffix),palm=bones.get('middle_01_'+suffix).position.clone().multiplyScalar(.57);
 const ud=wp(elbow).sub(wp(upper)).normalize(),fd=wp(hand).sub(wp(elbow)).normalize(),hinge=ud.clone().cross(fd).normalize();
 return {side:i?1:-1,upper,elbow,hand,palm,ul:wp(elbow).distanceTo(wp(upper)),fl:wp(hand).distanceTo(wp(elbow)),uf:frame(hinge.clone().applyQuaternion(wq(upper).invert()),ud.clone().applyQuaternion(wq(upper).invert())),ff:frame(hinge.clone().applyQuaternion(wq(elbow).invert()),fd.clone().applyQuaternion(wq(elbow).invert())),hf:frame(V(1,0,0),palm)};
});
function reach(a,target){
 const origin=wp(a.upper),delta=target.clone().sub(origin),d=Math.min(delta.length(),a.ul+a.fl+a.palm.length()-.005),axis=delta.normalize(),fl=a.fl+a.palm.length();
 const along=(a.ul*a.ul-fl*fl+d*d)/(2*d),height=Math.sqrt(Math.max(0,a.ul*a.ul-along*along));
 const pole=V(a.side*.5,-.8,-.3).addScaledVector(axis,-V(a.side*.5,-.8,-.3).dot(axis)).normalize(),elbow=origin.clone().addScaledVector(axis,along).addScaledVector(pole,height),ud=elbow.clone().sub(origin).normalize(),fd=origin.clone().addScaledVector(axis,d).sub(elbow).normalize(),hinge=ud.clone().cross(fd).normalize();
 setQ(a.upper,frame(hinge,ud).multiply(a.uf.clone().invert()));setQ(a.elbow,frame(hinge,fd).multiply(a.ff.clone().invert()));setQ(a.hand,frame(hinge,fd).multiply(a.hf.clone().invert()));
}
const baseHip=wp(bones.get('pelvis')).y,rootY=root.position.y,frames=16,activities=3;
function pose(activity,t){
 root.position.y=rootY;for(const [b,q]of preset)b.quaternion.copy(q);root.updateMatrixWorld(true);
 if(activity===2){for(const s of ['l','r']){const foot=bones.get('foot_'+s),q=wq(foot);point(bones.get('thigh_'+s),bones.get('calf_'+s),V(0,-.08,1));point(bones.get('calf_'+s),foot,V(0,-1,.06));setQ(foot,q);}root.position.y+=.59-baseHip;}
 root.updateMatrixWorld(true);
 const seated=activity===2,hipDelta=seated?.59-baseHip:0,phase=t*Math.PI*2;
 for(const a of arms){
  const target=activity===0?V(a.side*(.44+.055*Math.sin(phase)),1.77+.14*Math.sin(phase+a.side*.4),.12+.12*Math.cos(phase)):
   V(a.side*(.035+.17*(.5+.5*Math.cos(phase*2))),1.31+hipDelta+.035*Math.sin(phase),.43);
  reach(a,target);
 }
 root.updateMatrixWorld(true);skin.skeleton.update();
}
const levels=[];
for(const [name,target,error]of [['near',1800,.014],['far',320,.035]]){
 const [simple,deviation]=MeshoptSimplifier.simplify(indices,pos,3,target*3,error);
 const used=[...new Set(simple)],compact=new Map(used.map((id,i)=>[id,i])),g=new T.BufferGeometry();
 for(const attr of ['position','skinIndex','skinWeight']){const source=original.attributes[attr],array=attr==='skinIndex'?new Uint16Array(used.length*source.itemSize):new Float32Array(used.length*source.itemSize);for(let k=0;k<used.length;k++){const id=ids[used[k]];for(let n=0;n<source.itemSize;n++)array[k*source.itemSize+n]=source[['getX','getY','getZ','getW'][n]](id);}g.setAttribute(attr,new T.BufferAttribute(array,source.itemSize));}
 g.setIndex(Array.from(simple,i=>compact.get(i)));skin.geometry=g;
 const region=used.map(id=>{const i=ids[id],y=p.getY(i),x=p.getX(i),z=p.getZ(i);let upper=0;for(let n=0;n<4;n++){const bn=skin.skeleton.bones[j[['getX','getY','getZ','getW'][n]](i)].name;if(bn.includes('upperarm'))upper+=w[['getX','getY','getZ','getW'][n]](i);}return y<.075?4:y<.97?2:y>1.638||y>1.60&&z<.10?3:y<1.405&&(Math.abs(x)<.24||upper>.65)?1:0;});
 const data=new Float32Array(used.length*activities*frames*6),baked=new T.BufferGeometry();baked.setIndex(g.index);
 for(let activity=0;activity<activities;activity++)for(let f=0;f<frames;f++){
  pose(activity,f/frames);const values=new Float32Array(used.length*3);
  for(let i=0;i<used.length;i++){const v=V(0,0,0).fromBufferAttribute(g.attributes.position,i);skin.applyBoneTransform(i,v).applyMatrix4(skin.matrixWorld);values.set(v.toArray(),i*3);}
  baked.setAttribute('position',new T.BufferAttribute(values,3));baked.computeVertexNormals();const normals=baked.attributes.normal.array,offset=(activity*frames+f)*used.length*6;
  for(let i=0;i<used.length;i++){data.set(values.subarray(i*3,i*3+3),offset+i*6);data.set(normals.subarray(i*3,i*3+3),offset+i*6+3);}
 }
 const out='public/assets/human/crowd-'+name+'.bin';await fs.writeFile(out,Buffer.from(data.buffer));
 const meta={vertices:used.length,triangles:simple.length/3,frames,activities,indices:Array.from(g.index.array),region,deviation,binary:'crowd-'+name+'.bin',source:'MakeHuman/MPFB via Innerscene, CC0',poses:['standing cheer','standing clap','seated clap']};
 await fs.writeFile('public/assets/human/crowd-'+name+'.json',JSON.stringify(meta));levels.push({...meta,indices:undefined,region:undefined,bytes:data.byteLength});
}
await fs.writeFile('docs/qa/crowd-bake-v8.json',JSON.stringify({levels,source:'makehuman-athlete-base.glb',animation:'Authored poses, not captured motion'},null,2)+'\n');console.log(JSON.stringify(levels));

import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {rowingPose} from '../src/race/rowing-pose.mjs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {textureCompress,dedup,prune} from '@gltf-transform/functions';
import sharp from 'sharp';

const base='public/assets/character-comparison/';
function load(raw){const n=raw.readUInt32LE(12);return {doc:JSON.parse(raw.subarray(20,20+n)),bin:raw.subarray(28+n,28+n+raw.readUInt32LE(20+n))};}
function accessor(doc,bin,id){const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];return new Float32Array(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*16);}
function context(doc,bin){
 const skin=doc.skins[0],jointSet=new Set(skin.joints),inverse=accessor(doc,bin,skin.inverseBindMatrices);
 const nodes=doc.nodes.map((n,i)=>{const o=jointSet.has(i)?new T.Bone():new T.Object3D();o.name=n.name||'';if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});
 doc.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
 const root=new T.Group();for(const i of doc.scenes[doc.scene||0].nodes)root.add(nodes[i]);root.updateMatrixWorld(true);
 const skeleton=new T.Skeleton(skin.joints.map(i=>nodes[i]),skin.joints.map((_,i)=>new T.Matrix4().fromArray(inverse,i*16)));
 return {root,nodes,skeleton,paddle:nodes.find(n=>n.name==='ComparisonPaddle')};
}
for(const model of ['d','f']){
 const raw=await readFile('../tools/asset-cache/character-comparison/compiled/'+model+'.glb'),{doc,bin}=load(raw),master=context(doc,bin),bones=Object.fromEntries(master.skeleton.bones.map(b=>[b.name,b]));
 const initial=master.nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()}));
 const chunks=[Buffer.from(bin)],lengths={bytes:bin.length};doc.animations=[];
 function attribute(values,type){
  const pad=(4-lengths.bytes%4)%4;if(pad){chunks.push(Buffer.alloc(pad));lengths.bytes+=pad;}
  const array=Float32Array.from(values),view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:lengths.bytes,byteLength:array.byteLength});chunks.push(Buffer.from(array.buffer));lengths.bytes+=array.byteLength;
  const a={bufferView:view,componentType:5126,type,count:array.length/({SCALAR:1,VEC3:3,VEC4:4}[type])};if(type==='SCALAR'&&array.length){a.min=[Math.min(...array)];a.max=[Math.max(...array)];}doc.accessors.push(a);return doc.accessors.length-1;
 }
 const reset=()=>{master.nodes.forEach((n,i)=>{n.position.copy(initial[i].p);n.quaternion.copy(initial[i].q);n.scale.copy(initial[i].s);});master.root.updateMatrixWorld(true);};
 const worldTurn=(bone,angle)=>{const q=bone.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),angle));bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateMatrixWorld(true);};
 const times=Array.from({length:97},(_,i)=>i/96*1.2);
 const measurements=[];
 for(const posture of ['seated','standing']){
  reset();const options={role:'rower',posture:posture==='kneeling'?'standing':'seated',side:-1};
  const apply=rowingPose(master,options),records=new Map();
  const animated=[...master.skeleton.bones,master.paddle];
  for(let frame=0;frame<times.length;frame++){
   reset();const phase=frame/96;
   if(posture!=='standing'){
    const pelvis=bones.pelvis.getWorldPosition(new T.Vector3()),rootBone=bones.root;
    rootBone.position.y+=(posture==='seated'?.55:.70)-pelvis.y;master.root.updateMatrixWorld(true);
    const bend=.12+.08*Math.sin(phase*Math.PI*2-.4);
    worldTurn(bones.spine_01,bend*.45);worldTurn(bones.spine_02,bend*.35);worldTurn(bones.spine_03,bend*.20);worldTurn(bones.neck_01,-bend*.35);
    apply(phase);
    // Curl in the palm's anatomical plane; local X differs between the source rigs.
    const point=n=>bones[n].getWorldPosition(new T.Vector3()),shaft=master.paddle.getWorldPosition(new T.Vector3()),shaftAxis=new T.Vector3(0,1,0).applyQuaternion(master.paddle.getWorldQuaternion(new T.Quaternion()));
    for(const side of ['l','r']){
     const across=point('index_01_'+side).sub(point('pinky_01_'+side)).normalize(),origin=point('middle_01_'+side),direction=point('middle_02_'+side).sub(origin).normalize();
     const toward=shaft.clone().addScaledVector(shaftAxis,origin.clone().sub(shaft).dot(shaftAxis)).sub(origin),sign=Math.sign(across.clone().cross(direction).dot(toward))||1;
     for(const finger of ['index','middle','ring','pinky'])for(const [i,angle]of [[1,.55],[2,1.05],[3,.70]]){
      const bone=bones[finger+'_0'+i+'_'+side],q=bone.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(across,sign*angle));
      bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateMatrixWorld(true);
     }
    }
   }else{
    // A relaxed display stance, leaving the same anatomical proportions.
    for(const [name,sign]of [['upperarm_l',1],['upperarm_r',-1]]){
     const bone=bones[name],rest=bone.getWorldQuaternion(new T.Quaternion()),direction=bones['lowerarm_'+name.at(-1)].getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize();
     const target=new T.Vector3(sign*.30,-.92,.12).normalize(),q=new T.Quaternion().setFromUnitVectors(direction,target).multiply(rest);
     bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateMatrixWorld(true);
    }
    master.paddle.position.set(.48,.0,.1);master.paddle.quaternion.identity();master.paddle.scale.set(0,0,0);
   }
   master.root.updateMatrixWorld(true);
   for(const node of animated){const id=master.nodes.indexOf(node);for(const [prop,path,size]of [['position','translation',3],['quaternion','rotation',4],['scale','scale',3]]){
    const key=id+':'+path;if(!records.has(key))records.set(key,{id,path,size,values:[]});node[prop].toArray(records.get(key).values,records.get(key).values.length);
   }}
   if(posture!=='standing')measurements.push({posture,phase,head: bones.head.getWorldPosition(new T.Vector3()).toArray(),leftHand:bones.hand_l.getWorldPosition(new T.Vector3()).toArray(),rightHand:bones.hand_r.getWorldPosition(new T.Vector3()).toArray()});
  }
  const animation={name:posture,samplers:[],channels:[]};
  for(const record of records.values()){
   let constant=true;for(let i=record.size;i<record.values.length;i++)if(Math.abs(record.values[i]-record.values[i%record.size])>1e-6){constant=false;break;}
   const input=constant?[times[0],times.at(-1)]:times,output=constant?[...record.values.slice(0,record.size),...record.values.slice(0,record.size)]:record.values;
   animation.channels.push({sampler:animation.samplers.length,target:{node:record.id,path:record.path}});
   animation.samplers.push({input:attribute(input,'SCALAR'),output:attribute(output,record.size===4?'VEC4':'VEC3'),interpolation:'LINEAR'});
  }
  doc.animations.push(animation);
 }
 if(model==='f'){
  const animation={name:'facial-demo',samplers:[],channels:[]};
  for(const [id,node]of doc.nodes.entries()){
   const mesh=doc.meshes?.[node.mesh],names=mesh?.extras?.targetNames;if(!names?.length)continue;
   const faceTimes=[0,.7,1.1,1.8,2.2,2.5,2.8,3.5,4.2],values=[];
   for(const t of faceTimes)for(const name of names)values.push(name==='Smile'?(t>=.7&&t<=1.8?1:0):name==='Effort'?(t>=2.8&&t<=3.5?.85:0):name==='Blink'&&t===2.5?1:0);
   animation.channels.push({sampler:animation.samplers.length,target:{node:id,path:'weights'}});
   animation.samplers.push({input:attribute(faceTimes,'SCALAR'),output:attribute(values,'SCALAR'),interpolation:'LINEAR'});
  }
  doc.animations.push(animation);
 }
 doc.asset.generator='Tuk Ngo D/F character comparison: original characters, shared rowing IK, baked Snow facial pose assets';
 doc.buffers=[{byteLength:lengths.bytes}];const json=Buffer.from(JSON.stringify(doc)),padding=Buffer.alloc((4-json.length%4)%4,32),binary=Buffer.concat(chunks),padBin=Buffer.alloc((4-binary.length%4)%4),header=Buffer.alloc(20),bh=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+padding.length+binary.length+padBin.length,8);header.writeUInt32LE(json.length+padding.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length+padBin.length);bh.writeUInt32LE(0x004e4942,4);
 const output=Buffer.concat([header,json,padding,bh,binary,padBin]);await writeFile(base+model+'.glb',output);
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),portable=await io.read(base+model+'.glb');
 for(const mesh of portable.getRoot().listMeshes())for(const primitive of mesh.listPrimitives())if(!primitive.getMaterial()?.getNormalTexture())primitive.setAttribute('TANGENT',null);
 await portable.transform(dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:91}),prune({keepAttributes:true}));
 await io.write(base+model+'.glb',portable);
 const final=await readFile(base+model+'.glb');
 await writeFile(`docs/qa/character-comparison/${model}-motion.json`,JSON.stringify({model,sourceMotion:'src/race/rowing-pose.mjs',framesPerCycle:97,cycleSeconds:1.2,animations:doc.animations.map(a=>a.name),sha256:createHash('sha256').update(final).digest('hex'),measurements},null,2)+'\n');
 console.log(model.toUpperCase(),final.length,'optimized bytes',doc.animations.map(a=>a.name).join(', '));
}

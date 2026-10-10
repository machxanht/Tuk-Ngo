import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

// Inspect the persisted animation, including between baked samples. Remove only
// image/material references so Node can load the same binary rig without a DOM.
const path=process.argv[2]||'public/assets/ghe-ngo/ghe-ngo-crew.glb',raw=await fs.readFile(path),length=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+length)),bin=raw.subarray(28+length);
delete json.images;delete json.textures;delete json.samplers;
for(const material of json.materials||[])delete material.pbrMetallicRoughness?.baseColorTexture;
const body=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([body,Buffer.alloc((4-body.length%4)%4,32)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+bin.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
const bytes=Buffer.concat([header,padded,binHeader,bin]);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene,mixer=new T.AnimationMixer(root),clip=gltf.animations[0];if(!clip)throw Error('Missing baked rowing clip');const base=mixer.clipAction(clip).play(),sprintClip=gltf.animations.find(a=>a.name.startsWith('Rowing_Sprint_')),sprint=sprintClip?mixer.clipAction(sprintClip).play():null;sprint?.setEffectiveWeight(0);
const rowers=[];root.traverse(o=>{if(o.userData.component==='athlete'&&o.userData.role==='ROWER')rowers.push(o);});
const report={path,rowers:rowers.length,clips:gltf.animations.length,strengths:sprint?[0,.5,1]:[0],sampledPhases:161,maxGripGapM:0,minElbowAngleDeg:180,maxElbowAngleDeg:0,maxWristFlexDeg:0,minPairElbowGapM:Infinity,maxJointStepDeg:0,errors:[]},previous=new Map();
const position=b=>b.getWorldPosition(new T.Vector3());
for(const strength of report.strengths){base.setEffectiveWeight(1-strength);sprint?.setEffectiveWeight(strength);previous.clear();for(let frame=0;frame<=160;frame++){
 mixer.setTime(frame===160?0:frame/160*clip.duration);root.updateMatrixWorld(true);
 for(const a of rowers){
  const paddle=root.getObjectByName('Paddle_'+a.userData.id),direction=new T.Vector3(0,1,0).applyQuaternion(paddle.getWorldQuaternion(new T.Quaternion())),top=position(paddle),low=top.clone().addScaledVector(direction,-.44),grips=a.position.z<0?[low,top]:[top,low];
  for(const [i,suffix]of ['l','r'].entries()){
   const bone=name=>root.getObjectByName(a.name+'_Joint_'+name+'_'+suffix),upper=bone('upperarm'),elbow=bone('lowerarm'),hand=bone('hand'),middle=bone('middle_01'),shoulder=position(upper),e=position(elbow),w=position(hand),fist=hand.localToWorld(middle.position.clone().multiplyScalar(.57)),fore=w.clone().sub(e),angle=T.MathUtils.radToDeg(shoulder.sub(e).angleTo(fore));
   report.maxGripGapM=Math.max(report.maxGripGapM,fist.distanceTo(grips[i]));report.minElbowAngleDeg=Math.min(report.minElbowAngleDeg,angle);report.maxElbowAngleDeg=Math.max(report.maxElbowAngleDeg,angle);report.maxWristFlexDeg=Math.max(report.maxWristFlexDeg,T.MathUtils.radToDeg(fore.angleTo(fist.clone().sub(w))));
   for(const joint of [upper,elbow,hand]){if(previous.has(joint))report.maxJointStepDeg=Math.max(report.maxJointStepDeg,T.MathUtils.radToDeg(previous.get(joint).angleTo(joint.quaternion)));previous.set(joint,joint.quaternion.clone());}
  }
 }
 for(let id=2;id<=50;id+=2){const left=root.getObjectByName(`Athlete_${id}_ROWER_Joint_lowerarm_r`),right=root.getObjectByName(`Athlete_${id+1}_ROWER_Joint_lowerarm_l`);report.minPairElbowGapM=Math.min(report.minPairElbowGapM,position(left).distanceTo(position(right)));}
}}
if(report.rowers!==50)report.errors.push('Incorrect rower count');if(report.maxGripGapM>.002)report.errors.push('Baked hand detaches from paddle');if(report.minElbowAngleDeg<55||report.maxElbowAngleDeg>170)report.errors.push('Baked elbow folds/locks');if(report.maxWristFlexDeg>15)report.errors.push('Baked wrist bends sideways');if(report.minPairElbowGapM<.08)report.errors.push('Baked paired elbows overlap');if(report.maxJointStepDeg>12)report.errors.push('Baked joint snaps');
report.pass=report.errors.length===0;report.limits=['Rig and interpolation inspection; textures are inspected in the browser','Authoring bounds, not measured race biomechanics','No exhaustive body collision test'];
await fs.writeFile(sprint?'docs/qa/baked-rig-v8.json':'docs/qa/baked-rig-v6.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;

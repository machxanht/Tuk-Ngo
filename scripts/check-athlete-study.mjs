import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';

const path=process.argv[2]||'public/assets/human/athlete-rower-study.glb';
const output=process.argv[3]||'docs/qa/athlete-study/persisted-rig.json';
const raw=await fs.readFile(path),length=raw.readUInt32LE(12);
const json=JSON.parse(raw.subarray(20,20+length)),bin=raw.subarray(28+length);
const validation=await validateBytes(new Uint8Array(raw),{uri:path,maxIssues:1000});
// Node inspects the real persisted geometry / animation without decoding images.
// Material appearance is checked separately with the actual browser loader.
delete json.images;delete json.textures;delete json.samplers;
for(const m of json.materials||[]){delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;delete m.normalTexture;}
const text=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+bin.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);
const bytes=Buffer.concat([header,padded,binHeader,bin]);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
const root=gltf.scene,mixer=new T.AnimationMixer(root);
for(const clip of gltf.animations)mixer.clipAction(clip).play();
const duration=Math.max(...gltf.animations.map(c=>c.duration));
const bone=name=>{const b=root.getObjectByName(name);if(!b)throw Error('Missing bone '+name);return b;};
const paddle=bone('Dam_Wood_152cm'),position=b=>b.getWorldPosition(new T.Vector3());
const report={path,sha256:crypto.createHash('sha256').update(raw).digest('hex'),bytes:raw.length,clips:gltf.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),sampledPhases:193,maxPalmCenterGapM:0,minElbowAngleDeg:180,maxElbowAngleDeg:0,maxWristFlexDeg:0,maxJointStepDeg:0,maxLoopPositionDeltaM:0,validator:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,warningCodes:[...new Set(validation.issues.messages.filter(m=>m.severity===1).map(m=>m.code))]},errors:[]};
const previous=new Map();
for(let step=0;step<=192;step++){
 mixer.setTime(step===192?0:step/192*duration);root.updateMatrixWorld(true);
 for(const [index,s] of ['l','r'].entries()){
  const shoulder=bone('upperarm_'+s),elbow=bone('lowerarm_'+s),hand=bone('hand_'+s),middle=bone('middle_01_'+s);
  const a=position(shoulder),e=position(elbow),w=position(hand),palm=hand.localToWorld(middle.position.clone().multiplyScalar(.90));
  const grip=paddle.localToWorld(new T.Vector3(0,index===0?0:-.53,0));
  const angle=T.MathUtils.radToDeg(a.clone().sub(e).angleTo(w.clone().sub(e)));
  const gap=palm.distanceTo(grip);
  if(gap>report.maxPalmCenterGapM){report.maxPalmCenterGapM=gap;report.largestGapAt={phase:step/192,arm:s,time:step/192*duration,palm:palm.toArray(),grip:grip.toArray()};}
  report.minElbowAngleDeg=Math.min(report.minElbowAngleDeg,angle);report.maxElbowAngleDeg=Math.max(report.maxElbowAngleDeg,angle);
  report.maxWristFlexDeg=Math.max(report.maxWristFlexDeg,T.MathUtils.radToDeg(w.clone().sub(e).angleTo(palm.clone().sub(w))));
  for(const joint of [shoulder,elbow,hand]){if(previous.has(joint)){const angle=T.MathUtils.radToDeg(previous.get(joint).angleTo(joint.quaternion));if(angle>report.maxJointStepDeg){report.maxJointStepDeg=angle;report.largestStepAt={phase:step/192,bone:joint.name};}}previous.set(joint,joint.quaternion.clone());}
 }
}
const sample=(time)=>{mixer.setTime(time);root.updateMatrixWorld(true);return ['hand_l','hand_r','head','Dam_Wood_152cm'].map(n=>position(bone(n)));};
const first=sample(0),last=sample(duration-.00001);report.maxLoopPositionDeltaM=Math.max(...first.map((p,i)=>p.distanceTo(last[i])));
const shirt=root.getObjectByName('Competition_Tank_Top_Loose');
report.shirtMorphTargets=shirt?.geometry?.morphAttributes.position?.length||0;
if(validation.issues.numErrors)report.errors.push('Invalid glTF');
if(gltf.animations.length!==1)report.errors.push('Athlete, cloth and paddle must share one portable animation');
if(report.shirtMorphTargets!==49)report.errors.push('Missing exported cloth contact corrections');
if(report.maxPalmCenterGapM>.008)report.errors.push('Palm center detaches from authored grip');
if(report.minElbowAngleDeg<50||report.maxElbowAngleDeg>175)report.errors.push('Elbow folds or locks');
if(report.maxWristFlexDeg>5)report.errors.push('Wrist bends away from forearm');
if(report.maxJointStepDeg>14)report.errors.push('Arm joint snaps between close samples');
if(report.maxLoopPositionDeltaM>.001)report.errors.push('Loop seam mismatch');
report.pass=report.errors.length===0;
report.limits=['Palm center / bones are checked, not exhaustive finger surface contact','Authored animation, not measured race biomechanics or motion capture','Real textures and garment appearance require browser inspection','One detailed actor; no physical tablet performance benchmark'];
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {rowingMotionDigest,athleteMasterDigest} from '../src/race/asset-digests.mjs';
import {ROWING_LAYOUT} from '../src/race/rowing-pose.mjs';

const raw=await readFile('public/assets/athlete-master/rowing-motion.glb'),validated=await validateBytes(new Uint8Array(raw));
assert.equal(validated.issues.numErrors,0,JSON.stringify(validated.issues.messages));assert.equal(validated.issues.numWarnings,0);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');assert.equal(rowingMotionDigest,digest(raw));assert.equal(athleteMasterDigest,digest(await readFile('public/assets/athlete-master/athlete-master.glb')));
const model=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
assert.deepEqual(model.animations.map(c=>c.name),['seated-port','seated-starboard','standing-port','standing-starboard','caller','controller','helm','helm-starboard']);
const point=new T.Vector3(),report={};
for(const clip of model.animations){
 const root=model.scene.clone(true),mixer=new T.AnimationMixer(root);mixer.clipAction(clip).play();
 const helm=clip.name.startsWith('helm'),rower=/^(seated|standing)/.test(clip.name),kneeling=clip.name.startsWith('standing'),outer=clip.name.endsWith('starboard')?-1:1,length=helm?4.2:kneeling?1.75:ROWING_LAYOUT.seatedPaddleLength;
 const stats={minOutboardM:Infinity,maxPalmGapM:0,tipHeightM:[Infinity,-Infinity],kneeHeightDifferenceM:0};
 for(let i=0;i<96;i++){
  mixer.setTime(i/96*clip.duration);root.updateMatrixWorld(true);
  if(rower||helm){
   const paddle=root.getObjectByName('Dam_Wood_152cm'),tip=point.set(0,-length,0).applyMatrix4(paddle.matrixWorld);stats.minOutboardM=Math.min(stats.minOutboardM,tip.x*outer);
   assert.ok(tip.x*outer>(helm?.75:kneeling?.50:.40),clip.name+' blade crosses into the hull');
   if(helm){assert.ok(tip.z<-3,clip.name+' steering blade must extend aft');const y=tip.y+ROWING_LAYOUT.sternDeckY;stats.tipHeightM=[Math.min(stats.tipHeightM[0],y),Math.max(stats.tipHeightM[1],y)];assert.ok(y>.06&&y<.80,clip.name+' steering blade depth/lift');}
   const inverse=paddle.matrixWorld.clone().invert(),distances=['l','r'].map(s=>{const palm=root.getObjectByName('hand_'+s).getWorldPosition(point).lerp(root.getObjectByName('middle_01_'+s).getWorldPosition(point.clone()),.9).applyMatrix4(inverse);return [palm.distanceTo(point.clone().set(0,0,0)),palm.distanceTo(point.clone().set(0,-.53,0))];});
   const gap=Math.min(Math.max(distances[0][0],distances[1][1]),Math.max(distances[0][1],distances[1][0]));stats.maxPalmGapM=Math.max(stats.maxPalmGapM,gap);assert.ok(gap<.005,clip.name+' hand detached from grip: '+gap);
  }
  if(kneeling){
   const rear=outer>0?'l':'r',front=rear==='l'?'r':'l',knee=root.getObjectByName('calf_'+rear).getWorldPosition(point),frontKnee=root.getObjectByName('calf_'+front).getWorldPosition(point.clone());
   stats.kneeHeightDifferenceM=frontKnee.y-knee.y;assert.ok(stats.kneeHeightDifferenceM>.16,clip.name+' needs one lowered knee');
   assert.ok(root.getObjectByName('foot_'+rear).getWorldPosition(point).z<-.4);assert.ok(root.getObjectByName('foot_'+front).getWorldPosition(point).z>.28);
   assert.ok(Math.abs(root.getObjectByName('pelvis').getWorldPosition(point).y-.70)<.01);
  }
 }
 report[clip.name]=stats;mixer.stopAllAction();mixer.uncacheRoot(root);
}
console.log('Rowing poses passed: 96 phases, opposite outboard blades, asymmetric half-kneeling legs, aft low steering, two-hand grip, eight cached clips and content digests.');

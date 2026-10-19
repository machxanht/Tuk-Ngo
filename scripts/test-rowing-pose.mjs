import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {rowingMotionDigest,athleteMasterDigest} from '../src/race/asset-digests.mjs';
import {ROWING_LAYOUT} from '../src/race/rowing-pose.mjs';
import {profile,boatHullGeometry} from '../src/race/boat.mjs';
import {festivalLogoSvg,FESTIVAL_MARK} from '../src/race/festival-branding.mjs';

for(let x=.01;x<=15.09;x+=.01){const before=profile(-x+.001),p=profile(-x);assert.ok(p.g>=p.k&&p.b>=0);assert.ok(Math.abs(p.g-before.g)<.002&&Math.abs(p.k-before.k)<.003,'Stern contour has a kink');}
const low=boatHullGeometry({segments:84,sections:10,interior:false}),high=boatHullGeometry();assert.ok([...high.attributes.position.array].every(Number.isFinite));assert.equal(high.groups.length,3);assert.equal(low.groups.length,1);low.dispose();high.dispose();
const logo=await readFile('public/assets/festival/festival-logo.svg','utf8');assert.equal(logo,festivalLogoSvg());assert.ok(logo.includes(FESTIVAL_MARK.boat));

const raw=await readFile('public/assets/athlete-master/rowing-motion.glb'),validated=await validateBytes(new Uint8Array(raw));
assert.equal(validated.issues.numErrors,0,JSON.stringify(validated.issues.messages));assert.equal(validated.issues.numWarnings,0);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');assert.equal(rowingMotionDigest,digest(raw));assert.equal(athleteMasterDigest,digest(await readFile('public/assets/athlete-master/athlete-master.glb')));
const model=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
assert.deepEqual(model.animations.map(c=>c.name),['seated-port','seated-starboard','standing-port','standing-starboard','caller','controller','helm','helm-starboard','bow-spear']);
const seatedRows=Array.from({length:8},(_,i)=>10-i*20/24),firstKneeler=10-8*20/24;
assert.equal(seatedRows.filter(x=>x<ROWING_LAYOUT.controllerX&&x>firstKneeler).length,2,'Two seated rows separate the whistle coach from the kneeling group');
const point=new T.Vector3(),report={};
for(const clip of model.animations){
 const root=model.scene.clone(true),mixer=new T.AnimationMixer(root);mixer.clipAction(clip).play();
 const helm=clip.name.startsWith('helm'),rower=/^(seated|standing)/.test(clip.name),kneeling=clip.name.startsWith('standing'),outer=clip.name.endsWith('starboard')?-1:1,length=helm?ROWING_LAYOUT.steeringPaddleLength:kneeling?1.75:ROWING_LAYOUT.seatedPaddleLength;
 const stats={minOutboardM:Infinity,maxPalmGapM:0,tipHeightM:[Infinity,-Infinity],kneeHeightDifferenceM:0,handZ:[Infinity,-Infinity]};
 for(let i=0;i<96;i++){
  mixer.setTime(i/96*clip.duration);root.updateMatrixWorld(true);
  if(rower||helm){
   const paddle=root.getObjectByName('Dam_Wood_152cm'),tip=point.set(0,-length,0).applyMatrix4(paddle.matrixWorld);stats.minOutboardM=Math.min(stats.minOutboardM,tip.x*outer);
   assert.ok(tip.x*outer>(helm?.50:kneeling?.50:.40),clip.name+' blade crosses into the hull');
   if(helm){const axis=new T.Vector3(0,1,0).transformDirection(paddle.matrixWorld);assert.ok(axis.y>Math.cos(T.MathUtils.degToRad(20)),clip.name+' steering paddle leans more than 20 degrees');assert.ok(Math.abs(tip.z)<.5,clip.name+' steering blade projects far aft');const y=tip.y+ROWING_LAYOUT.sternDeckY;stats.tipHeightM=[Math.min(stats.tipHeightM[0],y),Math.max(stats.tipHeightM[1],y)];assert.ok(y>-.08&&y<.25,clip.name+' steering blade must stay immersed');}
   if(rower){const elbow=root.getObjectByName('lowerarm_'+(outer>0?'r':'l')).getWorldPosition(new T.Vector3()),gap=2*(ROWING_LAYOUT.rowerOffset+elbow.x*outer*ROWING_LAYOUT.lateralScale);assert.ok(gap>.10,clip.name+' paired inboard elbows overlap: '+gap);assert.ok(elbow.z>.10,clip.name+' inboard elbow folds through chest');}
   const inverse=paddle.matrixWorld.clone().invert(),distances=['l','r'].map(s=>{const palm=root.getObjectByName('hand_'+s).getWorldPosition(point).lerp(root.getObjectByName('middle_01_'+s).getWorldPosition(point.clone()),.9).applyMatrix4(inverse);return [palm.distanceTo(point.clone().set(0,0,0)),palm.distanceTo(point.clone().set(0,-.53,0))];});
   const gap=Math.min(Math.max(distances[0][0],distances[1][1]),Math.max(distances[0][1],distances[1][0]));stats.maxPalmGapM=Math.max(stats.maxPalmGapM,gap);assert.ok(gap<.005,clip.name+' hand detached from grip: '+gap);
  }
  const hand=root.getObjectByName('hand_l').getWorldPosition(new T.Vector3());stats.handZ=[Math.min(stats.handZ[0],hand.z),Math.max(stats.handZ[1],hand.z)];
  if(['caller','bow-spear'].includes(clip.name)){
   const inverse=root.getObjectByName('Dam_Wood_152cm').matrixWorld.clone().invert(),palms=['l','r'].map(s=>root.getObjectByName('hand_'+s).getWorldPosition(new T.Vector3()).lerp(root.getObjectByName('middle_01_'+s).getWorldPosition(new T.Vector3()),.9).applyMatrix4(inverse));
   assert.ok(Math.min(...palms.map((p,i)=>Math.max(p.length(),palms[1-i].distanceTo(new T.Vector3(0,clip.name==='bow-spear'?-.34:-.53,0)))))<.005,clip.name+' hands must grip the real or mimed shaft');
  }
  if(clip.name==='controller'){const head=root.getObjectByName('head').getWorldPosition(new T.Vector3()),mouth=head.clone().add(new T.Vector3(.055,-.10,.14));const palm=hand.lerp(root.getObjectByName('middle_01_l').getWorldPosition(new T.Vector3()),.9);assert.ok(palm.distanceTo(mouth)<.012,'Coach whistle hand misses lips');for(const [side,sign]of [['l',1],['r',-1]]){const elbow=root.getObjectByName('lowerarm_'+side).getWorldPosition(new T.Vector3());assert.ok(elbow.x*sign>.12,'Coach elbow folds across the chest');assert.ok(elbow.y<head.y-.20,'Coach elbow is raised unnaturally');}}
  if(clip.name==='bow-spear')assert.ok(Math.abs(root.getObjectByName('pelvis').getWorldPosition(new T.Vector3()).y-.94)<.01,'Dugout commander must stand');
  if(kneeling){
   const rear=outer>0?'l':'r',front=rear==='l'?'r':'l',knee=root.getObjectByName('calf_'+rear).getWorldPosition(point),frontKnee=root.getObjectByName('calf_'+front).getWorldPosition(point.clone());
   stats.kneeHeightDifferenceM=frontKnee.y-knee.y;assert.ok(stats.kneeHeightDifferenceM>.16,clip.name+' needs one lowered knee');
   assert.ok(root.getObjectByName('foot_'+rear).getWorldPosition(point).z<-.4);assert.ok(root.getObjectByName('foot_'+front).getWorldPosition(point).z>.28);
   for(const leg of[rear,front]){const foot=root.getObjectByName('foot_'+leg).getWorldPosition(new T.Vector3());assert.ok(Math.abs(-outer*ROWING_LAYOUT.rowerOffset-foot.x*ROWING_LAYOUT.lateralScale)<.21,'Kneeling feet must tuck inside the narrow stern');}
   assert.ok(Math.abs(root.getObjectByName('pelvis').getWorldPosition(point).y-.70)<.01);
  }
 }
 if(clip.name==='caller')assert.ok(stats.handZ[1]-stats.handZ[0]>.25,'Seated bow caller must mime the drive with hands');
 report[clip.name]=stats;mixer.stopAllAction();mixer.uncacheRoot(root);
}
console.log('Rowing poses passed: 96 phases, elbow clearance, two-row coach gap, hand rowing cues, upright steering, standing dugout commander, two-hand grip; original eight rigs retained.');

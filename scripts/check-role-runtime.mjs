import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {optimizeRaceBoat} from '../src/race/race-crew.mjs';
import {profile} from '../src/race/boat.mjs';
const revision=process.argv[2]||'v12';if(!['v12','v13'].includes(revision))throw Error('Unknown crew revision');
const raw=fs.readFileSync('public/assets/ghe-ngo/ghe-ngo-crew-'+revision+'.glb'),size=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+size)),bin=raw.subarray(28+size);
delete j.images;delete j.textures;delete j.samplers;for(const m of j.materials){delete m.pbrMetallicRoughness?.baseColorTexture;delete m.normalTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
const text=Buffer.from(JSON.stringify(j)),pad=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+pad.length+bin.length,8);h.writeUInt32LE(pad.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);const bytes=Buffer.concat([h,pad,bh,bin]);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const report={teams:[],boneMetrics:{},gripSupport:{samples:0,maxGapM:0,helmTipMinY:Infinity,helmTipMaxY:-Infinity}};
const support=JSON.parse(fs.readFileSync('docs/qa/crew-v12/support-plan.json','utf8'));
function innerFloor(x,z){const p=profile(x);if(Math.abs(x)>10.6)return p.g-.025;const coef=Math.min(.85,(p.g-p.k)*Math.tan(14.5*Math.PI/180)/Math.max(p.b,.001))-1/p.p;let lo=0,hi=1;for(let i=0;i<28;i++){const s=(lo+hi)/2;if(p.b*s*(1-coef+coef*s**p.p)<Math.abs(z))lo=s;else hi=s;}return p.k+(p.g-p.k)*((lo+hi)/2)**p.p+.025;}
report.footSupport={sampledFramesPerClip:49,maxTargetGapM:0,maxLowerLegIntrusionM:0,verticesChecked:0};
report.callerFeet={samples:0,maxX:-Infinity,maxY:-Infinity,insideHull:true};
for(let team=0;team<2;team++){
 const root=clone(gltf.scene),boat=optimizeRaceBoat(root,team?'#df8f29':undefined),mixer=new T.AnimationMixer(root);mixer.clipAction(gltf.animations[0]).play();
 for(const phase of [0,.25,.5,.75]){mixer.setTime(phase*gltf.animations[0].duration);boat.updateInstances();for(const actor of boat.actors){const role=actor.userData.role,posture=actor.userData.posture,key=role+'_'+posture;if(!report.boneMetrics[key])report.boneMetrics[key]={minFootY:Infinity,maxFootY:-Infinity,minHeadY:Infinity,maxHeadY:-Infinity};const metrics=report.boneMetrics[key];actor.traverse(n=>{if(n.isBone&&/^foot_[lr](?:_|$)/.test(n.name)){const y=n.getWorldPosition(new T.Vector3()).y;metrics.minFootY=Math.min(metrics.minFootY,y);metrics.maxFootY=Math.max(metrics.maxFootY,y);}if(n.isBone&&/^head(?:_|$)/.test(n.name)){const y=n.getWorldPosition(new T.Vector3()).y;metrics.minHeadY=Math.min(metrics.minHeadY,y);metrics.maxHeadY=Math.max(metrics.maxHeadY,y);}});}}
 if(team===0){
  mixer.stopAllAction();
  for(const clip of gltf.animations){const action=mixer.clipAction(clip).play();
   for(let frame=0;frame<49;frame++){mixer.setTime(frame/49*clip.duration);boat.updateInstances();
    for(const actor of boat.actors){const plan=support.find(p=>p.id===actor.userData.id);for(const foot of plan.feet){const bone=[];actor.traverse(n=>{if(n.isBone&&new RegExp('^foot_'+foot.bone+'(?:_|$)').test(n.name))bone.push(n);});const target=new T.Vector3(plan.x-(plan.role==="BOW_CALLER"?-1:1)*foot.target[1],foot.target[2],-(plan.lat+(plan.side>0?-1:1)*(plan.role==="BOW_CALLER"?-1:1)*foot.target[0])),point=bone[0].getWorldPosition(new T.Vector3());report.footSupport.maxTargetGapM=Math.max(report.footSupport.maxTargetGapM,point.distanceTo(target));if(plan.role==='BOW_CALLER'){report.callerFeet.samples++;report.callerFeet.maxX=Math.max(report.callerFeet.maxX,point.x);report.callerFeet.maxY=Math.max(report.callerFeet.maxY,point.y);report.callerFeet.insideHull&&=point.x<10.6&&point.y<profile(point.x).g-.1&&Math.abs(point.z)<profile(point.x).b-.04;}}
     if(['ROWER','HELMSMAN'].includes(actor.userData.role)){
      const helm=actor.userData.role==='HELMSMAN',id=actor.userData.id,paddle=root.getObjectByName(helm?'Steering_Oar_'+(id-52):'Paddle_'+id);
      for(const [i,s] of ['l','r'].entries()){
       let hand,middle;actor.traverse(n=>{if(n.isBone&&new RegExp('^hand_'+s+'(?:_|$)').test(n.name))hand=n;if(n.isBone&&new RegExp('^middle_01_'+s+'(?:_|$)').test(n.name))middle=n;});
       const palm=hand.getWorldPosition(new T.Vector3()).lerp(middle.getWorldPosition(new T.Vector3()),.9),target=new T.Vector3(0,-(i===0?(helm?.12:0):.53),0).applyMatrix4(paddle.matrixWorld),gap=palm.distanceTo(target);
       report.gripSupport.samples++;report.gripSupport.maxGapM=Math.max(report.gripSupport.maxGapM,gap);
       if(!report.gripSupport.worst||gap>report.gripSupport.worst.gap)report.gripSupport.worst={id,frame,clip:clip.name,side:s,gap};
      }
      if(helm){const y=new T.Vector3(0,-4.2,0).applyMatrix4(paddle.matrixWorld).y;report.gripSupport.helmTipMinY=Math.min(report.gripSupport.helmTipMinY,y);report.gripSupport.helmTipMaxY=Math.max(report.gripSupport.helmTipMaxY,y);}
     }
     actor.traverse(mesh=>{if(!mesh.isSkinnedMesh||!mesh.visible)return;mesh.skeleton.update();const ix=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;for(let v=0;v<ix.count;v++){let leg=0;for(let k=0;k<4;k++){const name=mesh.skeleton.bones[ix[['getX','getY','getZ','getW'][k]](v)].name;if(/^(calf|foot)_[lr](?:_|$)/.test(name))leg+=w[['getX','getY','getZ','getW'][k]](v);}if(leg<.6)continue;const point=mesh.getVertexPosition(v,new T.Vector3()).applyMatrix4(mesh.matrixWorld),p=profile(point.x);if(point.y<p.g-.015){const intrusion=innerFloor(point.x,point.z)-point.y;report.footSupport.maxLowerLegIntrusionM=Math.max(report.footSupport.maxLowerLegIntrusionM,intrusion);if(intrusion>report.footSupport.worstIntrusion?.depth||!report.footSupport.worstIntrusion)report.footSupport.worstIntrusion={id:actor.userData.id,frame,clip:clip.name,depth:intrusion,position:point.toArray()};}report.footSupport.verticesChecked++;}});
    }
   }action.stop();
  }
 }
 report.teams.push({actors:boat.actors.length,rowers:boat.athletes.length,seated:boat.athletes.filter(a=>a.posture==='seated').length,standing:boat.athletes.filter(a=>a.posture==='standing').length,batches:boat.stats});boat.dispose();
}
report.pass=!report.teams.some(t=>t.actors!==55||t.rowers!==50||t.seated!==16||t.standing!==34)&&report.footSupport.verticesChecked>100000&&report.footSupport.maxTargetGapM<.012&&report.footSupport.maxLowerLegIntrusionM<.018&&report.gripSupport.samples===10388&&report.gripSupport.maxGapM<.02&&report.gripSupport.helmTipMaxY<.28&&report.callerFeet.samples===196&&report.callerFeet.insideHull;fs.writeFileSync('docs/qa/crew-'+revision+'/runtime-role-check.json',JSON.stringify(report,null,2)+'\n');console.log(report);if(!report.pass)process.exitCode=1;

import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import {validateBytes} from 'gltf-validator';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RACE_TEAMS_2025} from '../src/race/teams-2025.mjs';
const revision=process.argv[2]||'v15';if(!['v12','v13','v14','v15','v17'].includes(revision))throw Error('Unknown crew revision');
const report={pass:true,teams:[]},paintHashes=new Set();
const support=new Map(JSON.parse(fs.readFileSync('docs/qa/crew-v12/support-plan.json')).map(a=>[a.id,a]));
function geometryOnly(raw,source){
 const j=structuredClone(source),bin=raw.subarray(28+raw.readUInt32LE(12));delete j.images;delete j.textures;delete j.samplers;
 for(const m of j.materials){delete m.pbrMetallicRoughness?.baseColorTexture;delete m.normalTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
 const json=Buffer.from(JSON.stringify(j)),pad=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+pad.length+bin.length,8);h.writeUInt32LE(pad.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);const b=Buffer.concat([h,pad,bh,bin]);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
}
for(const team of RACE_TEAMS_2025){
 const path='public/assets/ghe-ngo/teams-2025/'+team.id+'-2025.glb',raw=fs.readFileSync(path),size=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+size));
 const identity=j.nodes.find(n=>n.extras?.team2025)?.extras.team2025;assert.equal(identity?.id,team.id);assert.equal(identity.season,2025);
 const crew=j.nodes.filter(n=>/^Athlete_\d+_/.test(n.name)&&n.extras?.component==='athlete');assert.equal(crew.length,55);
 assert.equal(crew.filter(n=>n.extras.role==='ROWER').length,50);assert.equal(crew.filter(n=>n.extras.role==='HELMSMAN').length,3);
 assert.equal(j.animations.length,2);assert.ok(j.animations.every(a=>a.channels.length>1000));
 const kit=j.materials.find(m=>m.name===team.id+'_Competition_Fabric');
 // Dedup may retain the caller's material name for an identical rower cap.
 // Verify the actual rower cap primitive, rather than a removable alias.
 const rowerCap=j.nodes.find(n=>n.name?.startsWith('Athlete_2_ROWER_')&&n.name.includes('Cap_')&&n.mesh!==undefined),cap=rowerCap&&j.materials[j.meshes[rowerCap.mesh].primitives[0].material];assert.ok(kit&&cap);
 const expected=new T.Color(team.cap).toArray(),actual=cap.pbrMetallicRoughness.baseColorFactor;assert.ok(expected.every((v,i)=>Math.abs(v-actual[i])<1e-5));
 assert.equal(j.nodes.filter(n=>n.name===team.id+'_Bib_Starboard'||n.name===team.id+'_Bib_Port').length,2);
 assert.ok(j.materials.find(m=>m.name===team.id+'_Bib_'+team.number)?.pbrMetallicRoughness.baseColorTexture);
 for(const [role,kit] of Object.entries(team.roleKit||{})){
  const actor=crew.find(n=>n.extras.role===role);assert.equal(actor.extras.jersey,kit.jersey);assert.equal(actor.extras.capColor,kit.cap||team.cap);
 }
 if(team.interior){const inner=j.materials.find(m=>m.name===team.id+'_Inner_Paint');assert.ok(inner);assert.ok(new T.Color(team.interior).toArray().every((v,i)=>Math.abs(v-inner.pbrMetallicRoughness.baseColorFactor[i])<1e-5));}
 const paint=j.materials.find(m=>m.name===team.id+'_Kbach_2025');assert.ok(paint?.pbrMetallicRoughness.baseColorTexture);
 const svg=fs.readFileSync('public/assets/ghe-ngo/teams-2025/'+team.id+'.svg'),paintHash=crypto.createHash('sha256').update(svg).digest('hex');paintHashes.add(paintHash);
 const validation=await validateBytes(new Uint8Array(raw),{uri:path,maxIssues:100000});assert.equal(validation.issues.numErrors,0);
 // Reopen each delivered GLB, not just the shared template, and exercise its
 // exported track bindings. A structurally valid clip can still bind wrong rigs.
 const model=await new GLTFLoader().parseAsync(geometryOnly(raw,j),''),mixer=new T.AnimationMixer(model.scene),runtime={footSamples:0,maxFootGapM:0,gripSamples:0,maxGripGapM:0};
 const actors=[];model.scene.traverse(o=>{if(o.userData.component==='athlete'&&/^Athlete_\d+_/.test(o.name))actors.push(o);});
 for(const clip of model.animations){const action=mixer.clipAction(clip).play();for(const phase of [0,.25,.5,.75]){
  mixer.setTime(phase*clip.duration);model.scene.updateMatrixWorld(true);
  for(const actor of actors){
   const plan=support.get(actor.userData.id),bones=[];actor.traverse(b=>{if(b.isBone)bones.push(b);});
   for(const foot of plan.feet){const bone=bones.find(b=>new RegExp('^foot_'+foot.bone+'(?:_|$)').test(b.name)),forward=plan.role==='BOW_CALLER'?-1:1,target=new T.Vector3(plan.x-forward*foot.target[1],foot.target[2],-(plan.lat+(plan.side>0?-1:1)*forward*foot.target[0]));runtime.footSamples++;runtime.maxFootGapM=Math.max(runtime.maxFootGapM,bone.getWorldPosition(new T.Vector3()).distanceTo(target));}
   if(['ROWER','HELMSMAN'].includes(plan.role)){const helm=plan.role==='HELMSMAN',pad=model.scene.getObjectByName(helm?'Steering_Oar_'+(plan.id-52):'Paddle_'+plan.id);for(const [i,s] of ['l','r'].entries()){const hand=bones.find(b=>new RegExp('^hand_'+s+'(?:_|$)').test(b.name)),middle=bones.find(b=>new RegExp('^middle_01_'+s+'(?:_|$)').test(b.name)),palm=hand.getWorldPosition(new T.Vector3()).lerp(middle.getWorldPosition(new T.Vector3()),.9),target=new T.Vector3(0,-(i===0?(helm?.12:0):.53),0).applyMatrix4(pad.matrixWorld);runtime.gripSamples++;runtime.maxGripGapM=Math.max(runtime.maxGripGapM,palm.distanceTo(target));}}
  }
 }action.stop();}
 assert.equal(runtime.footSamples,880);assert.ok(runtime.maxFootGapM<.012);assert.ok(runtime.maxGripGapM<.02);mixer.stopAllAction();mixer.uncacheRoot(model.scene);model.scene.traverse(o=>{o.geometry?.dispose();if(o.isSkinnedMesh)o.skeleton.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])m.dispose();});
 report.teams.push({id:team.id,name:team.name,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),crew:crew.length,clips:j.animations.map(a=>a.name),runtime,kit:true,kbachSourceHash:paintHash,validator:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings},evidenceStatus:team.evidenceStatus});
}
assert.equal(paintHashes.size,8);fs.mkdirSync('docs/qa/crew-'+revision,{recursive:true});fs.writeFileSync('docs/qa/crew-'+revision+'/team-asset-check.json',JSON.stringify(report,null,2)+'\n');console.log({pass:true,teams:8,uniquePaint:paintHashes.size,bytes:report.teams.map(t=>[t.id,t.bytes])});

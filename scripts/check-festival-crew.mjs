import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {optimizeRaceBoat} from '../src/race/race-crew.mjs';
async function load(path){
 const raw=await fs.readFile(path),length=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+length)),bin=raw.subarray(28+length);
 delete j.images;delete j.textures;delete j.samplers;
 for(const m of j.materials||[]){for(const k of ['baseColorTexture','metallicRoughnessTexture'])delete m.pbrMetallicRoughness?.[k];for(const k of ['normalTexture','occlusionTexture','emissiveTexture'])delete m[k];}
 const json=Buffer.from(JSON.stringify(j)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),h=Buffer.alloc(20),b=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+padded.length+bin.length,8);h.writeUInt32LE(padded.length,12);h.writeUInt32LE(0x4e4f534a,16);b.writeUInt32LE(bin.length);b.writeUInt32LE(0x004e4942,4);const bytes=Buffer.concat([h,padded,b,bin]);
 return {raw,gltf:await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')};
}
const [before,after]=await Promise.all([load('public/assets/ghe-ngo/ghe-ngo-crew-v18.glb'),load('public/assets/ghe-ngo/festival-crew.glb')]);
const actors=root=>{const a=[];root.traverse(o=>{if(o.userData.component==='athlete')a.push(o);});return a;};
const a=actors(before.gltf.scene),b=actors(after.gltf.scene);assert.equal(b.length,55);
const roles={},postures={},caps={};for(const o of b){roles[o.userData.role]=(roles[o.userData.role]||0)+1;if(o.userData.role==='ROWER')postures[o.userData.posture]=(postures[o.userData.posture]||0)+1;caps[o.userData.capOrientation]=(caps[o.userData.capOrientation]||0)+1;assert.equal(o.userData.kitVersion,'V21');assert.ok(o.userData.faceVariantV21);}
assert.deepEqual(roles,{ROWER:50,BOW_CALLER:1,MID_CONTROLLER:1,HELMSMAN:3});assert.deepEqual(postures,{seated:16,standing:34});
let maxJointDeviation=0,maxAccessoryDeviation=0,samples=0;
const originalMix=new T.AnimationMixer(before.gltf.scene),newMix=new T.AnimationMixer(after.gltf.scene),optimized=optimizeRaceBoat(after.gltf.scene);
for(let clip=0;clip<before.gltf.animations.length;clip++){
 originalMix.stopAllAction();newMix.stopAllAction();originalMix.clipAction(before.gltf.animations[clip]).play();newMix.clipAction(after.gltf.animations[clip]).play();
 for(const phase of [0,.12,.28,.5,.72,.92]){
  originalMix.setTime(phase*before.gltf.animations[clip].duration);newMix.setTime(phase*after.gltf.animations[clip].duration);before.gltf.scene.updateMatrixWorld(true);optimized.updateInstances();
  for(const actor of a){const target=b.find(o=>o.userData.id===actor.userData.id);actor.traverse(o=>{if(!o.isBone)return;const other=target.getObjectByName(o.name);assert.ok(other,'Missing role joint '+o.name);maxJointDeviation=Math.max(maxJointDeviation,o.getWorldPosition(new T.Vector3()).distanceTo(other.getWorldPosition(new T.Vector3())));samples++;});}
  for(const {batch,meshes}of optimized.accessoryBatches)for(let i=0;i<meshes.length;i++){const m=new T.Matrix4();batch.getMatrixAt(i,m);m.premultiply(after.gltf.scene.matrixWorld);maxAccessoryDeviation=Math.max(maxAccessoryDeviation,new T.Vector3().setFromMatrixPosition(m).distanceTo(meshes[i].getWorldPosition(new T.Vector3())));}
 }
}
assert.ok(maxJointDeviation<1e-4);assert.ok(maxAccessoryDeviation<1e-4);
const validation=await validateBytes(new Uint8Array(after.raw),{maxIssues:10000});assert.equal(validation.issues.numErrors,0);
const report={pass:true,actors:b.length,roles,postures,caps,clips:after.gltf.animations.map(c=>c.name),jointSamples:samples,maxJointDeviationM:maxJointDeviation,maxAccessoryDeviationM:maxAccessoryDeviation,optimization:optimized.stats,bytes:after.raw.length,validator:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings},limits:['Image maps excluded only for Node decoding; actual production appearance checked separately','Geometry and animations are authored approximations, not scans of named competitors']};
await fs.mkdir('docs/qa/festival-crowd',{recursive:true});await fs.writeFile('docs/qa/festival-crowd/crew-check.json',JSON.stringify(report,null,2));console.log(report);optimized.dispose();

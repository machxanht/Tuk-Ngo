import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {optimizeRaceBoat} from '../src/race/race-crew.mjs';
const raw=await fs.readFile('public/assets/ghe-ngo/ghe-ngo-crew.glb'),length=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+length)),bin=raw.subarray(28+length);
delete json.images;delete json.textures;delete json.samplers;for(const m of json.materials||[])delete m.pbrMetallicRoughness?.baseColorTexture;
const body=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([body,Buffer.alloc((4-body.length%4)%4,32)]),header=Buffer.alloc(20),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+bin.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);const bytes=Buffer.concat([header,padded,bh,bin]);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const report={boats:0,actors:0,rowers:0,mergedActors:0,phases:[0,.10,.22,.42,.60,.74,.94,1],sampledSkinVertices:0,maxSkinDeviationM:0,maxColorDeviation:0,jerseysChecked:0,maxAccessoryDeviationM:0,errors:[],limits:['Actual V6 GLB animation and skin weights; images excluded only for Node decoder','Rendering geometry preservation; appearance and water inspected in browser','Not a physical tablet benchmark or a geographic survey']};
for(let team=0;team<2;team++){
 const root=clone(gltf.scene),original=[];root.traverse(o=>{if(o.isSkinnedMesh)original.push(o);});root.updateMatrixWorld(true);
 const boat=optimizeRaceBoat(root,team?'#df8f29':undefined),mixer=new T.AnimationMixer(root);mixer.clipAction(gltf.animations[0]).play();root.position.set(1020,-.01,team?7.5:-7.5);root.rotation.y=.16;
 report.boats++;report.actors+=boat.actors.length;report.rowers+=boat.athletes.length;report.mergedActors+=boat.stats.mergedActors;
 const groups=new Map();for(const mesh of original){if(!groups.has(mesh.parent))groups.set(mesh.parent,[]);groups.get(mesh.parent).push(mesh);}
 for(const phase of report.phases){
  mixer.setTime((phase===1?0:phase)*gltf.animations[0].duration);boat.updateInstances();
  for(const {batch,meshes} of boat.accessoryBatches){for(let i=0;i<meshes.length;i++){const matrix=new T.Matrix4();batch.getMatrixAt(i,matrix);matrix.premultiply(root.matrixWorld);const before=new T.Vector3().setFromMatrixPosition(meshes[i].matrixWorld),after=new T.Vector3().setFromMatrixPosition(matrix);report.maxAccessoryDeviationM=Math.max(report.maxAccessoryDeviationM,before.distanceTo(after));}}

  for(const [parent,skins] of groups){const merged=parent.children.find(o=>o.isSkinnedMesh&&o.name.endsWith('_RaceSkin'));if(!merged){report.errors.push('No merged skin');continue;}let offset=0;
   for(const skin of skins){skin.skeleton.update();merged.skeleton.update();const a=skin.geometry.getAttribute('position'),b=merged.geometry.getAttribute('position');for(let i=0;i<a.count;i+=Math.max(1,Math.floor(a.count/20))){const p=new T.Vector3().fromBufferAttribute(a,i),q=new T.Vector3().fromBufferAttribute(b,i+offset);skin.applyBoneTransform(i,p).applyMatrix4(skin.matrixWorld);merged.applyBoneTransform(i+offset,q).applyMatrix4(merged.matrixWorld);report.maxSkinDeviationM=Math.max(report.maxSkinDeviationM,p.distanceTo(q));report.sampledSkinVertices++;}const color=skin.geometry.getAttribute('color'),mergedColor=merged.geometry.getAttribute('color'),isJersey=skin.userData.name==='Athlete_jersey'||/^Athlete_jersey(?:_\d+)?$/.test(skin.name),base=team&&isJersey?new T.Color('#df8f29'):skin.material.color;
    for(const i of [0,Math.floor(a.count/2),a.count-1]){for(const [component,getter] of ['getX','getY','getZ'].entries()){const expected=base.toArray()[component]*(color?color[getter](i):1);report.maxColorDeviation=Math.max(report.maxColorDeviation,Math.abs(mergedColor[getter](i+offset)-expected));}}if(isJersey)report.jerseysChecked++;offset+=a.count;}
  }
 }
 boat.dispose();
}
if(report.boats!==2||report.actors!==110||report.rowers!==100||report.mergedActors!==110)report.errors.push('Incorrect boat/crew/batch count');if(report.maxSkinDeviationM>1e-5)report.errors.push('Consolidation changes skinned vertex positions');if(!Number.isFinite(report.maxAccessoryDeviationM)||report.maxAccessoryDeviationM>1e-5)report.errors.push('Accessories detach after batching');if(report.jerseysChecked!==880||report.maxColorDeviation>1e-6)report.errors.push('Crew colours differ from requested team');report.pass=report.errors.length===0;
await fs.writeFile('docs/qa/two-crews-v7.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;

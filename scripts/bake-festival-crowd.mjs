import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptSimplifier} from '../node_modules/three/examples/jsm/libs/meshopt_simplifier.module.js';
import {crowdGesture, orientBone} from '../src/race/crowd.mjs';
await MeshoptSimplifier.ready;
const out='public/assets/festival-crowd/';await fs.mkdir(out,{recursive:true});
const source=JSON.parse(await fs.readFile('public/assets/coherent-v20/npcs/manifest.json','utf8'));
const names=['idle','wave','walk','clap','cheer','indicate','seated'];const frames=20;
const manifest={version:21,license:'CC0-1.0',motion:names,frames,models:[]};
for(const item of source.models){
 const b=await fs.readFile('public/assets/coherent-v20/npcs/'+item.file);const model=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const root=model.scene;root.updateMatrixWorld(true);
 const meshes=[];root.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});const skeleton=meshes[0].skeleton;
 const box=new T.Box3().setFromObject(root),scale=(item.gender==='women'?1.64:1.73)/(box.max.y-box.min.y);
 const headCenter=root.getObjectByName('Head').getWorldPosition(new T.Vector3()).y;const seatedDrop=root.getObjectByName('Hips').getWorldPosition(new T.Vector3()).y-.55/scale;
 const mixer=new T.AnimationMixer(root),clips={};for(const n of ['Idle_Neutral','Wave','Walk'])clips[n]=mixer.clipAction(model.animations.find(c=>c.name===n));
 const durations=[clips.Idle_Neutral.getClip().duration,clips.Wave.getClip().duration,clips.Walk.getClip().duration,1/1.65,Math.PI*2/5,Math.PI*2/3,clips.Idle_Neutral.getClip().duration];
 const palette=new Float32Array(names.length*frames*skeleton.bones.length*16);
 for(let a=0;a<names.length;a++)for(let f=0;f<frames;f++){
  mixer.stopAllAction();const clip=a===1?clips.Wave:a===2?clips.Walk:clips.Idle_Neutral;clip.reset().play();mixer.setTime(f/frames*durations[a]);root.updateMatrixWorld(true);
  if(a>=3&&a<=5)crowdGesture({root,index:a-3,walk:false},f/frames*durations[a],1);
  if(a===6){for(const s of ['L','R']){const upper=root.getObjectByName('UpperLeg'+s),lower=root.getObjectByName('LowerLeg'+s),foot=root.getObjectByName('Foot'+s);const oldFoot=foot.getWorldQuaternion(new T.Quaternion());orientBone(upper,lower,upper.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,0,1)),1);orientBone(lower,foot,lower.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-1,.04)),1);foot.quaternion.copy(foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(oldFoot));root.updateMatrixWorld(true);}}
  root.updateMatrixWorld(true);skeleton.update();palette.set(skeleton.boneMatrices,(a*frames+f)*skeleton.bones.length*16);
 }
 const levels=[];
 for(const ratio of [1,.065,.008]){
  const positions=[],normals=[],weights=[],joints=[],colors=[],regions=[],indices=[];
  for(const mesh of meshes){const g=mesh.geometry;const idx=ratio===1?g.index.array:(ratio<.01?MeshoptSimplifier.simplifySloppy(g.index.array,g.attributes.position.array,3,null,Math.max(12,Math.floor(g.index.count*ratio/3)*3),1):MeshoptSimplifier.simplify(g.index.array,g.attributes.position.array,3,Math.max(12,Math.floor(g.index.count*ratio/3)*3),.18,['LockBorder']))[0];
   const used=new Map();for(const old of idx){if(!used.has(old)){const n=positions.length/3;used.set(old,n);for(const [key,list,size]of [['position',positions,3],['normal',normals,3],['skinWeight',weights,4],['skinIndex',joints,4]])for(let k=0;k<size;k++)list.push(g.attributes[key][['getX','getY','getZ','getW'][k]](old));const color=mesh.material.color;colors.push(color.r,color.g,color.b);regions.push(/Skin/.test(mesh.material.name)?1:/Hair|Eyebrows/.test(mesh.material.name)?2:/Eye/.test(mesh.material.name)?3:4);}indices.push(used.get(old));}
  }
  levels.push({position:positions,normal:normals,skinWeight:weights,skinIndex:joints,color:colors,region:regions,index:indices,triangles:indices.length/3});
 }
 const chunks=[];let offset=0;for(const level of levels)for(const key of ['position','normal','skinWeight','skinIndex','color','region','index']){const data=key==='index'?Uint32Array.from(level[key]):Float32Array.from(level[key]);chunks.push(Buffer.from(data.buffer));level[key]={offset,count:data.length,type:key==='index'?'uint32':'float32'};offset+=data.byteLength;}const geometryBinary=item.id+'.geometry.bin';await fs.writeFile(out+geometryBinary,Buffer.concat(chunks));
 const file=item.id+'.json',binary=item.id+'.bones.bin';await fs.writeFile(out+file,JSON.stringify({id:item.id,scale,headCenter,seatedDrop,ground:box.min.y,bones:skeleton.bones.length,frames,durations,motion:names,binary,geometryBinary,levels}));await fs.writeFile(out+binary,Buffer.from(palette.buffer));
 manifest.models.push({...item,file,binary,paletteBytes:palette.byteLength,lodTriangles:levels.map(l=>l.triangles)});console.log(item.id,levels.map(l=>l.triangles),palette.byteLength);
}
await fs.writeFile(out+'manifest.json',JSON.stringify(manifest,null,2));

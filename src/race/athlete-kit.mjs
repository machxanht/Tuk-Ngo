import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export async function loadAthleteKit(base){
 const gltf=await new GLTFLoader().loadAsync(base+'assets/studio-kit/athlete-kit.glb'),skins=[];
 gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});
 return {gltf,skins};
}
/** Share the new sewn surfaces; drive them with each existing role rig. */
export function applyAthleteKit(root,kit){
 const actors=[],added=[],removed=[],materials=new Map(),geometry=new Map(),replaced=[],skeletons=[];root.updateMatrixWorld(true);root.traverse(o=>{if(o.userData.component==='athlete'&&/^Athlete_\d+_/.test(o.name))actors.push(o);});
 for(const actor of actors){
  const bones=[],skins=[];actor.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)skins.push(o);});
  const source=kit.skins[0],mapped=source.skeleton.bones.map(b=>bones.find(o=>new RegExp('(?:^|_)'+b.name+'(?:_\\d+)?$','i').test(o.name)));
  if(mapped.some(b=>!b))throw Error('Cannot match garment rig '+actor.name);
  const skeleton=new T.Skeleton(mapped,source.skeleton.boneInverses.map(m=>m.clone()));
  skeletons.push(skeleton);
  const roleColor=actor.userData.role==='BOW_CALLER'?'#788850':actor.userData.role==='MID_CONTROLLER'?'#59a9cc':null;
  for(const old of skins){const ms=Array.isArray(old.material)?old.material:[old.material];if(ms.some(m=>/Competition_Green|Ribbed_Binding|Caller_Olive|Controller_Light_Blue|Dark_Competition_Shorts|Khmer_Back_Print|White_Uniform_Print/.test(m.name))){old.visible=false;removed.push(old);}}
  // Old caps have actor transforms baked into their vertices and inverse binds.
  // Their mirrored rows need opposite winding for Three's object face direction.
  for(const old of skins)if(old.material.name==='White_Cotton_Cap'&&old.matrixWorld.determinant()<0){const key=old.geometry.uuid+':cap';let g=geometry.get(key);if(!g){g=old.geometry.clone();const a=g.index.array.slice();for(let i=0;i<a.length;i+=3)[a[i+1],a[i+2]]=[a[i+2],a[i+1]];g.setIndex(new T.BufferAttribute(a,1));geometry.set(key,g);}replaced.push({mesh:old,geometry:old.geometry});old.geometry=g;}
  for(const original of kit.skins){
   const key=original.material.uuid+':'+(roleColor||'rower');let material=materials.get(key);
   if(!material){material=original.material.clone();material.side=T.DoubleSide;if(roleColor&&/Fabric|Binding/.test(material.name)){material.color.set(roleColor);material.name=actor.userData.role==='BOW_CALLER'?'Caller_Olive_V21':'Controller_Light_Blue_V21';}materials.set(key,material);}
   let g=original.geometry;
   if(original.name==='Uniform_Print_Koun_Khmer'&&actor.matrixWorld.determinant()<0){const key=g.uuid+':print';if(!geometry.has(key)){const mirrored=g.clone(),uv=mirrored.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));geometry.set(key,mirrored);}g=geometry.get(key);}
   const skin=new T.SkinnedMesh(g,material);skin.name=actor.name+'_V21_'+original.name;skin.userData={name:original.name,component:'athleteGarment',kitVersion:'V21'};skin.position.copy(original.position);skin.quaternion.copy(original.quaternion);skin.scale.copy(original.scale);skin.bind(skeleton,original.bindMatrix);skin.frustumCulled=false;actor.add(skin);added.push(skin);
  }
  actor.userData.kitVersion='V21';
 }
 root.userData.kitVersion='V21';
 return {stats:{actors:actors.length,surfaces:added.length,capWindingCorrections:replaced.length,source:'V20 conformal sewn kit, shared geometry on existing role rigs'},dispose(){added.forEach(o=>o.removeFromParent());removed.forEach(o=>o.visible=true);replaced.forEach(o=>o.mesh.geometry=o.geometry);materials.forEach(m=>m.dispose());geometry.forEach(g=>g.dispose());skeletons.forEach(s=>s.dispose());}};
}

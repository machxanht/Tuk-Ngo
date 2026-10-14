import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function loadAthleteIdentities(base=''){
 const folder=base+'assets/athlete-identities/',manifest=await fetch(folder+'manifest.json').then(r=>{if(!r.ok)throw Error('Identity manifest '+r.status);return r.json();}),loader=new GLTFLoader();
 const prototypes=await Promise.all(manifest.models.map(async record=>({record,scene:(await loader.loadAsync(folder+record.file)).scene})));
 const geometries=new Set(),materials=new Set();for(const p of prototypes)p.scene.traverse(o=>{if(o.isMesh){const position=o.geometry.attributes.position;for(let i=0;i<position.count;i++){const y=position.getY(i);if(y>.16){const taper=Math.sqrt(Math.max(.12,1-Math.min(1,(y-.16)/.36)*.88));position.setX(i,position.getX(i)*taper);position.setZ(i,position.getZ(i)*taper);}}position.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
 return {prototypes,manifest,dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
const random=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};

export function applyAthleteIdentities(root,library,{seed=21001}={}){
 if(root.userData.athleteIdentityVersion==='V21')return{stats:{actors:0,skippedAlreadyBaked:true,version:'V21'},dispose(){},update(){}};
 root.updateMatrixWorld(true);const rng=random(seed),actors=[],ownedG=[],ownedM=[],added=[],changes=[],maskCache=new Map(),materialCache=new Map();
 root.traverse(o=>{if(o.userData.component==='athlete'&&/^Athlete_\d+_/.test(o.name)){let head;o.traverse(b=>{if(b.isBone&&/^head(?:_|$)/i.test(b.name))head=b;});if(head)actors.push({actor:o,head});}});
 const stats={actors:0,prototypes:library.prototypes.length,seed,removedHeadTriangles:0,variants:[],source:'Quaternius Ultimate Modular Men CC0; compact extracted heads',bodyWardrobeMotionPreserved:true};
 for(const {actor,head}of actors){actor.updateWorldMatrix(true,true);const inverse=actor.matrixWorld.clone().invert(),bounds=new T.Box3(),skins=[];actor.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});
  // Find and remove actual head-weighted anatomical triangles; retain neck/body.
  for(const skin of skins){const mats=Array.isArray(skin.material)?skin.material:[skin.material];if(mats.some(m=>/Eyes_|Iris_|Pupil/i.test(m.name))){changes.push({o:skin,visible:skin.visible});skin.visible=false;continue;}if(!mats.some(m=>/Skin_CC0|Athlete_PBR_Atlas/i.test(m.name)))continue;
   const g=skin.geometry,ix=g.attributes.skinIndex,w=g.attributes.skinWeight;if(!ix||!w)continue;skin.skeleton.update();const headIds=skin.skeleton.bones.map((b,i)=>/^head(?:_|$)/i.test(b.name)?i:-1).filter(i=>i>=0),neckIds=skin.skeleton.bones.map((b,i)=>/^neck_01(?:_|$)/i.test(b.name)?i:-1).filter(i=>i>=0);const tagged=new Set();
   for(let v=0;v<ix.count;v++){let h=0;for(let k=0;k<4;k++)if(headIds.includes(ix.getComponent(v,k)))h+=w.getComponent(v,k);if(h>.55){tagged.add(v);bounds.expandByPoint(skin.getVertexPosition(v,new T.Vector3()).applyMatrix4(skin.matrixWorld).applyMatrix4(inverse));}}
   if(!tagged.size)continue;const key=g.uuid+':'+headIds.join(','),old=skin.geometry;let masked=maskCache.get(key);if(!masked){masked=g.clone();const idx=g.index?.array||Uint32Array.from({length:g.attributes.position.count},(_,i)=>i),kept=[];for(let i=0;i<idx.length;i+=3){if([idx[i],idx[i+1],idx[i+2]].some(v=>tagged.has(v)))stats.removedHeadTriangles++;else kept.push(idx[i],idx[i+1],idx[i+2]);}masked.setIndex(kept);maskCache.set(key,masked);ownedG.push(masked);}changes.push({o:skin,geometry:old});skin.geometry=masked;
  }
  if(bounds.isEmpty())continue;
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),choice=Math.floor(rng()*library.prototypes.length),prototype=library.prototypes[choice],identity=new T.Group();identity.name='Quaternius_Identity_'+actor.userData.id;identity.userData={component:'athleteIdentity',source:prototype.record.id,seed,license:'CC0-1.0'};
  // Fit the existing anatomical head envelope; retain cap transform untouched.
  const width=.94+rng()*.10,depth=.93+rng()*.10,height=.88+rng()*.04;
  const local=new T.Matrix4().multiplyMatrices(head.matrixWorld.clone().invert(),actor.matrixWorld).multiply(new T.Matrix4().makeTranslation(center.x,center.y-.020,center.z)).multiply(new T.Matrix4().makeScale(size.x*width,size.y*height,size.z*depth));identity.matrixAutoUpdate=false;identity.matrix.copy(local);local.decompose(identity.position,identity.quaternion,identity.scale);head.add(identity);added.push(identity);
  const face=prototype.scene.clone(true),skinTone=new T.Color().setHSL(.07,.38,.38+Math.floor(rng()*8)*.01).convertSRGBToLinear(),hairTone=new T.Color().setHSL(.065,.25,.035+Math.floor(rng()*4)*.015);face.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const list=Array.isArray(o.material)?o.material:[o.material];o.material=list.map(m=>{const key=m.uuid+skinTone.getHexString()+hairTone.getHexString();if(materialCache.has(key))return materialCache.get(key);const c=m.clone();ownedM.push(c);materialCache.set(key,c);if(/^Skin/i.test(c.name)){c.color.copy(skinTone);c.roughness=.8;}if(/Hair|Eyebrows/i.test(c.name)){c.color.copy(hairTone);c.roughness=.9;}return c;});if(!Array.isArray(o.material)||o.material.length===1)o.material=o.material[0];});identity.add(face);
  // Match the whole athlete to the accepted civilian palette, including neck,
  // arms and legs. The new kit covers the old atlas clothing region.
  for(const skin of skins){const list=Array.isArray(skin.material)?skin.material:[skin.material];let changed=false;const next=list.map(m=>{if(!/Skin_CC0|Athlete_PBR_Atlas/.test(m.name))return m;changed=true;const c=m.clone();c.name='Skin_CC0_Athlete_Identity_V21';c.color.copy(skinTone);c.map=null;c.normalMap=null;c.roughnessMap=null;c.metalnessMap=null;c.roughness=.85;c.metalness=0;delete c.userData.athleteAtlas;ownedM.push(c);return c;});if(changed){changes.push({o:skin,material:skin.material});skin.material=Array.isArray(skin.material)?next:next[0];}}

  stats.actors++;stats.variants.push({id:actor.userData.id,prototype:prototype.record.id,width,depth,height,skin:skinTone.getHexString(),hair:hairTone.getHexString(),capOrientation:actor.userData.capOrientation});
  actor.userData.faceVariantV21=prototype.record.id;actor.userData.hairVariantV21={color:hairTone.getHexString(),capSafe:true};
 }
 root.userData.athleteIdentityVersion='V21';root.userData.athleteIdentitySeed=seed;
 return {stats,dispose(){for(const o of added)o.removeFromParent();for(const c of changes){if(c.geometry)c.o.geometry=c.geometry;if(c.visible!==undefined)c.o.visible=c.visible;if(c.material)c.o.material=c.material;}for(const g of ownedG)g.dispose();for(const m of ownedM)m.dispose();},update(){/* Rigid geometry follows the existing animated head bones. */}};
}

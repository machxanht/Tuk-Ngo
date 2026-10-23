import * as T from 'three';
import {athleteFaceIdentity} from './character-identity.mjs';

/** Heads grafted onto the old game rigs; all body attributes remain shared. */
export function createCharacterHeads(library,actors,headId){
 const sources=new Map(),masked=new Map(),materials=new Map(),entries=[],batches=[];
 const inverse=new T.Matrix4(),matrix=new T.Matrix4();let batchParent=null,batchDirty=true;
 library.scene.children.forEach(root=>sources.set(root.name,root));
 function mask(source){
  if(masked.has(source))return masked.get(source);
  const g=new T.BufferGeometry();for(const [name,attribute]of Object.entries(source.attributes))g.setAttribute(name,attribute);
  const {skinIndex:j,skinWeight:w,paintZone:z}=source.attributes,removed=new Uint8Array(j.count),indices=[];
  for(let i=0;i<j.count;i++){let amount=0;for(let k=0;k<4;k++)if(j.getComponent(i,k)===headId)amount+=w.getComponent(i,k);removed[i]=amount>.55&&(z.getX(i)===1||z.getX(i)===0)?1:0;}
  for(let i=0;i<source.index.count;i+=3){const a=source.index.getX(i),b=source.index.getX(i+1),c=source.index.getX(i+2);if(!removed[a]&&!removed[b]&&!removed[c])indices.push(a,b,c);}
  g.setIndex(indices);g.boundingSphere=source.boundingSphere;g.boundingBox=source.boundingBox;g.userData={...source.userData,faceOnlyMask:true};masked.set(source,g);return g;
 }
 function material(source,variant){
  const native=source.name==='Native athlete face skin',key=source.uuid+':'+(native?variant%4:0);
  if(!materials.has(key)){
   const m=new T.MeshLambertMaterial({name:source.name,map:source.map,color:source.color,side:source.side,transparent:source.transparent,opacity:source.opacity,alphaTest:source.alphaTest});
   if(native)m.color.setRGB(.56,.31,.15).multiplyScalar(.89+(variant%4)*.065);
   materials.set(key,m);
  }return materials.get(key);
 }
 for(const actor of actors){const head=new T.Group();head.name='Face_Only_'+actor.id;head.matrixAutoUpdate=false;actor.group.add(head);entries.push({actor,head,bone:actor.master.skeleton.bones[headId],identity:null});actor.face=head;}
 let seed=20261023;
 function randomize(next=seed+7919){seed=next;for(const e of entries){e.identity=athleteFaceIdentity(seed,e.actor.id);e.actor.identity=e.identity;e.head.clear();const root=sources.get(e.identity.model.toUpperCase()+'_'+e.identity.face);if(!root)throw Error('Missing face '+JSON.stringify(e.identity));e.head.add(root.clone(true));e.variant=null;}batchDirty=true;update();}
 function update(){for(const e of entries){e.head.matrix.copy(e.bone.matrixWorld);e.head.matrixWorldNeedsUpdate=true;
  if(e.variant!==e.actor.variant){e.head.traverse(o=>{if(o.isMesh){const source=o.userData.sourceMaterial||o.material;o.userData.sourceMaterial=source;o.material=material(source,e.actor.variant);}});e.variant=e.actor.variant;batchDirty=true;}
 }}
 function clearBatches(){for(const b of batches){b.mesh.removeFromParent();b.mesh.dispose();}batches.length=0;}
 function sync(boat,study=false){
  if(batchDirty||batchParent!==boat){clearBatches();batchParent=boat;const grouped=new Map();
   for(const e of entries)e.head.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.uuid;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push({entry:e,source:o});});
   for(const list of grouped.values()){const source=list[0].source,mesh=new T.InstancedMesh(source.geometry,source.material,list.length);mesh.name='Athlete_Faces_Batched';mesh.frustumCulled=false;boat.add(mesh);batches.push({mesh,list});}batchDirty=false;
  }
  inverse.copy(boat.matrixWorld).invert();
  for(const e of entries){e.head.visible=study;e.head.updateMatrixWorld(true);}
  for(const b of batches){b.mesh.visible=!study;if(study)continue;let count=0;for(const {entry,source} of b.list)if(entry.actor.group.visible)b.mesh.setMatrixAt(count++,matrix.multiplyMatrices(inverse,source.matrixWorld));b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;}
 }

 randomize(seed);
 return{mask,update,sync,randomize,entries,get materialCount(){return materials.size;},dispose(){clearBatches();for(const e of entries)e.actor.group.remove(e.head);for(const g of masked.values())g.dispose();for(const m of materials.values())m.dispose();masked.clear();materials.clear();}};
}

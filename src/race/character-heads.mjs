import * as T from 'three';
import {athleteFaceIdentity} from './character-identity.mjs';

/** Heads grafted onto the old game rigs; all body attributes remain shared. */
export function createCharacterHeads(library,actors,headId){
 const sources=new Map(),masked=new Map(),materials=new Map(),entries=[];
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
 function randomize(next=seed+7919){seed=next;for(const e of entries){e.identity=athleteFaceIdentity(seed,e.actor.id);e.actor.identity=e.identity;e.head.clear();const root=sources.get(e.identity.model.toUpperCase()+'_'+e.identity.face);if(!root)throw Error('Missing face '+JSON.stringify(e.identity));e.head.add(root.clone(true));}update();}
 function update(){for(const e of entries){e.head.matrix.copy(e.bone.matrixWorld);e.head.matrixWorldNeedsUpdate=true;e.head.traverse(o=>{if(o.isMesh){const source=o.userData.sourceMaterial||o.material;o.userData.sourceMaterial=source;o.material=material(source,e.actor.variant);}});}}
 randomize(seed);
 return{mask,update,randomize,entries,get materialCount(){return materials.size;},dispose(){for(const e of entries)e.actor.group.remove(e.head);for(const g of masked.values())g.dispose();for(const m of materials.values())m.dispose();masked.clear();materials.clear();}};
}

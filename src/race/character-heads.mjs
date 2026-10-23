import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {displayLod} from './render-lod.mjs';
import {athleteFaceIdentity} from './character-identity.mjs';

/** Heads grafted onto the old game rigs; all body attributes remain shared. */
export function createCharacterHeads(library,actors,headId){
 const sources=new Map(),masked=new Map(),materials=new Map(),entries=[],batches=[],coarse=new Map(),averages=new Map();
 const coarseMaterial=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
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
 function randomize(next=seed+7919){seed=next;for(const e of entries){e.identity=athleteFaceIdentity(seed,e.actor.id);e.actor.identity=e.identity;e.head.clear();const root=sources.get(e.identity.model.toUpperCase()+'_'+e.identity.face);if(!root)throw Error('Missing face '+JSON.stringify(e.identity));e.head.add(root.clone(true));e.head.traverse(o=>{if(o!==e.head){o.updateMatrix();o.matrixAutoUpdate=false;}});e.variant=null;}batchDirty=true;update();}
 function update(){for(const e of entries){e.head.matrix.copy(e.bone.matrixWorld);e.head.matrixWorldNeedsUpdate=true;
  if(e.variant!==e.actor.variant){e.head.traverse(o=>{if(o.isMesh){const source=o.userData.sourceMaterial||o.material;o.userData.sourceMaterial=source;o.material=material(source,e.actor.variant);}});e.variant=e.actor.variant;batchDirty=true;}
 }}
 async function prepareLod(){
  for(const [name,root]of sources){root.updateWorldMatrix(true,true);const baseInverse=new T.Matrix4().copy(root.parent.matrixWorld).invert(),parts=[];
   root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(baseInverse,o.matrixWorld)),m=o.material,native=m.name==='Native athlete face skin';
    for(const key of Object.keys(g.attributes))if(!['position','normal'].includes(key))g.deleteAttribute(key);for(const key of ['position','normal']){const a=g.attributes[key],array=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let c=0;c<a.itemSize;c++)array[i*a.itemSize+c]=a.getComponent(i,c);g.setAttribute(key,new T.Float32BufferAttribute(array,a.itemSize));}
    const color=m.color.clone();if(m.map){let average=averages.get(m.map);if(!average){try{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d');context.drawImage(m.map.image,0,0,1,1);const p=context.getImageData(0,0,1,1).data;average=new T.Color().setRGB(p[0]/255,p[1]/255,p[2]/255,T.SRGBColorSpace);canvas.width=canvas.height=0;}catch{average=new T.Color(/hair/i.test(m.name)?'#30251d':'#777777');}averages.set(m.map,average);}color.multiply(average);}
    const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<g.attributes.position.count;i++)color.toArray(colors,i*3);g.setAttribute('color',new T.BufferAttribute(colors,3));g.setAttribute('nativeSkin',new T.BufferAttribute(new Float32Array(g.attributes.position.count).fill(native?1:0),1));parts.push(g);
   });
   const merged=mergeGeometries(parts,false);if(!merged)throw Error('Cannot derive face display LOD');parts.forEach(g=>g.dispose());const reduced=await displayLod(merged,.12,.025,true);
   for(let tone=0;tone<4;tone++){const g=reduced.clone(),colors=Float32Array.from(reduced.attributes.color.array),skin=new T.Color().setRGB(.56,.31,.15).multiplyScalar(.89+tone*.065);for(let i=0;i<g.attributes.position.count;i++)if(g.attributes.nativeSkin.getX(i)>.5)skin.toArray(colors,i*3);g.setAttribute('color',new T.BufferAttribute(colors,3));coarse.set(name+':'+tone,g);}
   merged.dispose();reduced.dispose();
  }batchDirty=true;
 }
 function clearBatches(){for(const b of batches){b.mesh.removeFromParent();b.mesh.dispose();}batches.length=0;}
 function sync(boat,study=false,distance=0){const distant=!study&&distance>48&&coarse.size>0;
  if(batchDirty||batchParent!==boat){clearBatches();batchParent=boat;const grouped=new Map();
   for(const e of entries)e.head.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.uuid;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push({entry:e,source:o});});
   for(const list of grouped.values()){const source=list[0].source,mesh=new T.InstancedMesh(source.geometry,source.material,list.length);mesh.name='Athlete_Faces_Batched';mesh.frustumCulled=false;boat.add(mesh);batches.push({mesh,list});}
   const distantGroups=new Map();for(const e of entries){const g=coarse.get(e.identity.model.toUpperCase()+'_'+e.identity.face+':'+(e.actor.variant%4));if(!g)continue;if(!distantGroups.has(g))distantGroups.set(g,[]);distantGroups.get(g).push(e);}
   for(const [g,list]of distantGroups){const mesh=new T.InstancedMesh(g,coarseMaterial,list.length);mesh.name='Athlete_Distant_Faces';mesh.frustumCulled=false;boat.add(mesh);batches.push({mesh,list,coarse:true});}
   batchDirty=false;
  }
  inverse.copy(boat.matrixWorld).invert();
  for(const e of entries){if(distant)e.head.removeFromParent();else if(e.head.parent!==e.actor.group)e.actor.group.add(e.head);e.head.visible=study;if(distant)e.head.matrixWorld.multiplyMatrices(e.actor.group.matrixWorld,e.head.matrix);else e.head.updateMatrixWorld(true);}
  for(const b of batches){b.mesh.visible=!study&&(!!b.coarse===distant);if(!b.mesh.visible)continue;let count=0;if(b.coarse){for(const e of b.list)if(e.actor.group.visible)b.mesh.setMatrixAt(count++,matrix.multiplyMatrices(inverse,e.head.matrixWorld));}else{for(const {entry,source}of b.list)if(entry.actor.group.visible)b.mesh.setMatrixAt(count++,matrix.multiplyMatrices(inverse,source.matrixWorld));}b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;}
 }

 randomize(seed);
 return{mask,update,sync,prepareLod,randomize,entries,get materialCount(){return materials.size;},dispose(){clearBatches();for(const g of coarse.values())g.dispose();coarse.clear();coarseMaterial.dispose();for(const e of entries)e.actor.group.remove(e.head);for(const g of masked.values())g.dispose();for(const m of materials.values())m.dispose();masked.clear();materials.clear();}};
}

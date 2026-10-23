// Derived ceremony-only vertex animation. Source athlete and eight race rigs stay intact.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptSimplifier} from 'meshoptimizer';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
await MeshoptSimplifier.ready;
const path='public/assets/athlete-master/',raw=await readFile(path+'athlete-master.glb'),size=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+size)),bin=raw.subarray(28+size);
doc.buffers=[{byteLength:bin.length,uri:'data:application/octet-stream;base64,'+bin.toString('base64')}];
doc.images=[];doc.textures=[];for(const m of doc.materials){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
globalThis.ProgressEvent??=class {constructor(type,values){Object.assign(this,{type},values);}};
const gltf=await new GLTFLoader().parseAsync(JSON.stringify(doc),''),mixer=new T.AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations[0]).play();mixer.setTime(gltf.animations[0].duration*.28);gltf.scene.updateMatrixWorld(true);
const parts=[],references=[],simplify=new SimplifyModifier(),v=new T.Vector3(),baseBones=new Map(),headInverse=gltf.scene.getObjectByName('head').matrixWorld.clone().invert();let hairVertices=0,shortsVertices=0;
gltf.scene.traverse(o=>{if(o.isBone)baseBones.set(o.name,o.quaternion.clone());});
const sourcePosition=(mesh,i)=>mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).clone();
gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
const thighs=['l','r'].map(side=>{const hip=gltf.scene.getObjectByName('thigh_'+side).getWorldPosition(new T.Vector3()),knee=gltf.scene.getObjectByName('calf_'+side).getWorldPosition(new T.Vector3());return{hip,axis:knee.sub(hip)};});
let hiddenSkinTriangles=0,shortsTriangles=0;
gltf.scene.traverse(mesh=>{
 if(!mesh.isMesh)return;const name=mesh.material.name;if(/Cap|Paddle|Jersey/.test(name))return;
 const skin=/Skin/.test(name),hair=/Hair/.test(name),shorts=/Shorts/.test(name),original=Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>sourcePosition(mesh,i));
 const joints=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
 function influences(i){let shirt=0,pelvis=0,thigh=0;for(let k=0;k<4;k++){const bone=mesh.skeleton.bones[joints.getComponent(i,k)].name,w=weights.getComponent(i,k);if(/spine|clavicle|upperarm/.test(bone))shirt+=w;if(bone==='pelvis')pelvis+=w;if(/^thigh_/.test(bone))thigh+=w;}return{shirt,pelvis,thigh};}
 const hidden=i=>{if(!skin)return false;const p=original[i],w=influences(i),upperLeg=thighs.some(({hip,axis})=>{const t=p.clone().sub(hip).dot(axis)/axis.lengthSq();return t<.70&&t>-.22;});return p.y<.67&&(w.pelvis>.32||w.thigh>.35&&upperLeg);};
 // Weld by position, retaining an exact source vertex for each survivor. The
 // simplifier only removes indices: no vertex is moved or reattached by a
 // nearest-neighbour guess, so saluting cannot tear a cuff or a thigh.
 const keys=new Map(),sourceIds=[],positions=[],mapping=new Uint32Array(original.length);
 for(const [i,p]of original.entries()){const key=[p.x,p.y,p.z].map(n=>Math.round(n*1e5)).join(':');if(!keys.has(key)){keys.set(key,sourceIds.length);sourceIds.push(i);positions.push(p.x,p.y,p.z);}mapping[i]=keys.get(key);}
 const sourceIndex=mesh.geometry.index?.array||Uint32Array.from({length:original.length},(_,i)=>i),triangles=[];
 for(let i=0;i<sourceIndex.length;i+=3){const tri=[sourceIndex[i],sourceIndex[i+1],sourceIndex[i+2]];if(tri.every(hidden)){hiddenSkinTriangles++;continue;}const mapped=tri.map(i=>mapping[i]);if(new Set(mapped).size===3)triangles.push(...mapped);}
 const budget=skin?600:shorts?180:hair?120:10;
 // Close shots retain native body/shorts triangles. A coarsened thigh can
 // protrude through unchanged cloth even if its individual vertices stay put.
 const selected=skin||shorts?new Uint32Array(triangles):MeshoptSimplifier.simplify(new Uint32Array(triangles),new Float32Array(positions),3,Math.min(triangles.length,budget*3),.012,['LockBorder'])[0];
 const [far]=MeshoptSimplifier.simplify(new Uint32Array(triangles),new Float32Array(positions),3,Math.min(triangles.length,(skin?230:shorts?100:hair?60:4)*3),.06,[]);
 const used=[...new Set([...selected,...far])],remap=new Map(used.map((id,i)=>[id,i])),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(used.flatMap(i=>positions.slice(i*3,i*3+3)),3));g.setIndex(Array.from(selected,i=>remap.get(i)));g.userData.farIndices=Array.from(far,i=>remap.get(i));g.computeVertexNormals();
 if(shorts)shortsTriangles+=selected.length/3;
 const color=new T.Color(skin?'#c28d69':shorts?'#183047':/Sclera/.test(name)?'#fff1d9':/Iris/.test(name)?'#795037':'#292a26'),c=new Float32Array(used.length*3),zone=new Float32Array(used.length),scalp=new Float32Array(used.length*4);
 for(const [i,id]of used.entries()){
  const sourceIndex=sourceIds[id],point=original[sourceIndex],offset=new T.Vector3();color.toArray(c,i*3);
  if(skin){const {shirt}=influences(sourceIndex);zone[i]=shirt>.5||point.y>.68&&point.y<1.12&&Math.abs(point.x)<.20?1:0;}
  if(shorts)shortsVertices++;
  if(hair){hairVertices++;offset.fromBufferAttribute(g.attributes.normal,i).multiplyScalar(.006);v.fromBufferAttribute(g.attributes.position,i).add(offset);g.attributes.position.setXYZ(i,v.x,v.y,v.z);}
  if(skin||hair){const p=point.clone().applyMatrix4(headInverse);let weight=hair?2:0;if(skin)for(let k=0;k<4;k++)if(mesh.skeleton.bones[joints.getComponent(sourceIndex,k)].name==='head')weight+=weights.getComponent(sourceIndex,k);scalp.set([p.x,p.y,p.z,weight],i*4);}
  references.push({mesh,index:sourceIndex,offset});
 }
 g.setAttribute('color',new T.BufferAttribute(c,3));g.setAttribute('aKit',new T.BufferAttribute(zone,1));g.setAttribute('aScalp',new T.BufferAttribute(scalp,4));parts.push(g);
});
const farIndices=[];let partOffset=0;for(const part of parts){farIndices.push(...part.userData.farIndices.map(i=>i+partOffset));partOffset+=part.attributes.position.count;}
const geometry=mergeGeometries(parts,false);geometry.computeBoundingBox();
// Normals must cover vertices used exclusively by either LOD, too.
const normalSurface=new T.BufferGeometry();normalSurface.setAttribute('position',geometry.attributes.position);normalSurface.setIndex([...geometry.index.array,...farIndices]);normalSurface.computeVertexNormals();geometry.setAttribute('normal',normalSurface.attributes.normal);
if(geometry.attributes.position.count<200||geometry.index.count<900)throw Error('Ceremony LOD lost its anatomical silhouette');
const vertexCount=references.length,frames=24,variants=2,duration=2.8,pixels=new Float32Array(vertexCount*frames*variants*2*4),hatFrames=[];
const point=o=>o.getWorldPosition(new T.Vector3());
function aim(bone,target){
 const q=bone.getWorldQuaternion(new T.Quaternion()),axis=new T.Vector3(0,1,0).applyQuaternion(q),direction=target.clone().sub(point(bone)).normalize();
 q.premultiply(new T.Quaternion().setFromUnitVectors(axis,direction));bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));gltf.scene.updateMatrixWorld(true);
}
function arm(side,target){
 const upper=gltf.scene.getObjectByName('upperarm_'+side),lower=gltf.scene.getObjectByName('lowerarm_'+side),hand=gltf.scene.getObjectByName('hand_'+side),s=point(upper),a=lower.position.length(),b=hand.position.length(),delta=target.clone().sub(s),d=T.MathUtils.clamp(delta.length(),.08,a+b-.008),dir=delta.normalize(),pole=new T.Vector3(side==='l'?1:-1,.05,.65);
 pole.addScaledVector(dir,-pole.dot(dir)).normalize();const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),elbow=s.clone().addScaledVector(dir,along).addScaledVector(pole,height);
 aim(upper,elbow);aim(lower,s.clone().addScaledVector(dir,d));return hand;
}
for(let style=0;style<variants;style++)for(let f=0;f<frames;f++){
 const phase=f/frames*Math.PI*2;for(const [name,q]of baseBones)gltf.scene.getObjectByName(name).quaternion.copy(q);gltf.scene.updateMatrixWorld(true);
 const active=style?'l':'r',other=style?'r':'l',sign=style?1:-1,shoulder=point(gltf.scene.getObjectByName('upperarm_'+active));
 const hand=arm(active,new T.Vector3(shoulder.x+sign*(.12+Math.sin(phase)*.15),shoulder.y+.41+Math.cos(phase)*.07,shoulder.z+.12+Math.sin(phase)*.06));
 const resting=point(gltf.scene.getObjectByName('upperarm_'+other));arm(other,new T.Vector3(resting.x+(style?-.12:.12),resting.y-.28,resting.z+.25));
 const hp=point(hand);hatFrames.push([hp.x,hp.y+.035,hp.z+.015,.65+Math.sin(phase)*.3,style?-.5:.5,sign*(.3+Math.sin(phase)*.32)]);
 gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 references.forEach((r,i)=>{const p=sourcePosition(r.mesh,r.index).add(r.offset);geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);});normalSurface.computeVertexNormals();
 for(let i=0;i<vertexCount;i++)for(let kind=0;kind<2;kind++){
  const attr=geometry.attributes[kind?'normal':'position'],offset=((kind*variants*frames+style*frames+f)*vertexCount+i)*4;
  pixels.set([attr.getX(i),attr.getY(i),attr.getZ(i),1],offset);
 }
}
for(const [name,q]of baseBones)gltf.scene.getObjectByName(name).quaternion.copy(q);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
const cap=gltf.scene.getObjectByName('Race_Cap'),capSource=cap.geometry.clone();for(let i=0;i<capSource.attributes.position.count;i++){const p=sourcePosition(cap,i);capSource.attributes.position.setXYZ(i,p.x,p.y,p.z);}for(const k of Object.keys(capSource.attributes))if(k!=='position')capSource.deleteAttribute(k);
const weldedCap=mergeVertices(capSource),capGeo=simplify.modify(weldedCap,Math.max(0,weldedCap.attributes.position.count-70));capGeo.computeBoundingBox();const center=capGeo.boundingBox.getCenter(new T.Vector3());capGeo.translate(-center.x,-center.y,-center.z);capGeo.computeVertexNormals();
const attributes=g=>Object.fromEntries(Object.entries(g.attributes).map(([key,a])=>[key,{size:a.itemSize,array:Array.from(a.array,n=>Math.round(n*1e6)/1e6)}]));
const data={source:'MakeHuman/MPFB CC0, existing assembled athlete; derived seated hat salute',sourceSha256:createHash('sha256').update(raw).digest('hex'),pose:0.28,vertices:vertexCount,triangles:geometry.index.count/3,farIndices,farTriangles:farIndices.length/3,wardrobe:{strategy:'native shorts silhouette; covered skin removed; index-only LOD with exact animated source vertices',shortsVertices,shortsTriangles,nativeShortsPreserved:true,hiddenSkinTriangles,sourceVertexMapping:'exact',clothingShells:1},hair:{vertices:hairVertices,styles:4,strategy:'painted anatomical scalp plus raised source hair shell'},attributes:attributes(geometry),indices:Array.from(geometry.index.array),motion:{frames,variants,duration,width:vertexCount,height:frames*variants*2,encoding:'float32-base64',pixels:Buffer.from(pixels.buffer).toString('base64'),hatFrames},cap:{attributes:attributes(capGeo),indices:Array.from(capGeo.index.array),triangles:capGeo.index.count/3}};
const encoded=JSON.stringify(data)+'\n';await writeFile(path+'ceremony-crew.json',encoded);const digestPath='src/race/asset-digests.mjs',digests=(await readFile(digestPath,'utf8')).replace(/export const ceremonyCrewDigest='[^']*';\r?\n?/g,'');await writeFile(digestPath,digests+`export const ceremonyCrewDigest='${createHash('sha256').update(encoded).digest('hex')}';\n`);parts.forEach(g=>g.dispose());geometry.dispose();capSource.dispose();weldedCap.dispose();capGeo.dispose();console.log('Ceremony salute:',vertexCount,'vertices,',data.triangles,'triangles,',frames*variants,'poses, cap',data.cap.triangles,'triangles');

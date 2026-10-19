// Derived ceremony-only vertex animation. Source athlete and eight race rigs stay intact.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
const path='public/assets/athlete-master/',raw=await readFile(path+'athlete-master.glb'),size=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+size)),bin=raw.subarray(28+size);
doc.buffers=[{byteLength:bin.length,uri:'data:application/octet-stream;base64,'+bin.toString('base64')}];
doc.images=[];doc.textures=[];for(const m of doc.materials){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
globalThis.ProgressEvent??=class {constructor(type,values){Object.assign(this,{type},values);}};
const gltf=await new GLTFLoader().parseAsync(JSON.stringify(doc),''),mixer=new T.AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations[0]).play();mixer.setTime(gltf.animations[0].duration*.28);gltf.scene.updateMatrixWorld(true);
const parts=[],references=[],simplify=new SimplifyModifier(),v=new T.Vector3(),baseBones=new Map(),headInverse=gltf.scene.getObjectByName('head').matrixWorld.clone().invert();let hairVertices=0;
gltf.scene.traverse(o=>{if(o.isBone)baseBones.set(o.name,o.quaternion.clone());});
const sourcePosition=(mesh,i)=>mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).clone();
gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
gltf.scene.traverse(mesh=>{
 if(!mesh.isMesh)return;const name=mesh.material.name;if(/Cap|Paddle|Jersey/.test(name))return;
 const skin=/Skin/.test(name),hair=/Hair/.test(name),kit=false,target=skin?300:/Shorts/.test(name)?32:hair?64:6;
 const source=mesh.geometry.clone(),position=source.attributes.position,original=[];
 for(let i=0;i<position.count;i++){const p=sourcePosition(mesh,i);original.push(p);position.setXYZ(i,p.x,p.y,p.z);}
 for(const key of Object.keys(source.attributes))if(key!=='position')source.deleteAttribute(key);
 const welded=mergeVertices(source),g=simplify.modify(welded,Math.max(0,welded.attributes.position.count-target));source.dispose();welded.dispose();g.computeVertexNormals();
 if(hair){hairVertices+=g.attributes.position.count;for(let i=0;i<g.attributes.position.count;i++){v.fromBufferAttribute(g.attributes.position,i).addScaledVector(new T.Vector3().fromBufferAttribute(g.attributes.normal,i),.006);g.attributes.position.setXYZ(i,v.x,v.y,v.z);}}
 const color=new T.Color(kit?'#ffffff':/Skin/.test(name)?'#c28d69':/Shorts/.test(name)?'#1c3448':/Sclera/.test(name)?'#fff1d9':/Iris/.test(name)?'#795037':'#292a26'),c=new Float32Array(g.attributes.position.count*3),zone=new Float32Array(g.attributes.position.count),scalp=new Float32Array(g.attributes.position.count*4);zone.fill(kit?1:0);
 for(let i=0;i<zone.length;i++){
  color.toArray(c,i*3);v.fromBufferAttribute(g.attributes.position,i);let closest=0,d=Infinity;
  original.forEach((p,j)=>{const distance=p.distanceToSquared(v);if(distance<d){d=distance;closest=j;}});
  // Paint the distant body's torso/sleeves as one continuous uniform surface.
  // Independent decimation of a separate shirt can expose the underlying chest.
  if(skin){const joints=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;let garment=0;for(let k=0;k<4;k++){const bone=mesh.skeleton.bones[joints.getComponent(closest,k)].name;if(/spine|clavicle|upperarm/.test(bone))garment+=weights.getComponent(closest,k);}zone[i]=garment>.5||original[closest].y>.68&&original[closest].y<1.12&&Math.abs(original[closest].x)<.20?1:0;}
  if(skin||hair){const p=original[closest].clone().applyMatrix4(headInverse);let weight=hair?2:0;if(skin)for(let k=0;k<4;k++)if(mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(closest,k)].name==='head')weight+=mesh.geometry.attributes.skinWeight.getComponent(closest,k);scalp.set([p.x,p.y,p.z,weight],i*4);}
  references.push({mesh,index:closest,offset:v.clone().sub(original[closest])});
 }
 g.setAttribute('color',new T.BufferAttribute(c,3));g.setAttribute('aKit',new T.BufferAttribute(zone,1));g.setAttribute('aScalp',new T.BufferAttribute(scalp,4));parts.push(g);
});
const geometry=mergeGeometries(parts,false);geometry.computeBoundingBox();
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
 references.forEach((r,i)=>{const p=sourcePosition(r.mesh,r.index).add(r.offset);geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);});geometry.computeVertexNormals();
 for(let i=0;i<vertexCount;i++)for(let kind=0;kind<2;kind++){
  const attr=geometry.attributes[kind?'normal':'position'],offset=((kind*variants*frames+style*frames+f)*vertexCount+i)*4;
  pixels.set([attr.getX(i),attr.getY(i),attr.getZ(i),1],offset);
 }
}
for(const [name,q]of baseBones)gltf.scene.getObjectByName(name).quaternion.copy(q);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
const cap=gltf.scene.getObjectByName('Race_Cap'),capSource=cap.geometry.clone();for(let i=0;i<capSource.attributes.position.count;i++){const p=sourcePosition(cap,i);capSource.attributes.position.setXYZ(i,p.x,p.y,p.z);}for(const k of Object.keys(capSource.attributes))if(k!=='position')capSource.deleteAttribute(k);
const weldedCap=mergeVertices(capSource),capGeo=simplify.modify(weldedCap,Math.max(0,weldedCap.attributes.position.count-70));capGeo.computeBoundingBox();const center=capGeo.boundingBox.getCenter(new T.Vector3());capGeo.translate(-center.x,-center.y,-center.z);capGeo.computeVertexNormals();
const attributes=g=>Object.fromEntries(Object.entries(g.attributes).map(([key,a])=>[key,{size:a.itemSize,array:Array.from(a.array,n=>Math.round(n*1e6)/1e6)}]));
const data={source:'MakeHuman/MPFB CC0, existing assembled athlete; derived seated hat salute',sourceSha256:createHash('sha256').update(raw).digest('hex'),pose:0.28,vertices:vertexCount,triangles:geometry.index.count/3,hair:{vertices:hairVertices,styles:4,strategy:'painted anatomical scalp plus raised source hair shell'},attributes:attributes(geometry),indices:Array.from(geometry.index.array),motion:{frames,variants,duration,width:vertexCount,height:frames*variants*2,encoding:'float32-base64',pixels:Buffer.from(pixels.buffer).toString('base64'),hatFrames},cap:{attributes:attributes(capGeo),indices:Array.from(capGeo.index.array),triangles:capGeo.index.count/3}};
const encoded=JSON.stringify(data)+'\n';await writeFile(path+'ceremony-crew.json',encoded);const digestPath='src/race/asset-digests.mjs',digests=(await readFile(digestPath,'utf8')).replace(/export const ceremonyCrewDigest='[^']*';\r?\n?/g,'');await writeFile(digestPath,digests+`export const ceremonyCrewDigest='${createHash('sha256').update(encoded).digest('hex')}';\n`);parts.forEach(g=>g.dispose());geometry.dispose();capSource.dispose();weldedCap.dispose();capGeo.dispose();console.log('Ceremony salute:',vertexCount,'vertices,',data.triangles,'triangles,',frames*variants,'poses, cap',data.cap.triangles,'triangles');

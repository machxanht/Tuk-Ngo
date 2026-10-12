import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {profile,legacyProfile,END_FAIRING_START} from '../src/race/boat.mjs';

// Append only replacement static hull attributes. Crew positions, skinning,
// animation, textures and the original buffer remain byte-for-byte intact.
const source='public/assets/ghe-ngo/ghe-ngo-crew-v13.glb',destination='public/assets/ghe-ngo/ghe-ngo-crew-v15.glb';
const raw=fs.readFileSync(source),jsonLength=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+jsonLength)),original=raw.subarray(28+jsonLength);
function pack(j,bin){const text=Buffer.from(JSON.stringify(j)),pad=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+pad.length+bin.length,8);h.writeUInt32LE(pad.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([h,pad,bh,bin]);}
const geometryDoc=structuredClone(doc);delete geometryDoc.images;delete geometryDoc.textures;delete geometryDoc.samplers;
for(const m of geometryDoc.materials){delete m.pbrMetallicRoughness?.baseColorTexture;delete m.normalTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
const bytes=pack(geometryDoc,original),model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');model.scene.updateMatrixWorld(true);
const hull=model.scene.getObjectByName('Boat_Hull_and_Structure');if(!hull)throw Error('Hull structure missing');
const chunks=[original],changes=[],clonedNodes=new Map();let length=original.length;
function accessor(values,type,min,max){const bytes=Buffer.from(values.buffer,values.byteOffset,values.byteLength),padding=Buffer.alloc((4-length%4)%4);chunks.push(padding,bytes);length+=padding.length;const vi=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length,target:34962});length+=bytes.length;const ai=doc.accessors.length;doc.accessors.push({bufferView:vi,componentType:5126,count:values.length/3,type,...(min?{min,max}:{})});return ai;}
function originalNode(object){for(let o=object;o;o=o.parent){const a=model.parser.associations.get(o);if(a?.nodes!==undefined)return a.nodes;}throw Error('Static node association missing: '+object.name);}
const rootInverse=model.scene.matrixWorld.clone().invert(),point=new T.Vector3();
hull.traverse(mesh=>{
 if(!mesh.isMesh)return;const association=model.parser.associations.get(mesh);if(association?.meshes===undefined)return;
 const geometry=mesh.geometry.clone(),pos=geometry.getAttribute('position'),values=new Float32Array(pos.count*3),coordinates=[],world=model.scene.matrixWorld.clone().multiply(rootInverse).multiply(mesh.matrixWorld),inverse=world.clone().invert();let count=0,maxShift=0;
 let parent=mesh,name='';while(parent&&parent!==hull){name+=' '+parent.name;parent=parent.parent;}
 const shell=name.includes('Hull_Watertight');
 for(let v=0;v<pos.count;v++){
  point.fromBufferAttribute(pos,v).applyMatrix4(world);coordinates.push(point.x);
  if(Math.abs(point.x)>END_FAIRING_START&&Math.abs(point.x)<=15.12){const old=legacyProfile(point.x),next=profile(point.x),y=point.y;
   if(shell&&old.g-old.k>.0001)point.y=next.k+(point.y-old.k)/(old.g-old.k)*(next.g-next.k);
   else if(name.includes('Kem_Spine'))point.y+=next.k-old.k;
   else point.y+=next.g-old.g;
   maxShift=Math.max(maxShift,Math.abs(point.y-y));count++;
  }
  point.applyMatrix4(inverse);values.set(point.toArray(),v*3);
 }
 if(!count||maxShift<1e-8){geometry.dispose();return;}
 geometry.setAttribute('position',new T.BufferAttribute(values,3));geometry.computeVertexNormals();geometry.computeBoundingBox();
 const normal=geometry.getAttribute('normal'),oldNormal=mesh.geometry.getAttribute('normal'),normals=new Float32Array(normal.count*3);
 for(let v=0;v<normal.count;v++){point.fromBufferAttribute(normal,v);if(point.lengthSq()<.5)point.fromBufferAttribute(oldNormal,v);point.normalize();normals.set(point.toArray(),v*3);}
 const node=originalNode(mesh);if(!clonedNodes.has(node)){const copy=structuredClone(doc.meshes[doc.nodes[node].mesh]);clonedNodes.set(node,doc.meshes.length);doc.meshes.push(copy);doc.nodes[node].mesh=doc.meshes.length-1;}
 const primitive=doc.meshes[clonedNodes.get(node)].primitives[association.primitives??0];primitive.attributes.POSITION=accessor(values,'VEC3',geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray());primitive.attributes.NORMAL=accessor(normals,'VEC3');
 changes.push({name:mesh.name,verticesChanged:count,maxVerticalShiftM:maxShift,shell});geometry.dispose();
});
if(!changes.some(c=>c.shell))throw Error('Outer hull not modified');
const root=doc.nodes[doc.scenes[doc.scene||0].nodes[0]];root.extras={...root.extras,hullRevision:'V15_C2_FAIRING_UNOCCUPIED_TIPS',crewRevision:'V13_CONTINUOUS_GARMENT_BOUNDARIES'};
const bin=Buffer.concat(chunks);doc.buffers=[{byteLength:bin.length}];const output=pack(doc,bin);fs.writeFileSync(destination,output);
const validation=await validateBytes(new Uint8Array(output),{uri:destination,maxIssues:100});if(validation.issues.numErrors||validation.issues.numWarnings)throw Error(JSON.stringify(validation.issues.messages));
const oldDoc=JSON.parse(raw.subarray(20,20+jsonLength));if(JSON.stringify(doc.animations)!==JSON.stringify(oldDoc.animations)||JSON.stringify(doc.skins)!==JSON.stringify(oldDoc.skins))throw Error('Crew/animation changed');
const report={pass:true,source,destination,outputBytes:output.length,originalBufferSHA256:crypto.createHash('sha256').update(original).digest('hex'),originalBufferBytes:original.length,originalBufferRetained:bin.subarray(0,original.length).equals(original),animationsUnchanged:true,skinsUnchanged:true,occupiedRegionUnchangedAbsXM:END_FAIRING_START,changes,validator:{errors:0,warnings:0}};
fs.mkdirSync('docs/qa/crew-v15',{recursive:true});fs.writeFileSync('docs/qa/crew-v15/hull-fairing-check.json',JSON.stringify(report,null,2)+'\n');console.log({pass:true,changedPrimitives:changes.length,bytes:output.length,maxShiftM:Math.max(...changes.map(c=>c.maxVerticalShiftM))});

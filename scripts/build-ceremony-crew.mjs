// A derived, distant seated crew. The source shirt, body and rigs stay intact.
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
const gltf=await new GLTFLoader().parseAsync(JSON.stringify(doc),''),mixer=new T.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations[0]).play();mixer.setTime(gltf.animations[0].duration*.28);gltf.scene.updateMatrixWorld(true);
const parts=[],simplify=new SimplifyModifier(),v=new T.Vector3();
gltf.scene.traverse(mesh=>{
 if(!mesh.isMesh)return;const name=mesh.material.name;
 if(/Eye|Iris|Pupil|Sclera|Paddle/.test(name))return;
 const kit=/Jersey/.test(name),target=/Skin/.test(name)?160:kit?58:/Shorts/.test(name)?32:24;
 const source=mesh.geometry.clone(),position=source.attributes.position;
 if(mesh.isSkinnedMesh)mesh.skeleton.update();
 for(let i=0;i<position.count;i++){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);position.setXYZ(i,v.x,v.y,v.z);}
 for(const key of Object.keys(source.attributes))if(key!=='position')source.deleteAttribute(key);
 const welded=mergeVertices(source),g=simplify.modify(welded,Math.max(0,welded.attributes.position.count-target));source.dispose();welded.dispose();g.computeVertexNormals();
 const color=new T.Color(kit?'#ffffff':/Skin/.test(name)?'#c28d69':/Shorts/.test(name)?'#1c3448':/Cap/.test(name)?'#fff4d7':'#292a26'),c=new Float32Array(g.attributes.position.count*3),zone=new Float32Array(g.attributes.position.count);zone.fill(kit?1:0);for(let i=0;i<zone.length;i++)color.toArray(c,i*3);
 g.setAttribute('color',new T.BufferAttribute(c,3));g.setAttribute('aKit',new T.BufferAttribute(zone,1));parts.push(g);
});
const geometry=mergeGeometries(parts,false);geometry.computeBoundingBox();
if(geometry.attributes.position.count<200||geometry.index.count<900)throw Error('Ceremony LOD lost its anatomical silhouette');
const data={source:'MakeHuman/MPFB CC0, existing assembled athlete; distant seated ceremony LOD',sourceSha256:createHash('sha256').update(raw).digest('hex'),pose:0.28,vertices:geometry.attributes.position.count,triangles:geometry.index.count/3,bounds:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([key,a])=>[key,{size:a.itemSize,array:Array.from(a.array,number=>Math.round(number*1e6)/1e6)}])),indices:Array.from(geometry.index.array)};
await writeFile(path+'ceremony-crew.json',JSON.stringify(data)+'\n');parts.forEach(g=>g.dispose());geometry.dispose();console.log('Ceremony crew:',data.vertices,'vertices,',data.triangles,'triangles');

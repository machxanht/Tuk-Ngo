import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {finishAthleteShirt} from '../src/race/athlete-finish.mjs';

const data=JSON.parse(await readFile('public/assets/illustrated-v22/shirt-runtime-v32.json','utf8'));
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.vertices.flatMap(v=>v.position),3));g.setIndex(data.indices);
const positions=Buffer.from(g.attributes.position.array.buffer).toString('hex'),indices=Buffer.from(g.index.array.buffer).toString('hex');
finishAthleteShirt({geometry:g,material:()=>new T.MeshLambertMaterial()});
assert.equal(g.attributes.position.count,533);assert.equal(g.index.count/3,896);
assert.equal(Buffer.from(g.attributes.position.array.buffer).toString('hex'),positions);assert.equal(Buffer.from(g.index.array.buffer).toString('hex'),indices);
const distances=g.attributes.collarDistance.array;assert.ok([...distances].every(v=>Number.isFinite(v)&&v>=0));
// The central chest must stay jersey-coloured even when its triangle reaches
// the neckline. Trim belongs only to the actual collar boundary.
const chest=data.vertices.map((v,i)=>({p:v.position,d:distances[i]})).filter(v=>Math.abs(v.p[0])<.06&&v.p[1]>1.10&&v.p[1]<1.25&&v.p[2]>.03);
assert.ok(chest.length>0);assert.ok(chest.every(v=>v.d>.025));assert.ok([...distances].filter(v=>v<1e-7).length>8);

async function glb(file){const b=await readFile(file);assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);const length=b.readUInt32LE(12);return {doc:JSON.parse(b.subarray(20,20+length)),bin:b.subarray(28+length)};}
const {doc:equipment}=await glb('public/assets/athlete-master/athlete-details.glb');
for(const name of ['Race_Cap','Race_Hair','Race_Paddle'])assert.ok(equipment.nodes.some(n=>n.name===name),name);
const paddle=equipment.nodes.find(n=>n.name==='Race_Paddle'),positionsAccessor=equipment.accessors[equipment.meshes[paddle.mesh].primitives[0].attributes.POSITION];
assert.ok(Math.abs(positionsAccessor.min[1]+1.52)<1e-5);assert.ok(Math.abs(positionsAccessor.max[1])<.01);
const {doc:master}=await glb('public/assets/athlete-master/athlete-master.glb');
assert.equal(master.animations.length,1,'Body, cloth and paddle must play in one clip');
const animated=new Set(master.animations[0].channels.map(c=>master.nodes[c.target.node].name));
assert.ok([...animated].some(n=>n.includes('Shirt')));assert.ok(animated.has('Dam_Wood_152cm'));assert.ok(animated.has('head'));
const rootNodes=new Set(master.scenes[master.scene||0].nodes);
master.nodes.forEach((node,i)=>{if(node.skin!==undefined)assert.ok(rootNodes.has(i),'Skin must be a scene root');});
console.log('Athlete: unchanged shirt geometry; narrow geometric collar; fitted equipment; synchronized standalone GLB.');

import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createHash} from 'node:crypto';
import {correctedRowingClip} from '../src/race/rowing-pose.mjs';

const base='public/assets/illustrated-v22/',loader=new GLTFLoader();
async function glb(file){const raw=await readFile(file),size=raw.readUInt32LE(12);return {doc:JSON.parse(raw.subarray(20,20+size)),bin:raw.subarray(28+size),raw};}
function values(doc,bin,index){const a=doc.accessors[index],view=doc.bufferViews[a.bufferView],start=(view.byteOffset||0)+(a.byteOffset||0);return new Float32Array(bin.buffer.slice(bin.byteOffset+start,bin.byteOffset+start+a.count*16*4));}
const body=await glb(base+'athlete-rig-v27.glb'),skin=body.doc.skins[0],jointSet=new Set(skin.joints),inverse=values(body.doc,body.bin,skin.inverseBindMatrices);
function context(){
 const nodes=body.doc.nodes.map((n,i)=>{const o=jointSet.has(i)?new T.Bone():new T.Object3D();o.name=n.name||'';if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});
 body.doc.nodes.forEach((n,i)=>n.children?.forEach(child=>nodes[i].add(nodes[child])));
 const root=new T.Group();for(const i of body.doc.scenes[body.doc.scene||0].nodes)root.add(nodes[i]);root.updateMatrixWorld(true);
 return {root,skeleton:new T.Skeleton(skin.joints.map(i=>nodes[i]),skin.joints.map((_,i)=>new T.Matrix4().fromArray(inverse,i*16))),paddle:root.getObjectByName('Dam_Wood_152cm')};
}
const names=['seated-port','seated-starboard','standing-port','standing-starboard','caller','controller','helm','helm-starboard','bow-spear'];
const template=await glb(base+'motion-seated-port-v25.glb');
const doc={asset:{version:'2.0',generator:'Tuk Ngo calibrated rowing; original source files preserved'},scene:0,scenes:structuredClone(template.doc.scenes),nodes:structuredClone(template.doc.nodes),animations:[],buffers:[{byteLength:0}],bufferViews:[],accessors:[]},chunks=[];
let length=0;
function attribute(array,type){const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length});chunks.push(bytes);length+=bytes.length;const id=doc.accessors.length,itemSize={SCALAR:1,VEC3:3,VEC4:4}[type],a={bufferView:view,componentType:5126,count:array.length/itemSize,type};if(type==='SCALAR'){a.min=[array[0]];a.max=[array.at(-1)];}doc.accessors.push(a);return id;}
const nodeIds=new Map(doc.nodes.map((n,i)=>[n.name,i]));
for(const name of names){
 const role=name.startsWith('helm')?'helm':['caller','controller','bow-spear'].includes(name)?name:'rower',posture=name.startsWith('seated')||name==='caller'?'seated':'standing',side=name.endsWith('starboard')?1:-1;
 // The source labels describe the unrotated athlete. Boat yaw reverses the
 // lateral axis; swap the source hand roles before fitting the final stance.
 const source=role==='rower'?posture+(side<0?'-starboard':'-port'):role==='helm'?(side<0?'helm-starboard':'helm'):name==='bow-spear'?'controller':name;
 const file=await glb(base+'motion-'+source+'-v25.glb'),gltf=await loader.parseAsync(file.raw.buffer.slice(file.raw.byteOffset,file.raw.byteOffset+file.raw.byteLength),'');
 const master=context();master.clip=gltf.animations[0];
 if(name==='bow-spear'||name==='caller'){
  const grip=await glb(base+'motion-seated-starboard-v25.glb'),reference=await loader.parseAsync(grip.raw.buffer.slice(grip.raw.byteOffset,grip.raw.byteOffset+grip.raw.byteLength),'');
  const fingers=new Map(reference.animations[0].tracks.filter(t=>/^(index|middle|ring|pinky|thumb)_\d\d_[lr]\.quaternion$/.test(t.name)).map(t=>[t.name,Array.from(t.createInterpolant().evaluate(reference.animations[0].duration*.28))]));
  master.clip.tracks=master.clip.tracks.map(t=>fingers.has(t.name)?new T.QuaternionKeyframeTrack(t.name,Float32Array.of(0,master.clip.duration),Float32Array.from([...fingers.get(t.name),...fingers.get(t.name)])):t);
 }
 master.mixer=new T.AnimationMixer(master.root);master.mixer.clipAction(master.clip).play();
 const clip=correctedRowingClip(master,{name,role,posture,side}),animation={name,samplers:[],channels:[]};
 for(const track of clip.tracks){
  const {nodeName,propertyName}=T.PropertyBinding.parseTrackName(track.name),size=track.getValueSize(),path={position:'translation',quaternion:'rotation',scale:'scale'}[propertyName];let times=track.times,output=track.values;
  let constant=true;for(let i=size;i<output.length;i++)if(Math.abs(output[i]-output[i%size])>1e-6){constant=false;break;}
  if(constant){times=Float32Array.of(0,clip.duration);output=Float32Array.from([...output.subarray(0,size),...output.subarray(0,size)]);}
  animation.channels.push({sampler:animation.samplers.length,target:{node:nodeIds.get(nodeName),path}});
  if(!nodeIds.has(nodeName))throw Error('Missing motion node '+nodeName);
  animation.samplers.push({input:attribute(times,'SCALAR'),output:attribute(output,size===4?'VEC4':'VEC3'),interpolation:'LINEAR'});
 }
 doc.animations.push(animation);master.mixer.stopAllAction();master.mixer.uncacheRoot(master.root);
}
doc.buffers[0].byteLength=length;const json=Buffer.from(JSON.stringify(doc)),padding=Buffer.alloc((4-json.length%4)%4,32),bin=Buffer.concat(chunks),header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+padding.length+bin.length,8);header.writeUInt32LE(json.length+padding.length,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(bin.length);binaryHeader.writeUInt32LE(0x004e4942,4);
const out=Buffer.concat([header,json,padding,binaryHeader,bin]);await writeFile('public/assets/athlete-master/rowing-motion.glb',out);console.log(`Calibrated ${doc.animations.length} shared role clips: ${out.length} bytes.`);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const ceremonyDigest=digest(await readFile('public/assets/athlete-master/ceremony-crew.json'));
await writeFile('src/race/asset-digests.mjs',`// Generated content addresses; the page URL stays stable.\nexport const rowingMotionDigest='${digest(out)}';\nexport const athleteMasterDigest='${digest(await readFile('public/assets/athlete-master/athlete-master.glb'))}';\nexport const crowdAssetDigest='${digest(await readFile('public/assets/festival-crowd/crowd-compact.json'))}';\nexport const ceremonyCrewDigest='${ceremonyDigest}';\n`);

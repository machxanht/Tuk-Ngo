import fs from 'node:fs';
import crypto from 'node:crypto';
const decode=path=>{const raw=fs.readFileSync(path),n=raw.readUInt32LE(12);return {json:JSON.parse(raw.subarray(20,20+n)),bin:raw.subarray(28+n)};};
const old=decode('public/assets/ghe-ngo/ghe-ngo-crew-v9.glb'),fresh=decode('../asset-studio/crew-v12/crew-dedup.glb');
const a=old.json,b=fresh.json,offset={};
function paths(document){const result=new Map();function walk(id,prefix){const node=document.nodes[id],path=prefix+'/'+(node.name||'unnamed');result.set(id,path);for(const c of node.children||[])walk(c,path);}for(const id of document.scenes[document.scene||0].nodes)walk(id,'');return result;}
const basePaths=paths(b);
const support=new Map(JSON.parse(fs.readFileSync('docs/qa/crew-v12/support-plan.json','utf8')).map(p=>[p.id,p]));
function appendAccessor(bytes,definition){const start=fresh.bin.length;fresh.bin=Buffer.concat([fresh.bin,bytes]);const view=b.bufferViews.length;b.bufferViews.push({buffer:0,byteOffset:start,byteLength:bytes.length});const index=b.accessors.length;b.accessors.push({...definition,bufferView:view,byteOffset:0});return index;}
function readElement(id,i,k=0){const ac=b.accessors[id],view=b.bufferViews[ac.bufferView],size=ac.componentType===5126||ac.componentType===5125?4:2,n=ac.type==='VEC3'?3:ac.type==='VEC2'?2:1,o=(view.byteOffset||0)+(ac.byteOffset||0)+i*(view.byteStride||size*n)+k*size;return ac.componentType===5126?fresh.bin.readFloatLE(o):ac.componentType===5125?fresh.bin.readUInt32LE(o):fresh.bin.readUInt16LE(o);}
const maskedMeshes=new Set();
function maskCoveredSkin(i,plan){const node=b.nodes[i];if(node.mesh!==undefined&&!maskedMeshes.has(node.mesh)){maskedMeshes.add(node.mesh);for(const p of b.meshes[node.mesh].primitives){if(b.materials[p.material]?.name!=='Skin_CC0_Asian_Male')continue;const count=b.accessors[p.indices].count,kept=[],forward=plan.role==='BOW_CALLER'?-1:1,mirror=plan.side>0?-1:1;for(let v=0;v<count;v+=3){const face=[0,1,2].map(k=>readElement(p.indices,v+k));const covered=face.every(id=>{const x=forward*mirror*(-readElement(p.attributes.POSITION,id,2)-plan.lat),z=readElement(p.attributes.POSITION,id,1)-(plan.hip-.898671);return z>.885&&z<1.285&&Math.abs(x)<(z<1.205?.23:.167);});if(!covered)kept.push(...face);}if(kept.length<count){const bytes=Buffer.from(Uint32Array.from(kept).buffer);p.indices=appendAccessor(bytes,{type:'SCALAR',componentType:5125,count:kept.length});}}}for(const c of node.children||[])maskCoveredSkin(c,plan);}
for(const [i,node] of b.nodes.entries()){const match=node.name?.match(/^Athlete_(\d+)_(ROWER|BOW_CALLER|MID_CONTROLLER|HELMSMAN)$/);if(match)maskCoveredSkin(i,support.get(Number(match[1])));}
for(const n of b.nodes){const match=n.name?.match(/^Athlete_(\d+)_(ROWER|BOW_CALLER|MID_CONTROLLER|HELMSMAN)$/);if(match){const id=Number(match[1]),role=match[2],posture=role==='BOW_CALLER'||(role==='ROWER'&&id<18)?'seated':'standing';n.extras={...n.extras,component:'athlete',id,role,posture,capOrientation:id%3===0?'forward':'backward'};}const p=n.name?.match(/^Paddle_(\d+)$/),s=n.name?.match(/^Steering_Oar_(\d+)$/);if(p||s){const id=p?Number(p[1]):52+Number(s[1]),length=s?4.2:id<18?1.52:1.75;n.extras={...n.extras,component:'paddle',id,role:p?'ROWER':'HELMSMAN',lengthM:length,length};}}
// Crop the shaped text's transparent margins through UVs, keeping the glyphs
// crisp across the full shirt print patch without resampling the raster.
const printUVs=new Map();
for(const m of b.meshes)for(const p of m.primitives)if(b.materials[p.material]?.name==='Khmer_Back_Print_Only'){
 const key=p.attributes.TEXCOORD_0;if(!printUVs.has(key))printUVs.set(key,new Set());
 const ix=b.accessors[p.indices],v=b.bufferViews[ix.bufferView],base=(v.byteOffset||0)+(ix.byteOffset||0),width=ix.componentType===5125?4:ix.componentType===5123?2:1;
 for(let i=0;i<ix.count;i++)printUVs.get(key).add(width===4?fresh.bin.readUInt32LE(base+i*width):width===2?fresh.bin.readUInt16LE(base+i*width):fresh.bin[base+i]);
}
for(const [index,vertices] of printUVs){const acc=b.accessors[index],view=b.bufferViews[acc.bufferView],stride=view.byteStride||8;let minU=Infinity;for(const i of vertices)minU=Math.min(minU,fresh.bin.readFloatLE((view.byteOffset||0)+(acc.byteOffset||0)+i*stride));if(minU>.1)continue;for(const i of vertices){const o=(view.byteOffset||0)+(acc.byteOffset||0)+i*stride;fresh.bin.writeFloatLE(.329+fresh.bin.readFloatLE(o)*.344,o);fresh.bin.writeFloatLE(.234+fresh.bin.readFloatLE(o+4)*.484,o+4);}}
// Explicit role kit colors. Blender's non-node material fallback exports .8 gray;
// author the glTF factors too, and keep each role's material slots independent.
const caller=b.materials.findIndex(m=>m.name==='Caller_Olive');
if(caller>=0)b.materials[caller].pbrMetallicRoughness.baseColorFactor=[.12,.19,.07,1];
const controller=b.materials.length;b.materials.push({name:'Controller_Light_Blue',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.12,.55,.78,1],roughnessFactor:.85,metallicFactor:0}});
const ctl=b.nodes.find(n=>n.name==='Athlete_52_MID_CONTROLLER');
function controllerKit(i){const n=b.nodes[i];if(n.mesh!==undefined){const mesh=structuredClone(b.meshes[n.mesh]);let changed=false;for(const p of mesh.primitives)if(['Caller_Olive','Competition_Green_Fabric','Green_Ribbed_Binding'].includes(b.materials[p.material]?.name)){p.material=controller;changed=true;}if(changed){n.mesh=b.meshes.length;b.meshes.push(mesh);}}for(const c of n.children||[])controllerKit(c);}
ctl.children.forEach(controllerKit);
// Reflected rigs paddle the opposite bank; keep Khmer lettering readable.
// Future Blender builds flip print UVs and mark that work. Existing build
// data receives the equivalent standard glTF texture transform here.
const reflectedMaterials=new Map(),reflectedMeshes=new Map();
function readablePrint(i){const node=b.nodes[i];if(node.mesh!==undefined){const oldMesh=node.mesh;if(!reflectedMeshes.has(oldMesh)){const mesh=structuredClone(b.meshes[oldMesh]);let changed=false;for(const p of mesh.primitives){const material=b.materials[p.material];if(material?.name!=='Khmer_Back_Print_Only')continue;if(!reflectedMaterials.has(p.material)){const copy=structuredClone(material);copy.name='Khmer_Back_Print_Readable';copy.pbrMetallicRoughness.baseColorTexture.extensions={KHR_texture_transform:{offset:[1.002,0],scale:[-1,1]}};reflectedMaterials.set(p.material,b.materials.length);b.materials.push(copy);}p.material=reflectedMaterials.get(p.material);changed=true;}if(changed){reflectedMeshes.set(oldMesh,b.meshes.length);b.meshes.push(mesh);}else reflectedMeshes.set(oldMesh,oldMesh);}node.mesh=reflectedMeshes.get(oldMesh);}for(const c of node.children||[])readablePrint(c);}
for(const [i,node] of b.nodes.entries())if(node.extras?.component==='athlete'&&node.scale?.[0]<0&&!node.extras.backPrintReadable)readablePrint(i);
if(reflectedMaterials.size)b.extensionsUsed=[...new Set([...(b.extensionsUsed||[]),'KHR_texture_transform'])];
for(const key of ['nodes','meshes','skins','materials','textures','images','samplers','accessors','bufferViews'])offset[key]=a[key]?.length||0;
for(const v of b.bufferViews||[]){v.buffer=0;v.byteOffset=(v.byteOffset||0)+old.bin.length;}
for(const x of b.accessors||[]){if(x.bufferView!==undefined)x.bufferView+=offset.bufferViews;if(x.sparse){x.sparse.indices.bufferView+=offset.bufferViews;x.sparse.values.bufferView+=offset.bufferViews;}}
for(const i of b.images||[])if(i.bufferView!==undefined)i.bufferView+=offset.bufferViews;
for(const t of b.textures||[]){if(t.sampler!==undefined)t.sampler+=offset.samplers;if(t.source!==undefined)t.source+=offset.images;}
for(const m of b.materials||[]){for(const k of ['normalTexture','occlusionTexture','emissiveTexture'])if(m[k])m[k].index+=offset.textures;for(const k of ['baseColorTexture','metallicRoughnessTexture'])if(m.pbrMetallicRoughness?.[k])m.pbrMetallicRoughness[k].index+=offset.textures;}
for(const m of b.meshes||[])for(const p of m.primitives){for(const k in p.attributes)p.attributes[k]+=offset.accessors;if(p.indices!==undefined)p.indices+=offset.accessors;if(p.material!==undefined)p.material+=offset.materials;for(const t of p.targets||[])for(const k in t)t[k]+=offset.accessors;}
for(const s of b.skins||[]){s.joints=s.joints.map(i=>i+offset.nodes);if(s.skeleton!==undefined)s.skeleton+=offset.nodes;if(s.inverseBindMatrices!==undefined)s.inverseBindMatrices+=offset.accessors;}
for(const n of b.nodes||[]){if(n.children)n.children=n.children.map(i=>i+offset.nodes);if(n.mesh!==undefined)n.mesh+=offset.meshes;if(n.skin!==undefined)n.skin+=offset.skins;}
for(const clip of b.animations||[]){clip.name='Rowing_Real_2024_Roles_80SPM';for(const s of clip.samplers){s.input+=offset.accessors;s.output+=offset.accessors;}for(const c of clip.channels)c.target.node+=offset.nodes;}
const rootIndex=a.scenes[a.scene||0].nodes[0],hullIndex=a.nodes.findIndex(n=>n.name==='Boat_Hull_and_Structure');
a.nodes[rootIndex].children=[hullIndex,...b.scenes[b.scene||0].nodes.map(i=>i+offset.nodes)];
a.nodes[rootIndex].extras={...a.nodes[rootIndex].extras,crewRevision:'V12_FEET_INSIDE_HULL',seatedPairs:8,standingPairs:17,roles:{ROWER:50,BOW_CALLER:1,MID_CONTROLLER:1,HELMSMAN:3},backPrint:'កូនខ្មែរ'};
for(const k of Object.keys(offset))a[k]=[...(a[k]||[]),...(b[k]||[])];
a.animations=[...b.animations];a.extensionsUsed=[...new Set([...(a.extensionsUsed||[]),...(b.extensionsUsed||[])])];
const sprint=decode('../asset-studio/crew-v12/crew-only-sprint.glb'),sj=sprint.json,clip=structuredClone(sj.animations[0]);
clip.name='Rowing_Sprint_Real_2024_Roles_80SPM';
const chunks=[old.bin,fresh.bin],copiedViews=new Map(),copiedAccessors=new Map();let byteOffset=old.bin.length+fresh.bin.length;
function copyAccessor(id){if(copiedAccessors.has(id))return copiedAccessors.get(id);const ac=structuredClone(sj.accessors[id]),viewId=ac.bufferView;if(!copiedViews.has(viewId)){const view=structuredClone(sj.bufferViews[viewId]);const bytes=sprint.bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength),padding=Buffer.alloc((4-byteOffset%4)%4);chunks.push(padding,bytes);byteOffset+=padding.length;view.buffer=0;view.byteOffset=byteOffset;byteOffset+=bytes.length;copiedViews.set(viewId,a.bufferViews.length);a.bufferViews.push(view);}ac.bufferView=copiedViews.get(viewId);const ix=a.accessors.length;a.accessors.push(ac);copiedAccessors.set(id,ix);return ix;}
// Bone names repeat in all 55 rigs. Resolve by actor/rig hierarchy, never by
// the bare name (which would route every sprint track to the final actor).
const newNodeByPath=new Map([...basePaths].map(([i,path])=>[path,i+offset.nodes])),sprintPaths=paths(sj);
for(const sampler of clip.samplers){sampler.input=copyAccessor(sampler.input);sampler.output=copyAccessor(sampler.output);}
for(const channel of clip.channels){const path=sprintPaths.get(channel.target.node);channel.target.node=newNodeByPath.get(path);if(channel.target.node===undefined)throw Error('Sprint node missing: '+path);}
// Caller gestures do not become propulsion in the sprint. Reuse his corrected
// base pose tracks, including the legs resting inside the open bow compartment.
const callerNodes=new Set([...newNodeByPath].filter(([path])=>path.includes('/Athlete_1_BOW_CALLER/')).map(([,id])=>id));
clip.channels=clip.channels.filter(c=>!callerNodes.has(c.target.node));
for(const channel of a.animations[0].channels.filter(c=>callerNodes.has(c.target.node))){const sampler=structuredClone(a.animations[0].samplers[channel.sampler]),copy=structuredClone(channel);copy.sampler=clip.samplers.length;clip.samplers.push(sampler);clip.channels.push(copy);}
a.animations.push(clip);
// All accepted geometry/image/accessor bytes remain intact in the first buffer segment.
const unpadded=Buffer.concat(chunks),bin=Buffer.concat([unpadded,Buffer.alloc((4-unpadded.length%4)%4)]);a.buffers=[{byteLength:bin.length}];
const json=Buffer.from(JSON.stringify(a)),pad=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),head=Buffer.alloc(20),bh=Buffer.alloc(8);
head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+pad.length+bin.length,8);head.writeUInt32LE(pad.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
fs.writeFileSync('public/assets/ghe-ngo/ghe-ngo-crew-v12.glb',Buffer.concat([head,pad,bh,bin]));
const report={preservedOriginalBinaryBytes:old.bin.length,preservedOriginalBinarySHA256:crypto.createHash('sha256').update(old.bin).digest('hex'),outputBytes:28+pad.length+bin.length,clips:a.animations.map(c=>c.name),crew:55,seatedPairs:8,standingPairs:17};
fs.mkdirSync('docs/qa/crew-v12',{recursive:true});fs.writeFileSync('docs/qa/crew-v12/preserved-hull.json',JSON.stringify(report,null,2)+'\n');console.log(report);

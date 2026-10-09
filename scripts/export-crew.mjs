import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {prepareActors} from '../src/race/imported-athlete.mjs';
import {buildBoat,bakeAnimation,verifyBoat} from '../src/race/boat.mjs';
globalThis.self=globalThis;
globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
};
const bytes=await fs.readFile('public/assets/human/quaternius-athlete.glb');
await prepareActors(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const boat=buildBoat(),check=verifyBoat(boat);
if(!check.pass)throw new Error(JSON.stringify(check.errors));
const clip=bakeAnimation(boat,80);
const data=await new GLTFExporter().parseAsync(boat.root,{binary:true,animations:[clip],onlyVisible:false});
// Embed the original clip-derived WebP without a browser canvas or image generation.
const raw=Buffer.from(data),jsonLength=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+jsonLength).toString());
const oldBin=raw.subarray(28+jsonLength),image=await fs.readFile('public/assets/ghe-ngo/kbach-from-reference.webp');
const viewIndex=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:oldBin.length,byteLength:image.length});
json.images=[{bufferView:viewIndex,mimeType:'image/webp'}];json.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
json.textures=[{sampler:0,extensions:{EXT_texture_webp:{source:0}}}];
json.extensionsUsed=[...new Set([...(json.extensionsUsed||[]),'EXT_texture_webp'])];json.extensionsRequired=[...new Set([...(json.extensionsRequired||[]),'EXT_texture_webp'])];
const hull=json.nodes.find(n=>n.name==='Hull_Watertight_30_20x1_12');
// TextureLoader flips Y at runtime; glTF textures do not. Convert exported UVs.
for(const accessorIndex of new Set(json.meshes[hull.mesh].primitives.map(p=>p.attributes.TEXCOORD_0))){const accessor=json.accessors[accessorIndex],view=json.bufferViews[accessor.bufferView],stride=view.byteStride||8;for(let i=0;i<accessor.count;i++){const offset=(view.byteOffset||0)+(accessor.byteOffset||0)+i*stride+4;oldBin.writeFloatLE(1-oldBin.readFloatLE(offset),offset);}}
json.materials[json.meshes[hull.mesh].primitives[0].material].pbrMetallicRoughness.baseColorTexture={index:0};
const bin=Buffer.concat([oldBin,image,Buffer.alloc((4-image.length%4)%4)]);json.buffers[0].byteLength=bin.length;
const jsonBytes=Buffer.from(JSON.stringify(json)),paddedJson=Buffer.concat([jsonBytes,Buffer.alloc((4-jsonBytes.length%4)%4,32)]);
const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+paddedJson.length+bin.length,8);header.writeUInt32LE(paddedJson.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
const output=process.argv[2]||path.join(os.tmpdir(),'tuk-ngo-crew.glb');
await fs.writeFile(output,Buffer.concat([header,paddedJson,binHeader,bin]));
await fs.writeFile('docs/qa/rig-check.json',JSON.stringify(check,null,2)+'\n');
console.log(JSON.stringify({output,bytes:28+paddedJson.length+bin.length,check:check.checks.animation}));

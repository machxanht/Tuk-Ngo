import fs from 'node:fs/promises';
import * as T from 'three';

// Author tangents only for the shared athlete atlas. Whole-scene tangent tools
// can reindex the accepted hull, so all existing vertex/index bytes stay intact.
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/tangent-athlete.mjs input.glb output.glb');
const raw=await fs.readFile(input),size=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+size));
let binary=raw.subarray(28+size);const cache=new Map();let primitives=0;
function values(index,components){
 const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],bytes=a.componentType===5126||a.componentType===5125?4:2,stride=v.byteStride||components*bytes,start=(v.byteOffset||0)+(a.byteOffset||0);
 const array=a.componentType===5126?new Float32Array(a.count*components):new Uint32Array(a.count*components);
 for(let i=0;i<a.count;i++)for(let k=0;k<components;k++){const p=start+i*stride+k*bytes;array[i*components+k]=a.componentType===5126?binary.readFloatLE(p):a.componentType===5125?binary.readUInt32LE(p):binary.readUInt16LE(p);}return array;
}
function append(array){
 const data=Buffer.from(array.buffer,array.byteOffset,array.byteLength),offset=binary.length;
 binary=Buffer.concat([binary,data,Buffer.alloc((4-data.length%4)%4)]);
 const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34962});
 const index=doc.accessors.length;doc.accessors.push({bufferView:view,componentType:5126,count:array.length/4,type:'VEC4'});return index;
}
for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
 if(!doc.materials[primitive.material]?.extras?.athleteAtlas)continue;
 const attrs=primitive.attributes,key=[attrs.POSITION,attrs.NORMAL,attrs.TEXCOORD_0,primitive.indices].join(':');
 if(!cache.has(key)){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(values(attrs.POSITION,3),3));g.setAttribute('normal',new T.BufferAttribute(values(attrs.NORMAL,3),3));g.setAttribute('uv',new T.BufferAttribute(values(attrs.TEXCOORD_0,2),2));g.setIndex(new T.BufferAttribute(values(primitive.indices,1),1));g.computeTangents();
  const tangent=g.getAttribute('tangent').array;if(!tangent.every(Number.isFinite))throw Error('Non-finite athlete tangent');cache.set(key,append(tangent));g.dispose();
 }
 primitive.attributes.TANGENT=cache.get(key);primitives++;
}
doc.buffers[0].byteLength=binary.length;
const encoded=Buffer.from(JSON.stringify(doc)),json=Buffer.concat([encoded,Buffer.alloc((4-encoded.length%4)%4,32)]),header=Buffer.alloc(20),bh=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);
await fs.writeFile(output,Buffer.concat([header,json,bh,binary]));console.log(JSON.stringify({output,athletePrimitives:primitives,uniqueTangentBuffers:cache.size}));

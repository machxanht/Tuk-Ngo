import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

// Preserve the source people and animation palettes. The boat inspection scene
// needs the two reduced meshes, rather than 11 full-resolution civilian meshes.
const path='public/assets/festival-crowd/',manifest=JSON.parse(await readFile(path+'manifest.json','utf8'));
const chunks=[],models=[];let offset=0;
for(const info of manifest.models){
 const source=JSON.parse(await readFile(path+info.file,'utf8')),geometry=await readFile(path+source.geometryBinary),bones=await readFile(path+source.binary);
 const meta={...source,levels:[]},boneOffset=offset;
 chunks.push(bones);offset+=bones.length;
 for(const level of source.levels.slice(1)){
  const compact={triangles:level.triangles};
  for(const [key,attr] of Object.entries(level))if(key!=='triangles'){
   const bytes=geometry.subarray(attr.offset,attr.offset+attr.count*4);
   compact[key]={...attr,offset};chunks.push(bytes);offset+=bytes.length;
  }
  meta.levels.push(compact);
 }
 meta.levels.unshift(meta.levels[0]);
 models.push({info,meta,boneOffset,boneCount:bones.length/4});
}
const data=Buffer.concat(chunks),digest=createHash('sha256').update(data).digest('hex'),compressed=gzipSync(data,{level:9});
await writeFile(path+'crowd-compact.bin',data);
// Use a neutral suffix: some static servers automatically decompress .gz URLs,
// whereas this stream is deliberately unpacked in the browser below.
await writeFile(path+'crowd-compact.packed',compressed);
await writeFile(path+'crowd-compact.json',JSON.stringify({manifest,models,bytes:data.length,compressedBytes:compressed.length,sha256:digest})+'\n');
console.log(`Crowd preview: ${models.length} people variants, ${compressed.length} compressed bytes (${data.length} decoded)`);

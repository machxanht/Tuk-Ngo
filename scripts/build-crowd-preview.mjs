import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

// Preserve the source people and animation palettes. The boat inspection scene
// needs the two reduced meshes, rather than 11 full-resolution civilian meshes.
const path='public/assets/festival-crowd/',manifest=JSON.parse(await readFile(path+'manifest.json','utf8'));
const chunks=[],models=[];let offset=0;
function outfitRegions(source,geometry,boneNames){
 const data=source.levels[1],view=(a,Type=Float32Array)=>new Type(geometry.buffer,geometry.byteOffset+a.offset,a.count),p=view(data.position),region=view(data.region),indices=view(data.index,Uint32Array);
 const parent=Int32Array.from({length:region.length},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<indices.length;i+=3)for(let k=1;k<3;k++){const a=indices[i],b=indices[i+k];if(region[a]===4&&region[b]===4)parent[find(a)]=find(b);}
 const components=new Map();for(let i=0;i<region.length;i++)if(region[i]===4){const root=find(i);if(!components.has(root))components.set(root,[]);components.get(root).push(i);}
 const result=new Map();
 const key=(x,y,z)=>[x,y,z].map(v=>v.toFixed(5)).join(',');
 for(const ids of components.values()){
  const heights=ids.map(i=>p[i*3+1]*source.scale),lo=Math.min(...heights),hi=Math.max(...heights),mean=heights.reduce((a,b)=>a+b,0)/heights.length;
  const category=hi<.27?6:lo>1.43?7:mean<.87&&hi<1.08?5:hi-lo<.06&&mean>.9&&ids.length<14?8:4;
  for(const i of ids)result.set(key(p[i*3],p[i*3+1],p[i*3+2]),category);
 }
 return level=>{
  const positions=view(level.position),old=view(level.region),next=Float32Array.from(old),joints=view(level.skinIndex),weights=view(level.skinWeight);
  for(let i=0;i<next.length;i++)if(old[i]===4){
   let hand=0,head=0;for(let k=0;k<4;k++){const name=boneNames[joints[i*4+k]]||'',weight=weights[i*4+k];if(/^(Wrist|Index|Middle|Pinky|Ring|Thumb)/.test(name))hand+=weight;if(name==='Head')head+=weight;}
   // Several source characters name exposed hands by their colour material,
   // rather than Skin. Never recolour those faces/hands as a shirt or hat.
   next[i]=hand>.6||head>.85?7:result.get(key(positions[i*3],positions[i*3+1],positions[i*3+2]))??(positions[i*3+1]*source.scale<.27?6:positions[i*3+1]*source.scale<.87?5:4);
  }
  return Buffer.from(next.buffer);
 };
}
for(const info of manifest.models){
 const source=JSON.parse(await readFile(path+info.file,'utf8')),geometry=await readFile(path+source.geometryBinary),bones=await readFile(path+source.binary);
 const raw=await readFile('public/assets/coherent-v20/npcs/'+info.id+'.glb'),doc=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12))),boneNames=doc.skins[0].joints.map(i=>doc.nodes[i].name);
 const meta={...source,outfitRegions:true,levels:[]},boneOffset=offset,classify=outfitRegions(source,geometry,boneNames);
 chunks.push(bones);offset+=bones.length;
 for(const level of source.levels.slice(1)){
  const compact={triangles:level.triangles};
  for(const [key,attr] of Object.entries(level))if(key!=='triangles'){
   const bytes=key==='region'?classify(level):geometry.subarray(attr.offset,attr.offset+attr.count*4);
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

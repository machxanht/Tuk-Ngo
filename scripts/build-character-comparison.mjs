import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const base='public/assets/character-comparison/',sources=JSON.parse(await readFile('../tools/asset-cache/character-comparison/sources.json','utf8'));
const manifest={schema:1,purpose:'Compare the original D/F characters before choosing a race athlete',liveGameChanged:false,sharedWardrobe:'Blue race jersey and dark shorts adapted from Snow, CC BY 4.0',sharedMotion:'src/race/rowing-pose.mjs',models:{}};
for(const id of ['d','f']){
 const raw=await readFile(base+id+'.glb'),doc=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12))),report=JSON.parse(await readFile(`docs/qa/character-comparison/${id}-build.json`,'utf8'));
 let triangles=0,vertices=0;for(const mesh of doc.meshes)for(const p of mesh.primitives){triangles+=(p.indices!=null?doc.accessors[p.indices].count:doc.accessors[p.attributes.POSITION].count)/3;vertices+=doc.accessors[p.attributes.POSITION].count;}
 manifest.models[id]={label:id==='d'?'D · Quaternius':'F · Snow',file:id+'.glb',sha256:createHash('sha256').update(raw).digest('hex'),bytes:raw.length,triangles,vertices,bones:Math.max(...doc.skins.map(s=>s.joints.length)),animations:doc.animations.map(a=>a.name),facePoses:report.nativeFacialPoses,source:sources[id],wardrobeCredit:'Snow Rig © Blender Foundation | studio.blender.org · CC BY 4.0'};
}
await writeFile(base+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
await build({entryPoints:['src/race/character-comparison.mjs'],bundle:true,format:'esm',target:'es2020',minify:true,outfile:'public/character-comparison/viewer.js',legalComments:'eof'});
const token=createHash('sha256').update(await readFile('public/character-comparison/viewer.js')).update(await readFile('public/character-comparison/styles.css')).digest('hex').slice(0,12);
let html=await readFile('public/character-comparison/index.html','utf8');html=html.replace(/\?build=[0-9a-f]+/g,'').replace('href="styles.css"',`href="styles.css?build=${token}"`).replace('src="viewer.js"',`src="viewer.js?build=${token}"`);await writeFile('public/character-comparison/index.html',html);
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest.models).map(([id,m])=>[id,{bytes:m.bytes,triangles:m.triangles,bones:m.bones,animations:m.animations}]))));

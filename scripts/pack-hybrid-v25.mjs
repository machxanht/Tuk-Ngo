import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune} from '@gltf-transform/functions';
import {build} from 'esbuild';
const source=path.resolve('../asset-studio/hybrid-v25'),target=path.resolve('public/assets/illustrated-v22');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const roles=['seated-port','seated-starboard','standing-port','standing-starboard','caller','controller','helm','helm-starboard'];
const files=[];
for(const [i,role] of roles.entries()){
 const doc=await io.read(path.join(source,role+'.glb'));
 if(i===0){
  for(const mat of doc.getRoot().listMaterials())if(mat.getName()==='Painted_Skin_V25')mat.setBaseColorFactor([.56,.31,.15,1]);
  await doc.transform(dedup(),prune());
  const file='athlete-rig-v25.glb';await io.write(path.join(target,file),doc);files.push({file,bytes:(await fs.stat(path.join(target,file))).size});
 }
 // Share geometry; each role file contains just the calibrated bone/paddle
 // channels and their named targets, rather than seven copies of the body.
 for(const node of doc.getRoot().listNodes())node.setMesh(null).setSkin(null);
 await doc.transform(prune());
 const file='motion-'+role+'-v25.glb';await io.write(path.join(target,file),doc);files.push({file,bytes:(await fs.stat(path.join(target,file))).size});
}
await fs.copyFile('public/assets/coherent-v19/accepted-hull.glb',path.join(target,'hull-rig-v25.glb'));
files.push({file:'hull-rig-v25.glb',bytes:(await fs.stat(path.join(target,'hull-rig-v25.glb'))).size});
await build({entryPoints:['src/race/hybrid-boats-v25.mjs'],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,outfile:path.join(target,'hybrid-boats-v25.js'),legalComments:'eof'});
await fs.writeFile(path.join(target,'hybrid-v25-manifest.json'),JSON.stringify({revision:'hybrid-v25',files,geometrySource:'Existing MakeHuman/MPFB CC0 anatomy, new sewn garment and 97-sample continuous bone clips',hullSource:'Accepted existing 3D hull, paint sampled from approved illustration at runtime',background:'Existing painted festival layers'},null,2)+'\n');
console.log(JSON.stringify({files,totalModelBytes:files.reduce((s,f)=>s+f.bytes,0)}));

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Run after exporting both views from art-bake.html and downloading their files.
const source=process.argv[2];
if(!source)throw Error('Usage: node scripts/assemble-sprites.mjs <download-directory>');
const destination='public/assets/ghe-ngo/sprites';
await fs.mkdir(destination,{recursive:true});
const manifest={version:'MAKEHUMAN_ART_V4',framesPerCycle:24,views:{}};
for(const view of ['boat','crew']){
 const data=JSON.parse(await fs.readFile(path.join(source,view+'-manifest.json'),'utf8'));
 if(data.frames.length!==24||data.pages.length!==3)throw Error(view+': incomplete export');
 manifest.views[view]=data;
 for(const page of data.pages){if(path.basename(page)!==page)throw Error('Invalid atlas path');await fs.copyFile(path.join(source,page),path.join(destination,page));}
}
manifest.modelSha256=crypto.createHash('sha256').update(await fs.readFile('public/assets/ghe-ngo/ghe-ngo-crew.glb')).digest('hex');
await fs.writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({version:manifest.version,views:Object.keys(manifest.views),frames:48,modelSha256:manifest.modelSha256}));

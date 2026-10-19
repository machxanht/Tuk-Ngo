import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../public/assets/ghe-ngo/kbach-library/',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
assert.equal(catalog.items.length,39);
assert.equal(new Set(catalog.items.map(item=>item.id)).size,39);
assert.deepEqual(catalog.items.filter(item=>item.supplied).map(item=>item.id).sort(),['7669657553378282770','7681583457654295826','7691171048493944071','7689300429460507956','7686697282644888840'].sort());
let panels=0;
for(const item of catalog.items){
 assert.equal(item.source,`https://www.tiktok.com/@karn_chinda/photo/${item.id}`);
 assert.deepEqual(item.size,[8192,512]);assert(item.panels.length>=4);
 assert.equal(new Set(item.panels.map(panel=>panel.slide)).size,item.panels.length);
 for(const panel of item.panels){assert.match(panel.sha256,/^[a-f0-9]{64}$/);assert(panel.sourceSize[0]>=1280);assert(panel.cropColumns[1]>panel.cropColumns[0]);assert(panel.railRange[1]<panel.keelRange[1]);}
 for(const name of ['texture','thumbnail','original'])assert((await stat(new URL(item[name],root))).size>1000);
 const bytes=await readFile(new URL(item.texture,root));assert.equal(bytes.length,item.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
 panels+=item.panels.length;
}
assert.equal(panels,catalog.sourceImages);
assert(catalog.items.length*catalog.atlas.cellHeight<=catalog.atlas.size[1]);
assert(catalog.atlas.padding>=2);
assert((await stat(new URL(catalog.atlas.file,root))).size<1_500_000);
console.log(`Kbach library passed: ${catalog.items.length} complete source-linked designs, ${panels} source panel hashes, five supplied albums, atlas bounds and output hashes.`);

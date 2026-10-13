import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune} from '@gltf-transform/functions';
const folder='public/assets/illustrated-v22/',source='assets/source/makehuman/young_lightskinned_male_diffuse3.png';
const pixels=await fs.readFile(source),sha256=createHash('sha256').update(pixels).digest('hex');
if(sha256!=='f50016a5507fc687dc8df06599c8ea48de950cd185de33a71cafc1319ddab4d5')throw Error('Skin source differs from verified CC0 pack');
await fs.copyFile(source,folder+'athlete-skin-v27.png');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(process.argv[2]||'../asset-studio/hybrid-v27/athlete-source-v27.glb');
const skin=doc.getRoot().listMaterials().find(m=>m.getName()==='Painted_Skin_V25');if(!skin)throw Error('Missing anatomical skin material');
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())if(p.getMaterial()===skin){const uv=p.getAttribute('TEXCOORD_0');if(!uv||uv.getMax([])[0]-uv.getMin([])[0]<.1)throw Error('Anatomical UVs missing or constant; cannot map skin');}
const texture=doc.createTexture('Official_MakeHuman_CC0_Skin').setImage(pixels).setMimeType('image/png');
skin.setBaseColorTexture(texture).setBaseColorFactor([.75,.75,.75,1]);
await doc.transform(dedup(),prune());const file='athlete-rig-v27.glb';await io.write(folder+file,doc);
await fs.writeFile(folder+'skin-v27-provenance.json',JSON.stringify({file,bytes:(await fs.stat(folder+file)).size,texture:'athlete-skin-v27.png',source,sha256,officialSource:'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',sourcePack:'skins/young_asian_male/',license:'CC0-1.0',changes:'Original image pixels and anatomical UVs retained; diffuse material factor authored for bright game lighting. Generic source face; twelve runtime shape/tone variants are not embedded in this single prototype.'},null,2)+'\n');
console.log(JSON.stringify({file,bytes:(await fs.stat(folder+file)).size,sha256}));

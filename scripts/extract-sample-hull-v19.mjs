import fs from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup} from '@gltf-transform/functions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read('public/assets/ghe-ngo/ghe-ngo-crew-v18.glb');
for(const animation of doc.getRoot().listAnimations())animation.dispose();
const discard=new Set();
function collect(node){if(discard.has(node))return;discard.add(node);node.listChildren().forEach(collect);}
for(const node of doc.getRoot().listNodes())if(node.getExtras().component==='crew'||node.getExtras().component==='athlete')collect(node);
for(const node of [...discard].reverse())node.dispose();
for(const skin of doc.getRoot().listSkins())skin.dispose();
await doc.transform(prune(),dedup());
await io.write('public/assets/coherent-v19/accepted-hull.glb',doc);
console.log({bytes:fs.statSync('public/assets/coherent-v19/accepted-hull.glb').size,nodes:doc.getRoot().listNodes().length,skins:doc.getRoot().listSkins().length,animations:doc.getRoot().listAnimations().length});

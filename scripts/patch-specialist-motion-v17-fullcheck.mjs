import fs from 'node:fs';
let source=fs.readFileSync('scripts/check-role-runtime.mjs','utf8');
source=source.replace('../src/race/race-crew.mjs','file:///E:/AI/Um%20Tuk/github-workspace/src/race/race-crew.mjs').replace('../src/race/boat.mjs','file:///E:/AI/Um%20Tuk/github-workspace/src/race/boat.mjs');
source=source.replace("'public/assets/ghe-ngo/ghe-ngo-crew-'+revision+'.glb'","'../asset-studio/crew-v17-motion/ghe-ngo-crew-v17-motion.glb'").replace("'docs/qa/crew-'+revision+'/runtime-role-check.json'","'../asset-studio/crew-v17-motion/full-runtime-role-check.json'");
// Locate dependencies from this repository while keeping generated diagnostics external.
source=source.replaceAll("'three'","'file:///E:/AI/Um%20Tuk/github-workspace/node_modules/three/build/three.module.js'").replaceAll("'three/examples/","'file:///E:/AI/Um%20Tuk/github-workspace/node_modules/three/examples/");
fs.writeFileSync('../asset-studio/crew-v17-motion/full-check.mjs',source);
process.argv[2]='v15';await import('../../asset-studio/crew-v17-motion/full-check.mjs?run='+Date.now());

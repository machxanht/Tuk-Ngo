import {mkdir,writeFile} from 'node:fs/promises';
import {festivalLogoSvg} from '../src/race/festival-branding.mjs';
await mkdir('public/assets/festival',{recursive:true});
await writeFile('public/assets/festival/festival-logo.svg',festivalLogoSvg());
import {build} from 'esbuild';
import {kbachSvg} from '../src/race/kbach-livery.mjs';
await writeFile('public/assets/ghe-ngo/kbach-master.svg',kbachSvg());
await import('./build-athlete-faces.mjs');
await import('./build-crowd-preview.mjs');
await import('./build-rowing-motion.mjs');
await import('./build-ceremony-crew.mjs');
for(const [source,name] of [['src/race/game-engine.mjs','game-engine.js'],['src/race/hybrid-boats.mjs','hybrid-boats.js']]){
 await build({entryPoints:[source],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,outfile:'public/assets/illustrated-v22/'+name,legalComments:'eof'});
 console.log('Built '+name);
}

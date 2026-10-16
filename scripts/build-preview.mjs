import {build} from 'esbuild';
await import('./build-rowing-motion.mjs');
await import('./build-crowd-preview.mjs');
for(const [source,name] of [['src/race/game-engine.mjs','game-engine.js'],['src/race/hybrid-boats.mjs','hybrid-boats.js']]){
 await build({entryPoints:[source],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,outfile:'public/assets/illustrated-v22/'+name,legalComments:'eof'});
 console.log('Built '+name);
}

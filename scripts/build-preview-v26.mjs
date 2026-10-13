import {build} from 'esbuild';
for(const [source,name] of [['src/race/hybrid-game-v26.mjs','game-rules-v26.js'],['src/race/hybrid-boats-v25.mjs','hybrid-boats-v25.js']]){
 await build({entryPoints:[source],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,outfile:'public/assets/illustrated-v22/'+name,legalComments:'eof'});
 console.log('Built '+name);
}

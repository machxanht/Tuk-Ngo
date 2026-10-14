import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import validator from 'gltf-validator';
const results=[];
for(const role of ['seated','standing','caller','controller']){
 const file=`public/assets/illustrated-v22/athlete-${role}-v32.glb`,result=await validator.validateBytes(new Uint8Array(fs.readFileSync(file)),{uri:path.basename(file)});
 results.push({role,errors:result.issues.numErrors,warnings:result.issues.numWarnings,messages:result.issues.messages});
}
fs.mkdirSync('../asset-studio/garment-v32/portable',{recursive:true});fs.writeFileSync('../asset-studio/garment-v32/portable/gltf-validation.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));assert(results.every(r=>!r.errors&&!r.warnings),'Portable GLB validator issues');

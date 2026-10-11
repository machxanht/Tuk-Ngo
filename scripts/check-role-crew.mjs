import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateBytes} from 'gltf-validator';
const raw=fs.readFileSync('public/assets/ghe-ngo/ghe-ngo-crew-v12.glb'),size=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+size)),bin=raw.subarray(28+size);
const old=fs.readFileSync('public/assets/ghe-ngo/ghe-ngo-crew-v9.glb'),oldSize=old.readUInt32LE(12),oldBin=old.subarray(28+oldSize);
assert.ok(bin.subarray(0,oldBin.length).equals(oldBin),'accepted hull/livery source bytes preserved');
const roots=j.scenes[j.scene||0].nodes,reachable=new Set();function visit(i){if(reachable.has(i))return;reachable.add(i);for(const c of j.nodes[i].children||[])visit(c);}roots.forEach(visit);
const active=[...reachable].map(i=>j.nodes[i]);
const actors=active.filter(n=>/^Athlete_\d+_/.test(n.name)&&n.extras?.component==='athlete');assert.equal(actors.length,55);
const counts={},postures={},caps={};for(const a of actors){counts[a.extras.role]=(counts[a.extras.role]||0)+1;if(a.extras.role==='ROWER')postures[a.extras.posture]=(postures[a.extras.posture]||0)+1;caps[a.extras.capOrientation]=(caps[a.extras.capOrientation]||0)+1;}
assert.deepEqual(counts,{ROWER:50,BOW_CALLER:1,MID_CONTROLLER:1,HELMSMAN:3});assert.deepEqual(postures,{seated:16,standing:34});assert.ok(caps.forward>0&&caps.backward>0);
assert.equal(active.filter(n=>/^Paddle_\d+$/.test(n.name)&&n.extras?.component==='paddle').length,50);
assert.equal(active.filter(n=>/^Steering_Oar_\d+$/.test(n.name)&&n.extras?.component==='paddle'&&n.extras.lengthM===4.2).length,3);
assert.ok(j.materials.some(m=>m.name==='Khmer_Back_Print_Only'));
const triangleCount=[...reachable].reduce((sum,i)=>sum+(j.nodes[i].mesh===undefined?0:j.meshes[j.nodes[i].mesh].primitives.reduce((n,p)=>n+(p.indices===undefined?j.accessors[p.attributes.POSITION].count:j.accessors[p.indices].count)/3,0)),0);
assert.ok(triangleCount<900000,'active crew + accepted boat remain below 900k triangles');
const validation=await validateBytes(new Uint8Array(raw),{uri:'ghe-ngo-crew-v12.glb',maxIssues:100});assert.equal(validation.issues.numErrors,0);
const report={pass:true,crew:actors.length,roles:counts,postures,caps,triangleCount,hullBytesPreserved:true,animationClips:j.animations.map(c=>c.name),validator:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings},limitations:['Direct visual QA also required','Unused V9 geometry retained to preserve original bytes; not rendered']};
fs.writeFileSync('docs/qa/crew-v12/persisted-role-check.json',JSON.stringify(report,null,2)+'\n');console.log(report);

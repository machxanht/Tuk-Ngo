import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import validator from 'gltf-validator';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(new URL('../public/assets/character-comparison/manifest.json',import.meta.url),'utf8'));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),validation={};
for(const id of ['d','f']){
 const path=root+`public/assets/character-comparison/${id}.glb`,bytes=await readFile(path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.models[id].sha256);
 const report=await validator.validateBytes(new Uint8Array(bytes),{uri:id+'.glb',maxIssues:100});
 validation[id]=report;assert.equal(report.issues.numErrors,0);assert.equal(report.issues.numWarnings,0);
 const doc=await io.read(path),animations=doc.getRoot().listAnimations().map(a=>a.getName());
 assert(animations.includes('seated')&&animations.includes('standing'));
 for(const node of doc.getRoot().listNodes()){
  const skin=node.getSkin(),mesh=node.getMesh();if(!skin||!mesh)continue;
  for(const primitive of mesh.listPrimitives()){
   const weights=primitive.getAttribute('WEIGHTS_0'),joints=primitive.getAttribute('JOINTS_0');
   const w=weights.getArray(),j=joints.getArray();
   for(let i=0;i<w.length;i+=4){assert(Math.abs(w[i]+w[i+1]+w[i+2]+w[i+3]-1)<.002);for(let k=0;k<4;k++){assert(Number.isFinite(w[i+k]));assert(j[i+k]<skin.listJoints().length);}}
   // Mask and corrective groups must never be converted into head skin weights.
   if(/shirt|pants/.test(node.getName()))for(let i=0;i<w.length;i++)if(w[i]>.01)assert.notEqual(skin.listJoints()[j[i]].getName(),'head');
  }
 }
 if(id==='f'){
  let blink=0;
  for(const mesh of doc.getRoot().listMeshes()){
   const index=mesh.getExtras().targetNames?.indexOf('Blink');if(index==null||index<0)continue;
   for(const primitive of mesh.listPrimitives())for(const value of primitive.listTargets()[index].getAttribute('POSITION').getArray())blink=Math.max(blink,Math.abs(value));
  }
  assert(blink>.02,'The baked eyelid must close, not only move surrounding skin');
  assert(animations.includes('facial-demo'));
 }
 const motion=JSON.parse(await readFile(root+`docs/qa/character-comparison/${id}-motion.json`,'utf8'));
 assert.equal(motion.measurements.length,97);assert.equal(motion.sha256,manifest.models[id].sha256);
 for(const frame of motion.measurements)for(const key of ['head','leftHand','rightHand'])assert(frame[key].every(Number.isFinite));
 console.log('PASS '+id.toUpperCase()+' GLB, weights, native face, animation and manifest');
}
await writeFile(root+'docs/qa/character-comparison/validation.json',JSON.stringify(validation,null,2)+'\n');

const require=createRequire(import.meta.url);let playwright;
for(const candidate of [process.env.PLAYWRIGHT_MODULE,'playwright',root+'../asset-studio/browser-qa/node_modules/playwright'].filter(Boolean)){try{playwright=require(candidate);break;}catch{}}
assert(playwright,'Set PLAYWRIGHT_MODULE to the existing Playwright installation');
const target=process.env.CHARACTER_COMPARE_URL||'http://127.0.0.1:8778/character-comparison/';
const browser=await playwright.chromium.launch({channel:'msedge',headless:true}),results=[];
try{
 for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024}]){
  const page=await browser.newPage({viewport}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(target);await page.waitForFunction(()=>window.CharacterComparison,{timeout:60000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#phase').fill('0.28');await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.CharacterComparison.state.playing),false);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/compare-${viewport.width}.png`});
  for(const phase of ['0','0.5','0.78']){await page.locator('#phase').fill(phase);await page.waitForTimeout(60);}
  await page.locator('[data-motion="standing"]').click();await page.locator('[data-camera="face"]').click();
  for(const face of ['neutral','Smile','Effort','Blink']){
   await page.locator(`[data-face="${face}"]`).click();await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>window.CharacterComparison.state.face),face);
   if(face!=='neutral')assert(await page.evaluate(name=>window.CharacterComparison.views[1].faces.every(m=>m.morphTargetInfluences[m.morphTargetDictionary[name]]>.8),face));
  }
  await page.locator('[data-face="Smile"]').click();await page.waitForTimeout(100);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/faces-${viewport.width}.png`});
  await page.locator('[data-motion="seated"]').click();await page.locator('[data-camera="whole"]').click();
  await page.locator('#play').click();await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.CharacterComparison.state.playing),true);
  await page.locator('#play').click();assert.deepEqual(errors,[]);
  results.push({viewport,errors,loaded:true,controls:true});await page.close();console.log('PASS browser '+viewport.width+'×'+viewport.height);
 }
}finally{await browser.close();}
await writeFile(root+'docs/qa/character-comparison/browser.json',JSON.stringify({url:target,results},null,2)+'\n');

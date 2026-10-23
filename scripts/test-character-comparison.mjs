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
 const bodyClips=['seated','seated-starboard','kneeling-port','kneeling-starboard','caller','controller','helm-port','helm-starboard','standing'];
 assert(bodyClips.every(name=>animations.includes(name)));
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
 const identities=new Set(doc.getRoot().listMeshes().flatMap(m=>m.getExtras().targetNames||[]));
 for(const name of ['FaceWide','JawLean','NoseBroad','FaceLong'])assert(identities.has(name));
 const motion=JSON.parse(await readFile(root+`docs/qa/character-comparison/${id}-motion.json`,'utf8'));
 assert.equal(motion.measurements.length,97*8);assert.equal(motion.sha256,manifest.models[id].sha256);
 for(const frame of motion.measurements){
  for(const key of ['head','leftHand','rightHand'])assert(frame[key].every(Number.isFinite));
  assert(frame.maxReachError<.001,`${id} ${frame.posture}: arm overextension`);
  if(frame.posture!=='controller')assert(Math.max(frame.leftPalmError,frame.rightPalmError)<.001,`${id} ${frame.posture}: palm detached from paddle`);
 }
 console.log('PASS '+id.toUpperCase()+' GLB, weights, native face, animation and manifest');
}
const hairBytes=await readFile(root+'public/assets/character-comparison/hairstyles.glb');
assert.equal(createHash('sha256').update(hairBytes).digest('hex'),manifest.hairstyles.sha256);
validation.hair=await validator.validateBytes(new Uint8Array(hairBytes),{uri:'hairstyles.glb',maxIssues:100});
assert.equal(validation.hair.issues.numErrors,0);assert.equal(validation.hair.issues.numWarnings,0);
const hairDoc=await io.read(root+'public/assets/character-comparison/hairstyles.glb');
assert.equal(hairDoc.getRoot().listMeshes().length,8);
await writeFile(root+'docs/qa/character-comparison/validation.json',JSON.stringify(validation,null,2)+'\n');

const faceBytes=await readFile(root+'public/assets/character-comparison/athlete-faces.glb');
assert.equal(createHash('sha256').update(faceBytes).digest('hex'),manifest.athleteFaces.sha256);
validation.athleteFaces=await validator.validateBytes(new Uint8Array(faceBytes),{uri:'athlete-faces.glb',maxIssues:100});
assert.equal(validation.athleteFaces.issues.numErrors,0);assert.equal(validation.athleteFaces.issues.numWarnings,0);
const faceDoc=await io.read(root+'public/assets/character-comparison/athlete-faces.glb');
assert.equal(faceDoc.getRoot().listSkins().length,0,'Face library must not contain replacement body rigs');
assert.equal(faceDoc.getRoot().listScenes()[0].listChildren().length,16);
assert.equal(createHash('sha256').update(await readFile(root+'public/assets/illustrated-v22/athlete-rig-v27.glb')).digest('hex'),manifest.athleteFaces.nativeBodySha256);
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
  assert.equal(await page.evaluate(()=>window.CharacterComparison.state.view),'boat');
  const initial=await page.evaluate(()=>window.CharacterComparison.crew.stats());
  assert.equal(initial.crew,54);assert.equal(initial.bodyModels,1);assert.equal(initial.bodyModel,'original-game-glb');assert(initial.faceD>15&&initial.faceF>15);
  assert(initial.faceProfiles>=12);
  const bodyBefore=await page.evaluate(()=>CharacterComparison.crew.actors.map(a=>({geometry:a.skin.geometry.uuid,shirt:a.shirt.geometry.uuid,skeleton:a.master.skeleton.uuid,scale:a.group.scale.toArray(),position:a.group.position.toArray(),variant:a.variant})));
  await page.locator('#phase').fill('0.28');await page.waitForTimeout(100);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/crew-${viewport.width}.png`});
  await page.locator('[data-camera="upper"]').first().click();await page.waitForTimeout(100);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/crew-detail-${viewport.width}.png`});
  const preserved=await page.evaluate(()=>CharacterComparison.crew.actors.every(a=>{
   const source=a.baseGeometry,target=a.skin.geometry;
   if(!target.userData.faceOnlyMask)return false;
   return Object.keys(source.attributes).every(key=>source.attributes[key]===target.attributes[key]);
  }));assert(preserved,'Body, cap, hair, UV, color, normal and skin-weight buffers must be the original objects');
  let motionComparison=null;
  if(viewport.width===1440)motionComparison=await page.evaluate(async()=>{
   const crew=CharacterComparison.crew,old=await window.createHybridBoats('../assets/illustrated-v22/',{sharedRenderer:CharacterComparison.renderer,faces:false});
   const same=(a,b)=>a.length===b.length&&a.every((n,i)=>Math.abs(n-b[i])<1e-7);
   let poses=0;const differences=[];
   for(let i=0;i<96;i++){
    const phase=i/96,t=phase*1.2;crew.update(phase,t);old.render(phase,t,{updateOnly:true,nearest:true,connectedKit:true,kitColor:'#23855e'});
    for(const key of Object.keys(old.roles)){
     const a=crew.roles[key].skeleton,b=old.roles[key].skeleton;
     for(let j=0;j<a.bones.length;j++)if(!same(a.bones[j].matrixWorld.elements,b.bones[j].matrixWorld.elements))differences.push('bone '+key+':'+j);
     poses++;
    }
    for(let j=0;j<old.actors.length;j++){
     const a=crew.actors[j],b=old.actors[j];
     if(!same(a.group.matrix.elements,b.group.matrix.elements))differences.push('placement '+j);
     if(a.paddle&&!same(a.paddle.matrix.elements,b.paddle.matrix.elements))differences.push('paddle '+j);
     if(!same(a.shirt.geometry.attributes.position.array,b.shirt.geometry.attributes.position.array))differences.push('shirt '+j);
    }
   }
   // Keep the diagnostic baseline until page teardown: source maps and the
   // renderer are shared with the live preview and must not be disposed here.
   window.characterBaseline=old;
   return{poses,differences:[...new Set(differences)]};
  });
  if(motionComparison){assert.equal(motionComparison.poses,768);assert.deepEqual(motionComparison.differences,[]);}
  await page.locator('#randomize').click();
  const changed=await page.evaluate(()=>window.CharacterComparison.crew.stats());assert.notDeepEqual(changed.roster,initial.roster);assert.equal(changed.crew,54);
  const bodyAfter=await page.evaluate(()=>CharacterComparison.crew.actors.map(a=>({geometry:a.skin.geometry.uuid,shirt:a.shirt.geometry.uuid,skeleton:a.master.skeleton.uuid,scale:a.group.scale.toArray(),position:a.group.position.toArray(),variant:a.variant})));assert.deepEqual(bodyAfter,bodyBefore,'Changing a face must retain body geometry, skeleton and dimensions');
  assert(await page.evaluate(()=>CharacterComparison.crew.actors.every(a=>a.face.children.length===1)));
  for(let i=0;i<4;i++)await page.locator('#randomize').click();
  const cache=await page.evaluate(()=>window.CharacterComparison.crew.stats());assert.equal(cache.sharedSkeletons,8);assert(cache.materialVariants<15);
  await page.locator('[data-view="npcs"]').click();
  const npc=await page.evaluate(()=>CharacterComparison.npcs.stats());assert.equal(npc.people,18);assert.equal(npc.d,9);assert.equal(npc.f,9);assert.equal(npc.activities.length,9);assert.equal(npc.shirtColors,12);assert.equal(npc.pantsColors,8);assert(npc.skinTones>=5);assert(npc.hairStyles>=6);
  await page.locator('#phase').fill('0.2');await page.waitForTimeout(100);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/npcs-${viewport.width}.png`});
  await page.locator('[data-camera="upper"]').click();await page.waitForTimeout(100);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/npc-detail-${viewport.width}.png`});
  const motionSamples=[];
  for(const phase of ['0','0.25','0.5','0.75']){await page.locator('#phase').fill(phase);await page.waitForTimeout(80);motionSamples.push(await page.evaluate(()=>CharacterComparison.npcs.entries.map(e=>({activity:e.activity,position:e.group.position.toArray(),bones:e.skeleton.bones.flatMap(b=>b.quaternion.toArray()),phone:e.phone.visible,bench:e.bench.visible}))));}
  for(const snapshot of motionSamples)for(const e of snapshot){assert(e.position.every(Number.isFinite));assert(e.bones.every(Number.isFinite));assert.equal(e.phone,e.activity==='phone');assert.equal(e.bench,e.activity==='seated-clap');}
  for(let i=0;i<18;i++){assert.notDeepEqual(motionSamples[0][i].bones,motionSamples[2][i].bones,'NPC '+i+' must keep moving');if(motionSamples[0][i].activity==='walk')assert.notDeepEqual(motionSamples[0][i].position,motionSamples[2][i].position);}
  for(let i=0;i<5;i++)await page.locator('#randomize').click();
  const npcCache=await page.evaluate(()=>CharacterComparison.npcs.stats());assert(npcCache.materialVariants<140);
  await page.locator('[data-view="compare"]').click();
  await page.locator('#phase').fill('0.28');await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.CharacterComparison.state.playing),false);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/compare-${viewport.width}.png`});
  for(const phase of ['0','0.5','0.78']){await page.locator('#phase').fill(phase);await page.waitForTimeout(60);}
  for(const side of ['port','starboard']){await page.locator(`[data-side="${side}"]`).click();for(const motion of ['seated','kneeling','standing']){await page.locator(`[data-motion="${motion}"]`).click();await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.CharacterComparison.state.pose),motion);}}
  await page.locator('[data-motion="standing"]').click();await page.locator('[data-camera="face"]').click();
  for(const face of ['neutral','Smile','Effort','Blink']){
   await page.locator(`[data-face="${face}"]`).click();await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>window.CharacterComparison.state.face),face);
   if(face!=='neutral')assert(await page.evaluate(name=>window.CharacterComparison.views[1].faces.filter(m=>m.morphTargetDictionary[name]!=null).every(m=>m.morphTargetInfluences[m.morphTargetDictionary[name]]>.8),face));
  }
  await page.locator('[data-face="Smile"]').click();await page.waitForTimeout(100);
  await page.locator('#viewport').screenshot({path:root+`docs/qa/character-comparison/faces-${viewport.width}.png`});
  await page.locator('[data-motion="seated"]').click();await page.locator('[data-camera="whole"]').click();
  await page.locator('#play').click();await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.CharacterComparison.state.playing),true);
  await page.locator('#play').click();assert.deepEqual(errors,[]);
  results.push({viewport,errors,loaded:true,controls:true,crew:{...initial,roster:undefined},npcs:npc,bodyBuffersPreserved:preserved,motionComparison,cache:{skeletons:cache.sharedSkeletons,materials:cache.materialVariants,npcMaterials:npcCache.materialVariants}});await page.close();console.log('PASS browser '+viewport.width+'×'+viewport.height);
 }
}finally{await browser.close();}
await writeFile(root+'docs/qa/character-comparison/browser.json',JSON.stringify({url:target,results},null,2)+'\n');

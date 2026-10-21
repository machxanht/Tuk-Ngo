import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import '../public/audio-dashboard/rules.js';
const rules=globalThis.AudioStudioRules,root=new URL('../',import.meta.url);
const context={window:{}};vm.runInNewContext(await readFile(new URL('public/audio-dashboard/data.js',root),'utf8'),context);
const data=JSON.parse(JSON.stringify(context.window.AUDIO_STUDIO_DATA));
assert.equal(data.schema,1);assert.equal(data.runtimeChanged,false);
assert.equal(data.script.cues.length,29);assert.equal(data.script.stages.length,10);
assert.equal(Object.keys(data.teams).length,61);
assert.equal(Object.keys(data.clips).length,213+(data.khmerHandoff?.summary.newFiles||0));
assert.deepEqual(data.coverage,{nameVi:58,nameKm:56,historyVi:3,historyKm:2});
assert.equal(new Set(data.script.cues.map(c=>c.id)).size,data.script.cues.length);
const cue=id=>data.script.cues.find(c=>c.id===id);
for(const c of data.script.cues){
 assert(data.script.stages.some(s=>s.id===c.stage));assert(c.when&&c.conditions.phases.length);
 for(const lang of ['vi','km'])for(const key of c.audio[lang])assert.equal(data.clips[key].lang,lang);
}
for(const [key,c]of Object.entries(data.clips)){
 const bytes=await readFile(new URL('public/assets/race-audio/'+c.sourceFile,root));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256,key);
 assert(c.duration>.08&&c.peak>.01&&c.peak<=1,key);
 if(c.lang==='vi')assert(['broadcast','user-supplied-recording'].includes(c.sourceType),'No Vietnamese AI');
}
const runtime=JSON.parse(await readFile(new URL('public/assets/race-audio/manifest.json',root)));
for(const [id,team]of Object.entries(data.teams)){
 assert.deepEqual(team.names.voice,runtime.teamProfiles[id].names.voice);
 if(runtime.teamProfiles[id].names.khmer.length)assert.deepEqual(team.names.khmer,runtime.teamProfiles[id].names.khmer,'Original Khmer names kept');
 for(const section of ['names','history'])for(const channel of ['voice','khmer'])for(const key of team[section][channel])assert(data.clips[key].teamIds.includes(id));
}
const state={phase:'racing',distance:400,elapsed:70,gap:1,pace:'steady',combo:40,stamina:70,surgeActive:false,leadChanged:false,cupChampion:false,result:'win',player:'can_tho-23',opponent:'ca_mau-05'};
assert(rules.eligibility(cue('close-race'),state).allowed);
assert(!rules.eligibility(cue('close-race'),{...state,gap:3}).allowed);
assert(!rules.eligibility(cue('lead-change'),{...state,gap:10}).allowed,'Gap does not prove a lead change');
assert(rules.eligibility(cue('lead-change'),{...state,gap:-10,leadChanged:true}).allowed);
assert.deepEqual(rules.namedTeams(cue('lead-change'),{...state,gap:-10}),['ca_mau-05']);
assert(!rules.eligibility(cue('surge'),{...state,distance:970}).allowed);
assert(rules.eligibility(cue('surge'),{...state,distance:970,surgeActive:true}).allowed);
assert(!rules.eligibility(cue('last-hundred'),{...state,distance:1150}).allowed);
assert(!rules.eligibility(cue('last-fifty'),{...state,distance:1200}).allowed);
assert(!rules.eligibility(cue('finish-win'),state).allowed,'Do not infer finish from a positive gap');
assert(rules.eligibility(cue('finish-loss'),{...state,phase:'finished',result:'loss'}).allowed);
assert.deepEqual(rules.namedTeams(cue('finish-loss'),{...state,result:'loss'}),['ca_mau-05']);
assert(!rules.eligibility(cue('cup-champion'),{...state,phase:'finished'}).allowed);
assert(rules.eligibility(cue('cup-champion'),{...state,phase:'finished',cupChampion:true}).allowed);
for(const c of data.script.cues)assert(!rules.eligibility(c,{...state,phase:'paused'}).allowed);
assert(!rules.eligibility(cue('history-tum-nup'),{...state,player:'can_tho-24'}).allowed,'Do not inherit history from another registration');
assert.equal(rules.lineStatus(cue('team-introduction'),'vi',data.clips),'needs-audio');
assert(!rules.selection(cue('team-introduction'),'vi',data,{...state,phase:'intro'}).allowed,'Never speak unresolved placeholders');
assert(rules.selection(cue('go'),'km',data,{...state,elapsed:.5,distance:1}).allowed);
assert(!rules.selection(cue('go'),'km',data,{...state,elapsed:4,distance:25}).allowed,'Discard stale start');
const changed=structuredClone(cue('go'));changed.text.km+=' ពាក្យថ្មី';
assert.equal(rules.lineStatus(changed,'km',data.clips),'reference-only');
assert(!rules.selection(changed,'km',data,{...state,elapsed:.5,distance:1}).allowed,'Editing text never changes the recording');
const requests=JSON.parse(await readFile(new URL('public/audio-dashboard/export/requests.json',root)));
for(const request of requests.requests){assert.equal(request.autoApprove,false);if(request.language==='vi')assert.equal(request.action,'find-and-cut-original');}
assert.equal(requests.vietnameseTtsAllowed,false);
if(data.khmerHandoff){
 const pack=data.khmerHandoff;
 assert.equal(pack.runtimeChanged,false);assert.equal(pack.nativeListeningVerified,false);
 assert.deepEqual(pack.summary,{files:89,reusedByHash:74,newFiles:15,cues:29,namedRegistrations:61,filesWithReviewWarnings:11});
 assert.equal(Object.keys(pack.cues).length,29);assert.equal(Object.keys(pack.names).length,61);
 const available=new Set();
 for(const [id,review]of Object.entries(pack.cues)){
  assert(cue(id));assert(review.variantKeys.includes(review.primaryKey));
  for(const key of review.variantKeys){assert.equal(data.clips[key].lang,'km');available.add(key);}
 }
 for(const [id,keys]of Object.entries(pack.names)){
  assert(data.teams[id]);for(const key of keys){assert(data.clips[key].teamIds.includes(id));available.add(key);}
 }
 for(const entry of Object.values(pack.files))assert(available.has(entry.clipId),'Every handed-off MP3 is reachable in the review UI');
 assert(pack.files['audio/ai-champion-kos-thum-km.mp3'].reviewWarnings.length,'Do not hide copied variant text');
 for(const id of ['ca_mau-04','ca_mau-10','ca_mau-13','can_tho-11','can_tho-32']){
  const key=pack.names[id][0];assert.equal(data.clips[key].text,'','Filename is not a Khmer transcript');
  assert(data.clips[key].reviewWarnings.length);assert.equal(data.clips[key].dashboardOnly,true);
 }
 assert.deepEqual(pack.repairs,{requested:3,generated:3});
 assert.equal(data.clips['khmer-intro'].meaningVi,'Quý khán giả thân mến.','A greeting is not a translated flyover paragraph');
 const repairManifest=JSON.parse(await readFile(new URL('public/assets/race-audio/khmer-review/repairs/manifest.json',root)));
 for(const repair of repairManifest.repairs){
  const clip=data.clips[repair.clipId];
  assert.equal(clip.sha256,repair.sha256);assert.equal(clip.text,repair.textKm);
  assert.equal(clip.meaningVi,repair.meaningVi);assert.equal(clip.textEvidence,'synthesis-request');
  assert.equal(createHash('sha256').update(repair.ssml).digest('hex'),repair.requestSha256);
  assert(repair.ssml.includes(repair.textKm));assert.equal(repair.nativeListeningVerified,false);
  assert.equal(clip.original.sha256,repair.originalSha256);
  const original=await readFile(new URL('public/assets/race-audio/'+clip.original.file,root));
  assert.equal(createHash('sha256').update(original).digest('hex'),repair.originalSha256,'Original retained');
 }
 const kos=data.clips['agy-ai-champion-kos-thum-km'];
 assert(kos.text.includes('កោះធំ ១')&&!kos.text.includes('ទុំនុប'));
 assert.equal(kos.usage.winnerId,'ca_mau-05');
 assert.deepEqual(data.clips['agy-ai-intro-match-tum-nup-kos-thum-km'].usage.teamIds,['can_tho-23','ca_mau-05']);
 for(const id of ['agy-ai-intro-carrier-km','agy-ai-champion-carrier-km']){
  assert.equal(data.clips[id].usage.kind,'fragment');assert(!data.clips[id].text.includes('ទុំនុប'));
 }
 console.log('AGY handoff: 89 verified file mappings, 74 reused / 15 new, all 29 cues and 61 name identities reachable; uncertain transcripts and copied variant labels stay flagged.');
}
console.log('Audio dashboard: contextual cues, hashed clips, exact identities, language isolation, source/AI provenance, stale/paused/result/history gates and edited-text safeguards passed.');

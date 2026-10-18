import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCommentaryDirector,resolveBroadcastCue,resolveTeamSpeech,normalizeAudioMix,isBroadcastClipApplicable,rowingWhistleSchedule} from '../src/race/race-audio.mjs';
import {FESTIVAL_TEAMS,festivalTeam} from '../src/race/festival-teams.mjs';
const folder=new URL('../public/assets/race-audio/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',folder)));
assert.equal(manifest.mode,'broadcast-vi-ai-km');assert.equal(manifest.schema,4);assert.equal(manifest.speechPolicy.voice,'original-broadcast-only');assert.equal(Object.values(manifest.clips).filter(c=>!c.role).length,67);
const stock=JSON.parse(await readFile(new URL('commentary-trial/manifest.json',folder)));
assert.equal(Object.values(manifest.clips).filter(c=>c.sourceType==='azure-stock-neural').length,16);
assert.deepEqual(Object.keys(manifest.sources).sort(),['crZF3hghbgQ','Y2fp9gYRIZ8','XagC29Eyt_U','tnb7TdUVRkU'].sort());
assert.equal(manifest.source.videoId,'crZF3hghbgQ');
assert.equal(manifest.source.captions.provider,'YouTube');assert.equal(manifest.source.captions.kind,'automatic');
assert.equal(manifest.source.captions.sha256,'a08fd520f7be92121755cf73dc3d8598f84c17be500aa403b5f1d6cf33008e6a');
assert.deepEqual((await readdir(folder)).filter(f=>f.endsWith('.mp3')).sort(),Object.values(manifest.clips).filter(c=>!c.file.includes('/')).map(c=>c.file).sort(),'No obsolete root recordings');
for(const [key,clip]of Object.entries(manifest.clips)){
 const bytes=await readFile(new URL(clip.file,folder));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256,key);
 assert(clip.duration>.08&&clip.duration<45&&clip.peak>.01&&clip.peak<=1,key);
 if(['broadcast-separated','licensed-recording'].includes(clip.sourceType)){
  assert(['drums','crowd','whistle'].includes(clip.channel));assert(clip.file.startsWith('field/'));
  const pack=JSON.parse(await readFile(new URL(manifest.fieldPack.file,folder)));assert.equal(pack.clips[key].sha256,clip.sha256);
  if(clip.sourceType==='broadcast-separated')assert.equal(clip.separation.parentSourceSha256,manifest.sources[clip.sourceId].sha256);
  else assert.equal(clip.recording.license,'CC0-1.0');continue;
 }
 if(clip.sourceType==='azure-stock-neural'){
  assert.equal(clip.channel,'khmer','Vietnamese synthesis is prohibited');assert.equal(clip.lang,'km');
  const evidence=clip.synthesisEvidence,sample=stock.samples.find(s=>s.id===evidence.id);
  assert(sample&&sample.language==='km');assert.equal(sample.text,clip.text);assert.equal(sample.sha256,clip.sha256);
  assert.equal(evidence.voice,'km-KH-PisethNeural');assert.equal(evidence.scriptSha256,stock.scriptSha256);
  assert.equal(evidence.manifestSha256,createHash('sha256').update(await readFile(new URL(evidence.manifest,folder))).digest('hex'));
  assert(!clip.sourceStart&&!clip.captionEvidence,'AI is not attributed to a broadcast timestamp');continue;
 }
 const origin=manifest.sources[clip.sourceId];assert(origin,key+' has an identified source');
 assert.equal(clip.sourceUrl,origin.url);assert.equal(clip.sourceType,'broadcast');assert(clip.sourceStart>=0&&clip.sourceEnd>clip.sourceStart&&clip.sourceEnd<=origin.duration);
 assert(Math.abs(clip.duration-(clip.sourceEnd-clip.sourceStart))<.04,key);
 if(['voice','khmer'].includes(clip.channel)){
  const evidence=clip.captionEvidence;assert(evidence?.words.length>0,key+' has original CC evidence');
  for(const [at]of evidence.words)assert(at>=clip.sourceStart&&at<clip.sourceEnd,key+' contains each selected word');
  assert(clip.sourceEnd-evidence.words.at(-1)[0]>=.12,key+' does not end at the last word onset');
  assert(clip.sourceEnd<=evidence.nextWordStart,key+' excludes the next phrase');
  const hasKhmer=/[\u1780-\u17ff]/.test(evidence.words.map(w=>w[1]).join(' '));
  assert.equal(hasKhmer,clip.channel==='khmer',key+' language agrees with CC');
  if(hasKhmer)assert(clip.translationVi?.length>0,key+' has a working translation');
 }
}
for(const event of Object.values(manifest.events))for(const channel of ['voice','khmer'])for(const key of event[channel])assert.equal(manifest.clips[key].channel,channel,key);
assert.equal(Object.values(manifest.clips).filter(c=>c.channel==='khmer'&&!c.role).length,20);
assert.deepEqual(Object.keys(manifest.teamProfiles).sort(),FESTIVAL_TEAMS.map(t=>t.registrationId).sort(),'Exact 61-entry roster, including missing recordings');
for(const team of FESTIVAL_TEAMS){
 const profile=manifest.teamProfiles[team.registrationId];
 for(const [kind,section]of [['name','names'],['history','history']]){
  const selected=resolveTeamSpeech(team,manifest,kind);assert.deepEqual(selected,profile[section]);
  for(const channel of ['voice','khmer'])for(const key of selected[channel])assert(manifest.clips[key].teamIds.includes(team.registrationId),'No other team recording');
 }
 for(const fact of profile.historyFacts){assert.equal(fact.season,2024);assert(fact.sources.length>0);assert(profile.history.voice.includes(fact.audioKey));}
}
const pair=[festivalTeam('tum-nup-2'),festivalTeam('kos-thum-1')];
assert.deepEqual(resolveTeamSpeech(pair[0],manifest),{voice:['name-tum-nup-two-vi'],khmer:['name-tum-nup-km']});
assert.deepEqual(resolveTeamSpeech(festivalTeam('can_tho-10'),manifest),{voice:[],khmer:[]},'Missing names never fall back to another team');
assert.deepEqual(resolveTeamSpeech(festivalTeam('can_tho-05'),manifest,'history'),{voice:[],khmer:[]},'Sro Lon 1 does not inherit Sro Lon 2 history');
assert.deepEqual(resolveTeamSpeech(festivalTeam('ca_mau-07'),manifest,'history'),{voice:[],khmer:[]},'Women do not inherit the male Kos Thum runner-up result');
assert.deepEqual(resolveBroadcastCue({id:'team-history'},manifest,pair),{voice:['history-tum-nup-champion-vi'],khmer:[]});
assert.deepEqual(resolveBroadcastCue({id:'opponent-history'},manifest,pair),{voice:['history-kos-thum-runner-up-vi'],khmer:[]});
assert.equal(resolveBroadcastCue({id:'intro'},manifest,pair).voice[0],'name-tum-nup-two-vi');
assert.equal(resolveBroadcastCue({id:'lead--1'},manifest,pair).voice[0],'name-kos-thum-one-vi');
assert.equal(resolveBroadcastCue({id:'finish',result:'loss'},manifest,pair).voice[0],'name-kos-thum-one-vi');
assert.equal(resolveBroadcastCue({id:'finish',result:'win'},manifest,pair).voice[0],'name-tum-nup-two-vi');
assert.deepEqual(manifest.events.go.khmer,['ai-go-km']);
for(const id of ['cruise','halfway'])assert.deepEqual(manifest.events[id].khmer,['ai-'+id+'-km'],'Context-specific Khmer AI at '+id);
for(const id of ['final','surge'])assert.deepEqual(manifest.events[id].khmer,['ai-'+id+'-km'],'Contextual Khmer effort cue at '+id);
const d=createCommentaryDirector(),state={phase:'countdown',elapsed:0,distances:[0,0],gap:0,pace:'steady',surgeActive:false,combo:0,stamina:100};
const step=changes=>d.update(Object.assign(state,changes));
assert.equal(step({})[0].id,'ready');assert.deepEqual(step({}),[]);
assert.equal(step({phase:'racing',elapsed:.01})[0].id,'go');
assert.deepEqual(resolveBroadcastCue(step({elapsed:4})[0],manifest),{voice:['broadcast-shore-paragraph','broadcast-intro'],khmer:['khmer-intro']});
assert.equal(step({elapsed:40,distances:[205,200],gap:5})[0].id,'cruise');
assert.equal(step({elapsed:55,distances:[280,284],gap:-4})[0].id,'lead--1');
assert.equal(step({elapsed:70,distances:[370,364],gap:6})[0].id,'lead-1');
assert.deepEqual(step({phase:'paused'}),[]);
assert.equal(step({phase:'racing',elapsed:160,distances:[960,980],gap:-20})[0].id,'final');
assert.equal(step({elapsed:161,surgeActive:true})[0].id,'surge');assert.deepEqual(step({elapsed:161.1}),[]);
for(const result of ['win','loss','dnf','tie']){
 d.reset();const cue=step({phase:'finished',result})[0],selection=resolveBroadcastCue(cue,manifest);
 assert.equal(cue.result,result);assert(selection.voice.length>0);assert.deepEqual(selection.khmer,['ai-finish-'+result+'-km'],'Exact Khmer result, never congratulate a loss');
}

// Do not announce the player's final sprint when only the rival crossed 950 m.
d.reset();assert(!step({phase:'racing',elapsed:160,distances:[400,960],gap:-560,surgeActive:false}).some(c=>c.id==='final'));
const racing={phase:'racing',elapsed:160,distances:[960,970],distance:960,gap:-10,pace:'steady',surgeActive:false};
assert.deepEqual(resolveBroadcastCue({id:'go',elapsed:0},manifest,[],racing),{voice:[],khmer:[]},'Drop a stale start cue');
assert.deepEqual(resolveBroadcastCue({id:'lead-1'},manifest,pair,racing),{voice:[],khmer:[]},'Do not announce a former leader');
assert.deepEqual(resolveBroadcastCue({id:'close-race'},manifest,[],racing),{voice:[],khmer:[]},'No level-race statement at a ten-metre gap');
assert.deepEqual(resolveBroadcastCue({id:'surge'},manifest,[],{...racing,distances:[500,510],pace:'steady'}),{voice:[],khmer:[]},'No hard-effort statement during steady mid-race paddling');
assert.deepEqual(resolveBroadcastCue({id:'team-history'},manifest,pair,{...racing,phase:'finished'}),{voice:[],khmer:[]},'Do not play historical standings after the current finish');
const variantA=resolveBroadcastCue({id:'final',variant:0},manifest,[],racing),variantB=resolveBroadcastCue({id:'final',variant:1},manifest,[],racing);
assert(variantA.voice.length>=2&&variantB.voice.length>=2);assert.notDeepEqual(variantA.voice,variantB.voice,'Choose one complete sentence block, not every event alternative');
assert(variantA.voice.reduce((n,k)=>n+manifest.clips[k].duration,0)>=9,'Sprint commentary must be a sustained passage');
const notRecent=resolveBroadcastCue({id:'final',variant:0,excludedKeys:variantA.voice},manifest,[],racing);
assert(notRecent.voice.length>0&&notRecent.voice.every(k=>!variantA.voice.includes(k)),'Select another eligible block after a repeat');
assert(!isBroadcastClipApplicable(manifest.clips['ai-cohesion-km'],{id:'cohesion'},{...racing,distances:[400,410],combo:0}),'Drop a stale praise cue after losing the combo');
assert(!isBroadcastClipApplicable(manifest.clips['ai-last-fifty-km'],{id:'last-fifty'},racing),'Do not say 50 metres when 240 remain');
for(const clip of Object.values(manifest.clips).filter(c=>c.channel==='voice'))assert.equal(clip.sourceType,'broadcast','No Vietnamese TTS/conversion in the runtime manifest');
assert(!isBroadcastClipApplicable(manifest.clips['khmer-full-effort'],{id:'surge'},{...racing,distances:[900,905],surgeActive:true}),'New Khmer effort phrase is final-only');
assert.deepEqual(resolveBroadcastCue({id:'finish',result:'tie'},manifest,[],{phase:'finished'}).voice,['broadcast-race-appraisal'],'A confirmed tie is not waiting for a judge');
assert.deepEqual(resolveBroadcastCue({id:'finish',result:'dnf'},manifest,[],{phase:'finished'}).voice,['broadcast-unfortunate']);
assert.equal(manifest.clips['name-pong-tuk-chas-km'].sourceId,'tnb7TdUVRkU');
assert.equal(manifest.clips['name-ta-on-vi'].sourceId,'Y2fp9gYRIZ8');
const catalog=JSON.parse(await readFile(new URL('catalog.json',folder)));
assert.equal(catalog.scope.completeYouTubeArchive,false);assert.equal(new Set(catalog.videos.map(v=>v.videoId)).size,catalog.videos.length);
assert(catalog.coverage.captionSources>=20&&catalog.coverage.captionCues>50000);
assert.equal(catalog.videos.find(v=>v.videoId==='F3wU7YfIivk').uploadYearDiffersFromTitle,true,'Do not infer a 2024 season from a 2022 reupload');
d.reset();assert.equal(step({phase:'countdown',elapsed:0})[0].id,'ready');
assert.deepEqual(step({phase:'racing',elapsed:190,distances:[1160,1150],gap:10,surgeActive:false}).map(c=>c.id),['last-fifty']);
assert.equal(normalizeAudioMix({volume:10,enabled:'no'}).volume,1);assert.equal(normalizeAudioMix({volume:NaN}).volume,.8);assert.equal(normalizeAudioMix(null).enabled,true);
assert.equal(normalizeAudioMix({chants:false}).khmer,false);assert.equal(normalizeAudioMix({chants:false,khmer:true}).khmer,true);
console.log('Broadcast audio: hashed original excerpts, CC word evidence, 61 team profiles, team/gender/number/history isolation, Vietnamese original-only / explicit Khmer AI provenance, event priority and preferences passed.');

// A cadence change moves real whistle onsets with the paddle catch. Render FPS
// only determines how early notes are submitted; it must not change their times.
for(const cadence of [72,84,90,96,102,114,120]){
 const capture=fps=>{let last=-1;const onsets=[];for(let i=0;i<fps*4;i++){const t=i/fps,s={phase:'racing',finishTimes:[null,null],cadence,beatPhase:t*cadence/60,raceStage:'cruise'};for(const n of rowingWhistleSchedule(s,last)){onsets.push({beat:n.beat,at:t+n.delay});last=n.beat;}}return onsets;};
 const fast=capture(60),slow=capture(15);for(const a of fast.filter(a=>a.beat>=1&&a.beat<4*cadence/60)){const b=slow.find(b=>b.beat===a.beat);assert(b&&Math.abs(a.at-b.at)<.001,'Whistle timing independent of render FPS');assert(Math.abs(a.at-(a.beat*60/cadence-.06))<.001,'Coach cue leads the catch by 60ms');}
}
assert.deepEqual(rowingWhistleSchedule({phase:'paused'}),[]);
assert.deepEqual(rowingWhistleSchedule({phase:'racing',finishTimes:[12,null]}),[]);
assert.equal(manifest.clips['river-bank-bed'].duration,40);assert.equal(manifest.clips['finish-crowd-bed'].duration,20);
assert(!manifest.clips['drum-low']&&!manifest.clips['broadcast-ambience'],'Old impact samples and tiny ambience loop are removed');
for(const groove of manifest.field.grooves)assert(Math.abs(manifest.clips[groove.key].duration-groove.beats*60/groove.bpm)<.002,'Eight-beat groove fits the paddle clock');
const recurring=createCommentaryDirector();const mid={...racing,elapsed:35,distances:[300,310],combo:0,stamina:90,surgeActive:false};recurring.update(mid,{history:[false,false]});
assert(recurring.update({...mid,elapsed:51},{history:[false,false]}).some(c=>c.id==='race-call'),'Fill quiet stretches with contextual commentary');
assert.deepEqual(recurring.update({...mid,elapsed:70},{history:[false,false],speaking:true}),[],'Do not queue routine calls over an active passage');
console.log('Recorded whistle timing, eight-beat grooves, longer beds and recurring sentence blocks passed.');

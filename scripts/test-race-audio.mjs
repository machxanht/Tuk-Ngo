import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCommentaryDirector,resolveBroadcastCue,normalizeAudioMix} from '../src/race/race-audio.mjs';
const folder=new URL('../public/assets/race-audio/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',folder)));
assert.equal(manifest.mode,'broadcast');assert.equal(Object.keys(manifest.clips).length,19);
assert.equal(manifest.source.videoId,'crZF3hghbgQ');
assert.equal(manifest.source.captions.provider,'YouTube');assert.equal(manifest.source.captions.kind,'automatic');
assert.equal(manifest.source.captions.sha256,'a08fd520f7be92121755cf73dc3d8598f84c17be500aa403b5f1d6cf33008e6a');
assert.deepEqual((await readdir(folder)).filter(f=>f.endsWith('.mp3')).sort(),Object.values(manifest.clips).map(c=>c.file).sort(),'No obsolete synthetic recordings');
for(const [key,clip]of Object.entries(manifest.clips)){
 const bytes=await readFile(new URL(clip.file,folder));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256,key);
 assert(clip.duration>.08&&clip.duration<15&&clip.peak>.01&&clip.peak<=1,key);
 assert.equal(clip.sourceType,'broadcast');assert(clip.sourceStart>=0&&clip.sourceEnd>clip.sourceStart&&clip.sourceEnd<=manifest.source.duration);
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
assert.equal(Object.values(manifest.clips).filter(c=>c.channel==='khmer').length,3);
assert.deepEqual(manifest.events.go.khmer,['khmer-go']);
for(const id of ['cruise','halfway','final','surge'])assert.deepEqual(manifest.events[id].khmer,[],'No unrelated Khmer speech at '+id);
const d=createCommentaryDirector(),state={phase:'countdown',elapsed:0,distances:[0,0],gap:0,pace:'steady',surgeActive:false,combo:0,stamina:100};
const step=changes=>d.update(Object.assign(state,changes));
assert.equal(step({})[0].id,'ready');assert.deepEqual(step({}),[]);
assert.equal(step({phase:'racing',elapsed:.01})[0].id,'go');
assert.deepEqual(resolveBroadcastCue(step({elapsed:4})[0],manifest),{voice:['broadcast-intro'],khmer:['khmer-intro']});
assert.equal(step({elapsed:40,distances:[205,200],gap:5})[0].id,'cruise');
assert.equal(step({elapsed:55,distances:[280,284],gap:-4})[0].id,'lead--1');
assert.equal(step({elapsed:70,distances:[370,364],gap:6})[0].id,'lead-1');
assert.deepEqual(step({phase:'paused'}),[]);
assert.equal(step({phase:'racing',elapsed:160,distances:[960,980],gap:-20})[0].id,'final');
assert.equal(step({elapsed:161,surgeActive:true})[0].id,'surge');assert.deepEqual(step({elapsed:161.1}),[]);
for(const result of ['win','loss','dnf','tie']){
 d.reset();const cue=step({phase:'finished',result})[0],selection=resolveBroadcastCue(cue,manifest);
 assert.equal(cue.result,result);assert(selection.voice.length>0);assert.deepEqual(selection.khmer,result==='win'?['khmer-finish']:[],'Congratulations only follows a player win');
}
d.reset();assert.equal(step({phase:'countdown',elapsed:0})[0].id,'ready');
assert.deepEqual(step({phase:'racing',elapsed:190,distances:[1160,1150],gap:10,surgeActive:false}).map(c=>c.id),['last-fifty']);
assert.equal(normalizeAudioMix({volume:10,enabled:'no'}).volume,1);assert.equal(normalizeAudioMix({volume:NaN}).volume,.8);assert.equal(normalizeAudioMix(null).enabled,true);
assert.equal(normalizeAudioMix({chants:false}).khmer,false);assert.equal(normalizeAudioMix({chants:false,khmer:true}).khmer,true);
console.log('Broadcast audio: 19 hashed original excerpts; YouTube CC word evidence, language/context routing, no synthetic assets, result isolation, event priority and preference migration passed.');

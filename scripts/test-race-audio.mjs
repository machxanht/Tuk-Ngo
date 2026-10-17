import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCommentaryDirector,normalizeAudioMix} from '../src/race/race-audio.mjs';
import {FESTIVAL_TEAMS} from '../src/race/festival-teams.mjs';
const manifest=JSON.parse(await readFile(new URL('../public/assets/race-audio/manifest.json',import.meta.url)));
assert.equal(Object.keys(manifest.clips).length,88);
for(const team of FESTIVAL_TEAMS)assert(manifest.clips['name-'+team.id],team.id);
for(const [key,clip]of Object.entries(manifest.clips)){
 const bytes=await readFile(new URL('../public/assets/race-audio/'+clip.file,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256,key);
 assert(clip.duration>.08&&clip.duration<15&&clip.peak>.01&&clip.peak<=1,key);
}
const teams=[FESTIVAL_TEAMS[0],FESTIVAL_TEAMS.at(-1)],d=createCommentaryDirector();
const state={phase:'countdown',elapsed:0,distances:[0,0],gap:0,pace:'steady',surgeActive:false,combo:0,stamina:100};
const step=changes=>d.update(Object.assign(state,changes),teams);
assert.equal(step({})[0].id,'ready');assert.deepEqual(step({}),[]);
assert.equal(step({phase:'racing',elapsed:.01})[0].id,'go');
assert.deepEqual(step({elapsed:4})[0].clips,['intro','name-'+teams[0].id,'versus','name-'+teams[1].id]);
assert.equal(step({elapsed:40,distances:[205,200],gap:5})[0].id,'cruise');
assert.equal(step({elapsed:55,distances:[280,284],gap:-4})[0].clips[0],'name-'+teams[1].id);
assert.equal(step({elapsed:70,distances:[370,364],gap:6})[0].clips[0],'name-'+teams[0].id);
assert.deepEqual(step({phase:'paused',gap:-10,distances:[370,364]}),[]);
const final=step({phase:'racing',elapsed:160,distances:[960,980],gap:-20});
assert.equal(final[0].id,'final');assert.equal(final[0].chant,'chant-encourage');
assert.equal(step({elapsed:161,surgeActive:true})[0].id,'surge');
assert.deepEqual(step({elapsed:161.1}),[]);
const finish=step({phase:'finished',result:'win',elapsed:200,distances:[1200,1180]});
assert.deepEqual(finish[0].clips,['finish','name-'+teams[0].id,'winner']);assert.equal(finish[0].chant,'chant-victory');
assert.deepEqual(step({}),[]);
for(const result of ['win','loss','dnf','tie']){
 d.reset();const cue=step({phase:'finished',result})[0];
 if(result==='tie')assert.deepEqual(cue.clips,['tie']);
 else assert.equal(cue.clips[1],'name-'+teams[result==='win'?0:1].id);
 for(const key of [...cue.clips,...(cue.chant?[cue.chant]:[])])assert(manifest.clips[key],key);
}
d.reset();assert.equal(step({phase:'countdown',elapsed:0})[0].id,'ready');
// Seeking over multiple stages must not announce stale cruise/halfway calls.
assert.deepEqual(step({phase:'racing',elapsed:190,distances:[1160,1150],gap:10,surgeActive:false}).map(c=>c.id),['last-fifty']);
assert.equal(normalizeAudioMix({volume:10,enabled:'no'}).volume,1);assert.equal(normalizeAudioMix({volume:NaN}).volume,.8);
assert.equal(normalizeAudioMix(null).enabled,true);
console.log('Race audio: 88 nonempty hashed clips, 61 names, Khmer cues, actual leader/result, milestone priority, reset and preference validation passed.');

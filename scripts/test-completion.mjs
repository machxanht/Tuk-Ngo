import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sealGuestProfile,openGuestProfile} from '../src/race/profile-transfer.mjs';
import {venueIdentity} from '../src/race/venue-identity.mjs';
import {festivalBannerLayout} from '../src/race/festival-branding.mjs';
import {teamsForVenue} from '../src/race/festival-teams.mjs';
import {resolveVenueSpeech,clipMatchesVenue,createCommentaryDirector} from '../src/race/race-audio.mjs';
import {PROFILE_COPY} from '../src/race/online-language.ts';
const id='12345678-1234-1234-1234-123456789abc',claim=Buffer.from(JSON.stringify({id})).toString('base64url'),profile={id,token:claim+'.unit-signature',name:'Test profile'},password='A private test password';
const a=await sealGuestProfile(profile,password),b=await sealGuestProfile(profile,password);assert.notDeepEqual(a,b,'Random salts and IVs');assert(!new TextDecoder().decode(a).includes(profile.token));assert.deepEqual(await openGuestProfile(a,password),profile);
await assert.rejects(openGuestProfile(a,'wrong password'));await assert.rejects(openGuestProfile(a.slice(0,-1),password));const changed=a.slice();changed[45]^=1;await assert.rejects(openGuestProfile(changed,password));await assert.rejects(openGuestProfile(new Uint8Array(4097),password));await assert.rejects(sealGuestProfile(profile,'short'));await assert.rejects(sealGuestProfile({...profile,id:'not-a-profile'},password));
for(const language of ['km','en'])assert.deepEqual(Object.keys(PROFILE_COPY[language]).sort(),Object.keys(PROFILE_COPY.vi).sort());
const pack=JSON.parse(await readFile('public/assets/race-audio/venues/manifest.json','utf8'));assert.equal(Object.keys(pack.clips).length,42);
for(const [key,clip]of Object.entries(pack.clips)){const bytes=await readFile('public/assets/race-audio/'+clip.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256,key);assert(clip.peak>.01&&clip.peak<1&&clip.rms>.001&&clip.duration>1);assert.equal(clip.nativeListeningVerified,false);assert.equal(clip.sourceType,'azure-stock-neural');assert(['km','en'].includes(clip.lang));assert.equal(clip.venueIds.length,1);}
const backgrounds=new Set();for(const venueId of ['maspero','phnom-penh','siem-reap']){
 const identity=venueIdentity(venueId),layout=festivalBannerLayout('ពិធីបុណ្យអុំទូក',venueId);assert.equal(layout.venueId,venueId);assert(layout.lines[1].includes(identity.short));backgrounds.add(layout.background);
 const teams=teamsForVenue(venueId).slice(0,2),state={phase:'racing',venueId,raceStage:'start'},cue={id:'intro'};
 for(const language of ['km','en']){const result=resolveVenueSpeech(cue,pack,language,teams,state);assert(result.khmer.length>0);for(const key of result.khmer){assert.equal(pack.clips[key].lang,language);assert(clipMatchesVenue(pack.clips[key],venueId));}assert.deepEqual(resolveVenueSpeech({id:'flyover'},pack,language,teams,state),{voice:[],khmer:[]});assert.deepEqual(resolveVenueSpeech(cue,pack,language,teams,{...state,raceStage:'cruise'}),{voice:[],khmer:[]});}
 if(venueId!=='maspero')for(const team of teams)assert(pack.teamProfiles[team.id]?.names.khmer.length===1);
 const foreign=teamsForVenue(venueId==='phnom-penh'?'siem-reap':'phnom-penh').slice(0,2);assert.equal(resolveVenueSpeech(cue,pack,'km',foreign,state).khmer.length,1,'Never announce foreign team names');
}
assert.equal(backgrounds.size,3);assert(!clipMatchesVenue({text:'Twelve hundred metres',venueIds:['maspero']},'siem-reap'));
const director=createCommentaryDirector();assert.equal(director.update({phase:'intro',elapsed:0})[0].id,'flyover');assert.deepEqual(director.update({phase:'intro',elapsed:0}),[]);
console.log('Encrypted profile roundtrip/tamper protection, three event identities, 42 hashed venue clips, language/map/name isolation and intro cue passed.');

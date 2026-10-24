import {raceVenue,commentaryDistance} from './race-venues.mjs';
// Original Vietnamese broadcast cuts; stock neural Khmer/English narration.
export const DEFAULT_AUDIO_MIX={enabled:true,voice:true,khmer:true,whistle:true,drums:true,crowd:true,volume:.8};
export function normalizeAudioMix(value={}){
 const mix={...DEFAULT_AUDIO_MIX};
 for(const key of ['enabled','voice','khmer','whistle','drums','crowd'])if(typeof value?.[key]==='boolean')mix[key]=value[key];
 if(typeof value?.khmer!=='boolean'&&typeof value?.chants==='boolean')mix.khmer=value.chants;
 if(Number.isFinite(value?.volume))mix.volume=Math.max(0,Math.min(1,value.volume));
 return mix;
}
export function createCommentaryDirector(){
 let previous=null,seen=new Set(),leader=0,lastLead=-20,lastPace=-20,lastRoutine=0;
 return {
  reset(){previous=null;seen=new Set();leader=0;lastLead=-20;lastPace=-20;lastRoutine=0;},
  update(s,options={}){
   const cues=[],emit=(id,priority=1)=>cues.push({id,priority,elapsed:s.elapsed,result:s.result||null,state:{phase:s.phase,raceStage:s.raceStage,distance:s.distances?.[0]||0,gap:s.gap,pace:s.pace,surgeActive:s.surgeActive,elapsed:s.elapsed,combo:s.combo,stamina:s.stamina}});
   const once=(id,priority=1)=>{if(!seen.has(id)){seen.add(id);emit(id,priority);}};
   if(s.phase==='intro')once('flyover',1);
   if(s.phase==='countdown')once('ready',2);
   if(s.phase==='finished')once('finish',5);
   else if(s.phase==='racing'){
    if(!seen.has('go')){seen.add('go');if(s.elapsed<3)emit('go',3);}
    const distance=s.distances[0],milestones=[[200,'cruise'],[600,'halfway'],[950,'final'],[1100,'last-hundred'],[1150,'last-fifty']];
    const crossed=milestones.filter(([m,id])=>distance>=m&&!seen.has(id));
    for(const [,id]of crossed)seen.add(id);
    if(crossed.length)emit(crossed.at(-1)[1],distance>=950?4:2);
    if(s.elapsed>=3&&s.elapsed<20)once('intro',2);
    if(s.surgeActive&&!previous?.surgeActive)emit('surge',4);
    if(previous?.phase==='racing'&&s.pace!==previous.pace&&s.elapsed-lastPace>12){
     if(s.pace==='sprint')emit('pace-sprint',2);
     if(s.pace==='recover')emit('recover');
     lastPace=s.elapsed;
    }
    const nextLeader=s.gap>3?1:s.gap< -3?-1:leader;
    if(nextLeader!==leader){if(leader!==0&&s.elapsed-lastLead>=12){emit('lead-'+nextLeader,3);lastLead=s.elapsed;}leader=nextLeader;}
    if(s.elapsed>30&&Math.abs(s.gap)<2)once('close-race');
    if(s.combo>=30)once('cohesion');
    if(s.stamina<20&&s.elapsed>20&&distance<950&&s.pace!=='sprint')once('fatigue',2);
    if(!cues.length&&distance>=200&&distance<450&&options.history?.[0]!==false)once('team-history');
    if(!cues.length&&distance>=450&&distance<750&&options.history?.[1]!==false)once('opponent-history');
    if(!cues.length&&!options.speaking&&s.elapsed>=18&&s.elapsed-lastRoutine>=14){emit('race-call');lastRoutine=s.elapsed;}
   }
   previous={phase:s.phase,pace:s.pace,surgeActive:s.surgeActive};
   const selected=cues.sort((a,b)=>b.priority-a.priority).slice(0,1);
   if(selected.length&&selected[0].id!=='race-call')lastRoutine=s.elapsed;
   return selected;
  },
 };
}
// Use only original recordings assigned to this registration. Shared pagoda
// names do not invent a gender or number; historical standings stay separate
// from the result of the current game.
export function resolveTeamSpeech(team,manifest,kind='name'){
 const registration=typeof team==='string'?team:team?.registrationId||team?.id;
 const entry=manifest.teamProfiles?.[registration]?.[kind==='history'?'history':'names'];
 const role=kind==='history'?'team-history':'team-name',selection={voice:[],khmer:[]};
 for(const channel of ['voice','khmer'])selection[channel]=(entry?.[channel]||[]).filter(key=>{const c=manifest.clips[key];return c?.role===role&&c.channel===channel&&c.teamIds?.includes(registration);});
 return selection;
}
export function clipMatchesVenue(clip,venueId='maspero'){
 if(clip?.venueIds&&!clip.venueIds.includes(venueId))return false;
 return venueId==='maspero'||!/Masp[eé]ro|Sóc Trăng|1[.,]200|một nghìn hai trăm|ម៉ាស្ពេរ៉ូ|ខេត្តឃ្លាំង/i.test(clip?.text||'');
}
export function resolveVenueSpeech(cue,pack,language,teams,state){
 if(!pack||!['km','en'].includes(language))return null;
 const id=cue.id==='race-call'&&state?.raceStage==='cruise'?'cruise':cue.id;
 const options=pack.events?.[state?.venueId||'maspero']?.[language]?.[id];if(!options)return null;
 const keys=options.filter(key=>!cue.excludedKeys?.includes(key));if(!keys.length)return null;
 if(id==='flyover'&&state?.phase!=='intro'||id!=='flyover'&&(state?.phase!=='racing'||id==='cruise'&&state?.raceStage!=='cruise'||id==='intro'&&state?.raceStage!=='start'))return {voice:[],khmer:[]};
 const names=language==='km'&&id==='intro'?teams.flatMap(t=>resolveTeamSpeech(t,pack).khmer):[];
 return {voice:[],khmer:[...names,...keys].filter(key=>pack.clips[key]?.lang===language&&clipMatchesVenue(pack.clips[key],state?.venueId))};
}
export function isBroadcastClipApplicable(clip,cue,state=cue.state){
 const rules=clip?.conditions;if(!rules)return true;
 if(!state)return false;
 if(rules.phases&&!rules.phases.includes(state.phase))return false;
 if(rules.paces&&!rules.paces.includes(state.pace))return false;
 if(rules.results&&!rules.results.includes(cue.result))return false;
 const distance=state.distances?.[0]??state.distance;
 if(rules.minDistance!=null&&!(distance>=rules.minDistance))return false;
 if(rules.maxDistance!=null&&!(distance<rules.maxDistance))return false;
 if(rules.maxAbsGap!=null&&!(Math.abs(state.gap)<=rules.maxAbsGap))return false;
 if(rules.minAbsGap!=null&&!(Math.abs(state.gap)>=rules.minAbsGap))return false;
 if(rules.surgeActive!=null&&state.surgeActive!==rules.surgeActive)return false;
 if(rules.leadChanged&&!cue.id.startsWith('lead-'))return false;
 if(rules.minCombo!=null&&!(state.combo>=rules.minCombo))return false;
 if(rules.maxStamina!=null&&!(state.stamina<=rules.maxStamina))return false;
 if(rules.requiresHardEffort&&!(state.surgeActive||state.pace==='sprint'||distance>=950))return false;
 if(rules.minElapsed!=null&&!((state.elapsed??cue.elapsed)>=rules.minElapsed))return false;
 if(rules.maxElapsed!=null&&!((state.elapsed??cue.elapsed)<=rules.maxElapsed))return false;
 return true;
}
export function resolveBroadcastCue(cue,manifest,teams=[],state=cue.state){
 if(cue.id==='intro'&&state&&(state.phase!=='racing'||(state.distances?.[0]??state.distance??0)>=200||state.raceStage&&state.raceStage!=='start'))return {voice:[],khmer:[]};
 if(['team-history','opponent-history'].includes(cue.id)){
  if(state&&(state.phase!=='racing'||(state.distances?.[0]??state.distance)>=950))return {voice:[],khmer:[]};
  return resolveTeamSpeech(teams[cue.id==='team-history'?0:1],manifest,'history');
 }
 if(state&&cue.id.startsWith('lead-')&&(cue.id==='lead--1'?!(state.gap< -3):!(state.gap>3)))return {voice:[],khmer:[]};
 const distance=state?.distances?.[0]??state?.distance??0;
 const routine=cue.id==='race-call'?(distance>=950?'final':Math.abs(state?.gap)<=2?'close-race':state?.pace==='recover'?'recover':distance<600?'cruise':'halfway'):null;
 const id=routine||(cue.id==='finish'&&['tie','dnf','loss'].includes(cue.result)?cue.result:cue.id.startsWith('lead-')?'lead':cue.id);
 const event=manifest.events[id]||{voice:[],khmer:[]};
 // Event arrays are alternatives, not a sentence made by joining every recording.
 const eligible=key=>!cue.excludedKeys?.includes(key)&&isBroadcastClipApplicable(manifest.clips[key],cue,state);
 const choose=channel=>{
  const blocks=(event[channel+'Blocks']||[]).filter(block=>block.every(eligible));
  if(blocks.length)return [...blocks[(cue.variant||0)%blocks.length]];
  const keys=event[channel].filter(eligible);return keys.length?[keys[(cue.variant||0)%keys.length]]:[];
 };
 const selection={voice:choose('voice'),khmer:choose('khmer')};
 const named=cue.id==='intro'?teams:cue.id.startsWith('lead-')?[teams[cue.id==='lead--1'?1:0]]:cue.id==='finish'&&['win','loss'].includes(cue.result)?[teams[cue.result==='win'?0:1]]:[];
 for(const channel of ['voice','khmer'])selection[channel]=[...named.flatMap(t=>resolveTeamSpeech(t,manifest)[channel]),...selection[channel]];
 return selection;
}

// Schedule on the audio clock ahead of the paddle catch, independent of frame rate.
export function rowingWhistleSchedule(s,lastBeat=-1,horizon=.7){
 if(s.phase!=='racing'||s.finishTimes?.[0]!=null)return [];
 const period=60/s.cadence,first=Math.max(lastBeat+1,Math.ceil(s.beatPhase-.02));
 const notes=[];
 for(let beat=first;beat<=s.beatPhase+(horizon+.06)/period;beat++){
  const delay=(beat-s.beatPhase)*period-.06;
  if(delay>=-.08)notes.push({beat,delay:Math.max(.005,delay),strong:(s.raceStage==='final'||s.surgeActive)&&beat%4===0});
 }
 return notes;
}

export function createRaceAudio({baseUrl='/',onCaption=()=>{},onError=()=>{},onPreviewState=()=>{}}={}) {
 const directory=baseUrl+'assets/race-audio/',director=createCommentaryDirector();
 let mix=normalizeAudioMix(),context=null,buses=null,manifest=null,manifestPromise=null;
 let language='mixed',english=null,englishPromise=null,venuePack=null,venuePromise=null;
 let active=false,disposed=false,epoch=0,queue=[],speaking=false,matchSerial=0;
 let previewing=false,previewSerial=0;
 let teams=[],latest=null,lastBeat=null,crowdSource=null,crowdPending=false,voiceUntil=0,ambienceStage=0;
 let crowdKey=null,grooveKey=null,groovePending=false,lastWhistleBeat=-1,rhythmCadence=0,lastRhythmAudio=-1;
 const cache=new Map(),recentClips=new Map(),sources=new Set(),abort=new AbortController();
 const metrics={drumHits:0,drumKinds:{'drum-low':0,'drum-open':0,'drum-rim':0},drumLoops:0,groovesPlayed:[],whistleBlows:0,strongWhistles:0,voiceClips:0,khmerClips:0,cues:[],played:[],errors:[],decoded:0};
 // A skipped flyover can still be finishing before GO. Allow the participant
 // introduction to survive that sentence and a slow fetch, within start only.
 const cueMaxAge=cue=>cue.id==='intro'?22:cue.priority>=4?20:9;
 function fail(error){if(disposed||error?.name==='AbortError')return;const message=String(error?.message||error);if(!metrics.errors.includes(message)){metrics.errors.push(message);onError(message);}}
 function loadManifest(){
  if(!manifestPromise)manifestPromise=fetch(directory+'manifest.json',{signal:abort.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Audio manifest: '+r.status);return r.json();}).then(m=>{if(!['broadcast','broadcast-vi-ai-km'].includes(m.mode))throw Error('Cần tải lại bộ bình luận');return manifest=m;}).catch(e=>{manifestPromise=null;throw e;});
  return manifestPromise.then(async m=>{
   if(language==='en'){
    englishPromise??=fetch(directory+'english/manifest.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('English narration: '+r.status);return r.json();}).then(data=>{english=data;Object.assign(m.clips,data.clips);return data;}).catch(e=>{englishPromise=null;throw e;});await englishPromise;
   }
   if(language!=='vi'){
    venuePromise??=fetch(directory+'venues/manifest.json',{signal:abort.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Venue narration: '+r.status);return r.json();}).then(data=>venuePack=data).catch(e=>{venuePromise=null;throw e;});
    const pack=await venuePromise;Object.assign(m.clips,pack.clips);Object.assign(m.teamProfiles,pack.teamProfiles);
   }return m;
  });
 }
 function speechSelection(cue,state=latest){
  const local=resolveVenueSpeech(cue,venuePack,language,teams,state);if(local)return local;
  if(language==='en'){
   const id=cue.id==='race-call'?(state?.raceStage==='final'?'final':Math.abs(state?.gap)<2?'close-race':'cruise'):cue.id.startsWith('lead-')?'lead':cue.id==='finish'&&['loss','tie','dnf'].includes(cue.result)?cue.result:cue.id;
   return {voice:[],khmer:[...(english?.events[id]||[])]};
  }
  const selected=resolveBroadcastCue(cue,manifest,teams,state);
  if(language==='mixed')return selected;
  if(language==='vi')return {voice:selected.voice.filter(key=>manifest.clips[key].lang==='vi'&&manifest.clips[key].sourceType==='broadcast'&&clipMatchesVenue(manifest.clips[key],state?.venueId)),khmer:[]};
  return {voice:[],khmer:selected.khmer.filter(key=>manifest.clips[key].lang==='km'&&/neural|synthes/i.test(manifest.clips[key].sourceType||''))};
 }
 function warmupKeys(keys){return keys.filter(key=>{const clip=manifest.clips[key];if(!clip)return false;if(!['voice','khmer'].includes(clip.channel))return true;if(language==='mixed')return true;if(language==='vi')return clip.lang==='vi'&&clip.sourceType==='broadcast';return clip.lang===language&&/neural|synthes/i.test(clip.sourceType||'');});}
 function load(key){
  if(!cache.has(key))cache.set(key,(async()=>{
   const m=await loadManifest(),entry=m.clips[key==='crowd'?m.ambience:key];
   if(!entry)throw Error('Unknown audio clip: '+key);
   const url=directory+entry.file+'?clip='+entry.sha256.slice(0,12);
   const response=await fetch(url,{signal:abort.signal});if(!response.ok)throw Error('Audio '+key+': '+response.status);
   const bytes=await response.arrayBuffer();if(disposed)throw new DOMException('Disposed','AbortError');
   const buffer=await context.decodeAudioData(bytes);metrics.decoded++;return buffer;
  })().catch(e=>{cache.delete(key);throw e;}));
  return cache.get(key);
 }
 function permitted(channel){return !disposed&&active&&mix.enabled&&mix[channel]&&!(channel==='voice'&&!['mixed','vi'].includes(language))&&!(channel==='khmer'&&language==='vi')&&context?.state==='running';}
 function stopSources(channel){
  for(const item of [...sources])if(!channel||item.channel===channel){try{item.node.stop();}catch{/* Already ended. */}item.node.disconnect();sources.delete(item);}
  if(!channel||channel==='crowd'){crowdSource=null;crowdKey=null;}
  if(!channel||channel==='drums')grooveKey=null;
  if(!channel||channel==='whistle')lastWhistleBeat=-1;
 }
 function clearSpeech(){epoch++;queue=[];speaking=false;voiceUntil=0;stopSources('voice');stopSources('khmer');onCaption('');applyMix();}
 function applyMix(){
  if(!context)return;const t=context.currentTime,duck=voiceUntil>t;
  buses.master.gain.setTargetAtTime(active&&mix.enabled?mix.volume:0,t,.025);
  for(const [key,gain]of Object.entries({voice:.92,khmer:.76,whistle:duck?.18:.32,drums:duck?.16:.32,crowd:(duck?.075:.16)*(ambienceStage?1.4:1)}))buses[key].gain.setTargetAtTime(mix[key]?gain:0,t,.035);
 }
 function source(buffer,channel,{when=0,gain=1,rate=1,loop=false,offset=0}={}){
  if(!permitted(channel))return null;
  const node=context.createBufferSource(),level=context.createGain();node.buffer=buffer;node.playbackRate.value=rate;node.loop=loop;level.gain.value=gain;node.connect(level);level.connect(buses[channel]);
  const item={node,channel};sources.add(item);node.addEventListener('ended',()=>{sources.delete(item);node.disconnect();level.disconnect();});node.start(context.currentTime+when,offset);return node;
 }
 async function ambient(){
  if(crowdPending||!permitted('crowd')||!['racing','countdown'].includes(latest?.phase))return;
  const key=manifest?.field?.ambience[ambienceStage?'final':'cruise']||'crowd';
  if(crowdSource&&crowdKey===key)return;
  crowdPending=true;
  try{const buffer=await load(key);if(permitted('crowd')&&['racing','countdown'].includes(latest?.phase)){stopSources('crowd');crowdSource=source(buffer,'crowd',{loop:true});crowdKey=key;}}catch(e){fail(e);}finally{crowdPending=false;}
 }
 async function pump(){
  if(speaking||!active||!mix.enabled||disposed)return;
  queue=queue.filter(c=>latest&&latest.elapsed-c.elapsed<cueMaxAge(c));
  const cue=queue.shift();if(!cue)return;
  speaking=true;const token=epoch;
  try{
   await loadManifest();
   // Try another eligible whole phrase when the first alternative is recent.
   const cooldown=key=>manifest.clips[key].role==='team-name'?8:manifest.clips[key].duration>=5?85:18;
   cue.excludedKeys=[...recentClips].filter(([key,at])=>context.currentTime-at<cooldown(key)).map(([key])=>key);
   const selection=speechSelection(cue,latest);
   const keys=[...(mix.voice?selection.voice:[]),...(mix.khmer?selection.khmer:[])].filter(key=>context.currentTime-(recentClips.get(key)??-Infinity)>=cooldown(key));
   // Fetch the phrase in parallel, then schedule it as one uninterrupted sentence.
   const buffers=await Promise.all(keys.map(load));if(token!==epoch||!active||!mix.enabled||disposed||latest.elapsed-cue.elapsed>cueMaxAge(cue)||(cue.id==='ready'&&latest.phase!=='countdown'))return;
   const current=speechSelection(cue,latest);if(keys.some(key=>!current.voice.includes(key)&&!current.khmer.includes(key)))return;
   let offset=.02;
   for(let i=0;i<keys.length;i++){
    const key=keys[i],channel=manifest.clips[key].channel;if(!permitted(channel))continue;
    const entry=manifest.clips[key],deadline=entry.conditions?.maxElapsed;
    if(cue.id==='ready'&&offset+buffers[i].duration>latest.countdown)continue;
    if(deadline!=null&&latest.elapsed+offset>deadline)continue;
    const node=source(buffers[i],channel,{when:offset});if(!node)continue;
    metrics[channel==='voice'?'voiceClips':'khmerClips']++;
    recentClips.set(key,context.currentTime+offset);
    metrics.played.push({key,cue:cue.id,sourceId:entry.sourceId,duration:buffers[i].duration,at:context.currentTime+offset,match:teams.map(t=>t.id),state:{phase:latest.phase,distance:latest.distances?.[0],gap:latest.gap,pace:latest.pace,surgeActive:latest.surgeActive,result:cue.result}});if(metrics.played.length>100)metrics.played.shift();
    offset+=buffers[i].duration+.075;
    // Captions are updated at actual clip boundaries by update(), with no timers.
    captions.push({at:context.currentTime+offset-buffers[i].duration-.075,text:entry.text,token});
   }
   voiceUntil=context.currentTime+offset;applyMix();
  }catch(e){fail(e);voiceUntil=0;}
  finally{if(token===epoch&&voiceUntil<=context.currentTime)speaking=false;}
 }
 let captions=[];
 function enqueue(cue){
  if(!mix.voice&&!mix.khmer)return;
  metrics.cues.push(cue.id);if(metrics.cues.length>100)metrics.cues.shift();
  // Finish the current excerpt. A new sprint/finish cue must not cut a word in half.
  queue=queue.filter(c=>c.priority>=cue.priority);queue.push({...cue,variant:matchSerial+metrics.cues.length-1});queue.sort((a,b)=>b.priority-a.priority);queue=queue.slice(0,3);void pump();
 }
 function drum(s){
  if(!context||s.phase!=='racing'||s.finishTimes[0]!=null)return;
  if(context.currentTime-lastRhythmAudio<.025)return;
  lastRhythmAudio=context.currentTime;
  if(rhythmCadence!==s.cadence){stopSources('whistle');stopSources('drums');rhythmCadence=s.cadence;}
  const token=epoch,field=manifest?.field;if(!field)return;
  if(permitted('drums')&&!groovePending){
   const groove=field.grooves.reduce((a,b)=>Math.abs(b.bpm-s.cadence)<Math.abs(a.bpm-s.cadence)?b:a);
   if(grooveKey!==groove.key){
    groovePending=true;
    load(groove.key).then(buffer=>{
     if(token!==epoch||!permitted('drums')||latest?.phase!=='racing'||latest.cadence!==groove.bpm)return;
     stopSources('drums');source(buffer,'drums',{loop:true,offset:((latest.beatPhase%groove.beats)/groove.beats)*buffer.duration});grooveKey=groove.key;
     metrics.drumLoops++;metrics.groovesPlayed.push({key:groove.key,bpm:groove.bpm,at:context.currentTime});if(metrics.groovesPlayed.length>40)metrics.groovesPlayed.shift();
    }).catch(fail).finally(()=>{groovePending=false;});
   }
  }
  if(!permitted('whistle'))return;
  for(const note of rowingWhistleSchedule(s,lastWhistleBeat)){
   lastWhistleBeat=note.beat;const at=context.currentTime+note.delay,key=field.whistle[note.strong?'strong':'normal'];
   load(key).then(buffer=>{
    if(token!==epoch||!permitted('whistle')||latest?.phase!=='racing'||latest.cadence!==s.cadence||context.currentTime-at>.08)return;
    source(buffer,'whistle',{when:Math.max(.005,at-context.currentTime),gain:note.strong?1:.8});metrics.whistleBlows++;if(note.strong)metrics.strongWhistles++;
   }).catch(fail);
  }
 }
 const api={
  // Call in the original touch/click handler, before any awaited GLB load.
  unlock({warmup=true}={}){
   if(disposed||!mix.enabled)return Promise.resolve();
   try{
    if(!context){
     const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw Error('Web Audio không được hỗ trợ trên trình duyệt này');
     context=new Audio();buses={master:context.createGain(),analyser:context.createAnalyser()};buses.analyser.fftSize=256;
     const limiter=context.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=8;
     buses.master.connect(limiter);limiter.connect(buses.analyser);buses.analyser.connect(context.destination);
     for(const key of ['voice','khmer','whistle','drums','crowd']){buses[key]=context.createGain();buses[key].connect(buses.master);}applyMix();
    }
    const resumed=context.resume();
    return resumed.then(loadManifest).then(m=>warmup?Promise.allSettled(warmupKeys(language==='en'?[...(english.events.ready||[]),...(english.events.go||[])]:m.warmup).map(load)):undefined).catch(fail);
   }catch(e){fail(e);return Promise.resolve();}
  },
  beginMatch(pair,{practice=false}={}){
   api.stopPreview();
   clearSpeech();captions=[];stopSources();director.reset();recentClips.clear();teams=pair;latest=null;lastBeat=null;rhythmCadence=0;lastRhythmAudio=-1;matchSerial++;
   if(context&&mix.enabled&&!practice)void loadManifest().then(m=>{const keys=['final','surge','finish'].flatMap(id=>language==='en'?english.events[id]||[]:[...m.events[id].voice,...m.events[id].khmer]);for(const team of pair){const names=resolveTeamSpeech(team,m),history=resolveTeamSpeech(team,m,'history');keys.push(...names.voice,...names.khmer,...history.voice,...history.khmer);}return Promise.allSettled(warmupKeys([...new Set(keys)]).map(load));}).catch(fail);
  },
  async previewTeam(team,kind='name'){
   if(disposed||latest&&!['ready','finished'].includes(latest.phase))return {status:'busy'};
   api.stopPreview();clearSpeech();captions=[];stopSources();
   const token=++previewSerial;previewing=true;active=true;onPreviewState({kind,state:'loading'});
   try{
    await api.unlock({warmup:false});const m=await loadManifest();if(token!==previewSerial||disposed)return {status:'cancelled'};
    const registration=team.registrationId||team.id,profile=m.teamProfiles?.[registration],selection=resolveTeamSpeech(team,m,kind);
    const available={voice:selection.voice.length>0,khmer:selection.khmer.length>0};
    const keys=[...(mix.voice?selection.voice:[]),...(mix.khmer?selection.khmer:[])];
    if(!keys.length){api.stopPreview();return {status:available.voice||available.khmer?'muted':'missing',available,profile};}
    const buffers=await Promise.all(keys.map(load));if(token!==previewSerial||disposed||!previewing)return {status:'cancelled'};
    let offset=.02,lastNode=null;speaking=true;
    for(let i=0;i<keys.length;i++){
     const key=keys[i],entry=m.clips[key],node=source(buffers[i],entry.channel,{when:offset});if(!node)continue;
     lastNode=node;metrics[entry.channel==='voice'?'voiceClips':'khmerClips']++;metrics.played.push({key,at:context.currentTime+offset,match:[],teamId:team.id,registrationId:registration,kind});
     captions.push({at:context.currentTime+offset,text:entry.text,token:epoch});offset+=buffers[i].duration+.12;
    }
    if(metrics.played.length>100)metrics.played.splice(0,metrics.played.length-100);
    if(!lastNode){api.stopPreview();return {status:'cancelled'};}
    voiceUntil=context.currentTime+offset;applyMix();onPreviewState({kind,state:'playing'});
    lastNode.addEventListener('ended',()=>{if(token===previewSerial&&previewing)api.stopPreview();});
    return {status:'playing',available,profile,languages:[...new Set(keys.map(key=>m.clips[key].lang))]};
   }catch(e){if(token!==previewSerial||disposed)return {status:'cancelled'};fail(e);api.stopPreview();return {status:'error'};}
  },
  stopPreview(){previewSerial++;if(!previewing)return;previewing=false;active=false;clearSpeech();captions=[];stopSources();onPreviewState(null);},
  setLanguage(value){const next=['vi','km','en'].includes(value)?value:'mixed';if(next===language)return;language=next;api.stopPreview();clearSpeech();captions=[];},
  setMix(value){const previous=mix;mix=normalizeAudioMix(value);if(previewing&&(!mix.enabled||previous.voice!==mix.voice||previous.khmer!==mix.khmer))api.stopPreview();if(!mix.enabled){clearSpeech();captions=[];stopSources();}else{if(previous.voice!==mix.voice||previous.khmer!==mix.khmer){clearSpeech();captions=[];}if(!mix.whistle)stopSources('whistle');if(!mix.drums)stopSources('drums');if(!mix.crowd)stopSources('crowd');}applyMix();void ambient();},
  setActive(value){if(!value)api.stopPreview();if(active===value)return;active=value;if(!active){clearSpeech();captions=[];stopSources();lastBeat=null;}applyMix();if(active)void ambient();},
  update(s){
   if(s.venueId&&s.venueId!=='maspero')s={...s,actualDistances:s.distances,distances:s.distances.map(d=>commentaryDistance(d,raceVenue(s.venueId)))};
   latest=s;if(disposed)return;
   if(!active||!mix.enabled||!context)return;
   if(!previewing&&teams.length===2){
   const intensity=s.raceStage==='final'||s.surgeActive?1:0;if(intensity!==ambienceStage){ambienceStage=intensity;applyMix();}
   const history=manifest?teams.map(t=>{const h=resolveTeamSpeech(t,manifest,'history');return mix.voice&&h.voice.length>0||mix.khmer&&h.khmer.length>0;}):[false,false];
   const cues=s.mode==='practice'?[]:director.update(s,{speaking:speaking&&voiceUntil>context?.currentTime,history});
   if(!active||!mix.enabled||!context)return;
   if(s.phase==='finished'){stopSources('whistle');stopSources('drums');stopSources('crowd');}else void ambient();
   for(const cue of cues)enqueue(cue);
   if(s.phase==='racing')drum(s);else lastBeat=null;
   }
   if(!active||!context)return;
   if(speaking&&voiceUntil>0&&context.currentTime>=voiceUntil){speaking=false;voiceUntil=0;onCaption('');applyMix();}
   let caption=null;while(captions.length&&captions[0].at<=context.currentTime){const c=captions.shift();if(c.token===epoch)caption=c.text;}
   if(caption)onCaption(caption);void pump();
  },
  stats(){
   let rms=0;if(context&&buses){const data=new Float32Array(buses.analyser.fftSize);buses.analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((n,v)=>n+v*v,0)/data.length);}
  return {...metrics,language,groovesPlayed:[...metrics.groovesPlayed],drumBpm:rhythmCadence,ambience:crowdKey,drumKinds:{...metrics.drumKinds},cues:[...metrics.cues],played:[...metrics.played],context:context?.state||'uninitialized',audioTime:context?.currentTime||0,active,mix:{...mix},sources:sources.size,sourcesByChannel:Object.fromEntries(['voice','khmer','whistle','drums','crowd'].map(c=>[c,[...sources].filter(s=>s.channel===c).length])),queued:queue.map(c=>c.id),speaking,previewing,outputRms:rms,cached:cache.size,teams:teams.map(t=>t.id),disposed,origin:manifest?.mode||'unloaded',sourceVideo:manifest?.source.videoId||null};
  },
  dispose(){if(disposed)return;api.stopPreview();active=false;clearSpeech();captions=[];stopSources();disposed=true;abort.abort();cache.clear();if(context)void context.close().catch(()=>{});},
 };
 return api;
}

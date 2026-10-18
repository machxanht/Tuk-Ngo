// Original Vietnamese broadcast cuts; pre-rendered Khmer AI and original names.
export const DEFAULT_AUDIO_MIX={enabled:true,voice:true,khmer:true,drums:true,crowd:true,volume:.8};
export function normalizeAudioMix(value={}){
 const mix={...DEFAULT_AUDIO_MIX};
 for(const key of ['enabled','voice','khmer','drums','crowd'])if(typeof value?.[key]==='boolean')mix[key]=value[key];
 if(typeof value?.khmer!=='boolean'&&typeof value?.chants==='boolean')mix.khmer=value.chants;
 if(Number.isFinite(value?.volume))mix.volume=Math.max(0,Math.min(1,value.volume));
 return mix;
}
export function createCommentaryDirector(){
 let previous=null,seen=new Set(),leader=0,lastLead=-20,lastPace=-20;
 return {
  reset(){previous=null;seen=new Set();leader=0;lastLead=-20;lastPace=-20;},
  update(s){
   const cues=[],emit=(id,priority=1)=>cues.push({id,priority,elapsed:s.elapsed,result:s.result||null,state:{phase:s.phase,raceStage:s.raceStage,distance:s.distances?.[0]||0,gap:s.gap,pace:s.pace,surgeActive:s.surgeActive,elapsed:s.elapsed,combo:s.combo,stamina:s.stamina}});
   const once=(id,priority=1)=>{if(!seen.has(id)){seen.add(id);emit(id,priority);}};
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
    if(!cues.length&&distance>=200&&distance<450)once('team-history');
    if(!cues.length&&distance>=450&&distance<750)once('opponent-history');
   }
   previous={phase:s.phase,pace:s.pace,surgeActive:s.surgeActive};
   return cues.sort((a,b)=>b.priority-a.priority).slice(0,1);
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
 if(['team-history','opponent-history'].includes(cue.id)){
  if(state&&(state.phase!=='racing'||(state.distances?.[0]??state.distance)>=950))return {voice:[],khmer:[]};
  return resolveTeamSpeech(teams[cue.id==='team-history'?0:1],manifest,'history');
 }
 if(state&&cue.id.startsWith('lead-')&&(cue.id==='lead--1'?!(state.gap< -3):!(state.gap>3)))return {voice:[],khmer:[]};
 const id=cue.id==='finish'&&['tie','dnf','loss'].includes(cue.result)?cue.result:cue.id.startsWith('lead-')?'lead':cue.id;
 const event=manifest.events[id]||{voice:[],khmer:[]};
 // Event arrays are alternatives, not a sentence made by joining every recording.
 const choose=channel=>{const keys=event[channel].filter(key=>!cue.excludedKeys?.includes(key)&&isBroadcastClipApplicable(manifest.clips[key],cue,state));return keys.length?[keys[(cue.variant||0)%keys.length]]:[];};
 const selection={voice:choose('voice'),khmer:choose('khmer')};
 const named=cue.id==='intro'?teams:cue.id.startsWith('lead-')?[teams[cue.id==='lead--1'?1:0]]:cue.id==='finish'&&['win','loss'].includes(cue.result)?[teams[cue.result==='win'?0:1]]:[];
 for(const channel of ['voice','khmer'])selection[channel]=[...named.flatMap(t=>resolveTeamSpeech(t,manifest)[channel]),...selection[channel]];
 return selection;
}

export function createRaceAudio({baseUrl='/',onCaption=()=>{},onError=()=>{},onPreviewState=()=>{}}={}) {
 const directory=baseUrl+'assets/race-audio/',director=createCommentaryDirector();
 let mix=normalizeAudioMix(),context=null,buses=null,manifest=null,manifestPromise=null;
 let active=false,disposed=false,epoch=0,queue=[],speaking=false,matchSerial=0;
 let previewing=false,previewSerial=0;
 let teams=[],latest=null,lastBeat=null,crowdSource=null,crowdPending=false,voiceUntil=0,ambienceStage=0;
 const cache=new Map(),recentClips=new Map(),sources=new Set(),abort=new AbortController();
 const metrics={drumHits:0,drumKinds:{'drum-low':0,'drum-open':0,'drum-rim':0},voiceClips:0,khmerClips:0,cues:[],played:[],errors:[],decoded:0};
 function fail(error){if(disposed||error?.name==='AbortError')return;const message=String(error?.message||error);if(!metrics.errors.includes(message)){metrics.errors.push(message);onError(message);}}
 function loadManifest(){
  if(!manifestPromise)manifestPromise=fetch(directory+'manifest.json',{signal:abort.signal,cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Audio manifest: '+r.status);return r.json();}).then(m=>{if(!['broadcast','broadcast-vi-ai-km'].includes(m.mode))throw Error('Cần tải lại bộ bình luận');return manifest=m;}).catch(e=>{manifestPromise=null;throw e;});
  return manifestPromise;
 }
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
 function permitted(channel){return !disposed&&active&&mix.enabled&&mix[channel]&&context?.state==='running';}
 function stopSources(channel){
  for(const item of [...sources])if(!channel||item.channel===channel){try{item.node.stop();}catch{/* Already ended. */}item.node.disconnect();sources.delete(item);}
  if(!channel||channel==='crowd')crowdSource=null;
 }
 function clearSpeech(){epoch++;queue=[];speaking=false;voiceUntil=0;stopSources('voice');stopSources('khmer');onCaption('');applyMix();}
 function applyMix(){
  if(!context)return;const t=context.currentTime,duck=voiceUntil>t;
  buses.master.gain.setTargetAtTime(active&&mix.enabled?mix.volume:0,t,.025);
  for(const [key,gain]of Object.entries({voice:.92,khmer:.72,drums:duck?.18:.38,crowd:(duck?.035:.105)*(ambienceStage?1.8:1)}))buses[key].gain.setTargetAtTime(mix[key]?gain:0,t,.035);
 }
 function source(buffer,channel,{when=0,gain=1,rate=1,loop=false}={}){
  if(!permitted(channel))return null;
  const node=context.createBufferSource(),level=context.createGain();node.buffer=buffer;node.playbackRate.value=rate;node.loop=loop;level.gain.value=gain;node.connect(level);level.connect(buses[channel]);
  const item={node,channel};sources.add(item);node.addEventListener('ended',()=>{sources.delete(item);node.disconnect();level.disconnect();});node.start(context.currentTime+when);return node;
 }
 async function ambient(){
  if(crowdSource||crowdPending||!permitted('crowd')||!['racing','countdown'].includes(latest?.phase))return;
  crowdPending=true;
  try{const buffer=await load('crowd');if(!crowdSource&&permitted('crowd')&&['racing','countdown'].includes(latest?.phase))crowdSource=source(buffer,'crowd',{loop:true});}catch(e){fail(e);}finally{crowdPending=false;}
 }
 async function pump(){
  if(speaking||!active||!mix.enabled||disposed)return;
  queue=queue.filter(c=>latest&&latest.elapsed-c.elapsed<(c.priority>=4?20:9));
  const cue=queue.shift();if(!cue)return;
  speaking=true;const token=epoch;
  try{
   await loadManifest();
   // Try another eligible whole phrase when the first alternative is recent.
   cue.excludedKeys=[...recentClips].filter(([key,at])=>context.currentTime-at<(manifest.clips[key].role==='team-name'?8:18)).map(([key])=>key);
   const selection=resolveBroadcastCue(cue,manifest,teams,latest);
   const keys=[...(mix.voice?selection.voice:[]),...(mix.khmer?selection.khmer:[])].filter(key=>context.currentTime-(recentClips.get(key)??-Infinity)>=(manifest.clips[key].role==='team-name'?8:18));
   // Fetch the phrase in parallel, then schedule it as one uninterrupted sentence.
   const buffers=await Promise.all(keys.map(load));if(token!==epoch||!active||!mix.enabled||disposed||latest.elapsed-cue.elapsed>(cue.priority>=4?20:9)||(cue.id==='ready'&&latest.phase!=='countdown'))return;
   const current=resolveBroadcastCue(cue,manifest,teams,latest);if(keys.some(key=>!current.voice.includes(key)&&!current.khmer.includes(key)))return;
   let offset=.02;
   for(let i=0;i<keys.length;i++){
    const key=keys[i],channel=manifest.clips[key].channel;if(!permitted(channel))continue;
    const entry=manifest.clips[key],deadline=entry.conditions?.maxElapsed;
    if(cue.id==='ready'&&offset+buffers[i].duration>latest.countdown)continue;
    if(deadline!=null&&latest.elapsed+offset>deadline)continue;
    const node=source(buffers[i],channel,{when:offset});if(!node)continue;
    metrics[channel==='voice'?'voiceClips':'khmerClips']++;
    recentClips.set(key,context.currentTime+offset);
    metrics.played.push({key,cue:cue.id,sourceId:entry.sourceId,at:context.currentTime+offset,match:teams.map(t=>t.id),state:{phase:latest.phase,distance:latest.distances?.[0],gap:latest.gap,pace:latest.pace,surgeActive:latest.surgeActive,result:cue.result}});if(metrics.played.length>100)metrics.played.shift();
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
  const beat=Math.floor(s.beatPhase);if(lastBeat==null){lastBeat=beat;return;}
  const change=beat-lastBeat;lastBeat=beat;
  if(change!==1||!permitted('drums')||s.phase!=='racing'||s.finishTimes[0]!=null)return;
  const hot=s.raceStage==='final'||s.surgeActive,key=beat%4===0?'drum-low':'drum-open',token=epoch;
  // Cached buffers normally resolve immediately; stale async hits are discarded.
  const phase=s.beatPhase;
  load(key).then(buffer=>{if(token!==epoch||!permitted('drums')||latest?.phase!=='racing'||latest.beatPhase-phase>.3)return;source(buffer,'drums',{gain:beat%4===0?1:.7});metrics.drumHits++;metrics.drumKinds[key]++;}).catch(fail);
  if(hot){load('drum-rim').then(buffer=>{if(token!==epoch||!permitted('drums')||latest?.phase!=='racing'||latest.beatPhase-phase>.3)return;source(buffer,'drums',{when:60/s.cadence*.5,gain:s.surgeActive?.68:.4});metrics.drumHits++;metrics.drumKinds['drum-rim']++;}).catch(fail);}
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
     for(const key of ['voice','khmer','drums','crowd']){buses[key]=context.createGain();buses[key].connect(buses.master);}applyMix();
    }
    const resumed=context.resume();
    return resumed.then(loadManifest).then(m=>warmup?Promise.allSettled(m.warmup.map(load)):undefined).catch(fail);
   }catch(e){fail(e);return Promise.resolve();}
  },
  beginMatch(pair){
   api.stopPreview();
   clearSpeech();captions=[];stopSources();director.reset();recentClips.clear();teams=pair;latest=null;lastBeat=null;matchSerial++;
   if(context&&mix.enabled)void loadManifest().then(m=>{const keys=['final','surge','finish'].flatMap(id=>{const e=m.events[id];return [...e.voice,...e.khmer];});for(const team of pair){const names=resolveTeamSpeech(team,m),history=resolveTeamSpeech(team,m,'history');keys.push(...names.voice,...names.khmer,...history.voice,...history.khmer);}return Promise.allSettled([...new Set(keys)].map(load));}).catch(fail);
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
  setMix(value){const previous=mix;mix=normalizeAudioMix(value);if(previewing&&(!mix.enabled||previous.voice!==mix.voice||previous.khmer!==mix.khmer))api.stopPreview();if(!mix.enabled){clearSpeech();captions=[];stopSources();}else{if(previous.voice!==mix.voice||previous.khmer!==mix.khmer){clearSpeech();captions=[];}if(!mix.drums)stopSources('drums');if(!mix.crowd)stopSources('crowd');}applyMix();void ambient();},
  setActive(value){if(!value)api.stopPreview();if(active===value)return;active=value;if(!active){clearSpeech();captions=[];stopSources();lastBeat=null;}applyMix();if(active)void ambient();},
  update(s){
   latest=s;if(disposed)return;
   if(!previewing&&teams.length===2){
   const intensity=s.raceStage==='final'||s.surgeActive?1:0;if(intensity!==ambienceStage){ambienceStage=intensity;applyMix();}
   const cues=director.update(s);
   if(!active||!mix.enabled||!context)return;
   if(s.phase==='finished'){stopSources('drums');stopSources('crowd');}else void ambient();
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
   return {...metrics,drumKinds:{...metrics.drumKinds},cues:[...metrics.cues],played:[...metrics.played],context:context?.state||'uninitialized',audioTime:context?.currentTime||0,active,mix:{...mix},sources:sources.size,queued:queue.map(c=>c.id),speaking,previewing,outputRms:rms,cached:cache.size,teams:teams.map(t=>t.id),disposed,origin:manifest?.mode||'unloaded',sourceVideo:manifest?.source.videoId||null};
  },
  dispose(){if(disposed)return;api.stopPreview();active=false;clearSpeech();captions=[];stopSources();disposed=true;abort.abort();cache.clear();if(context)void context.close().catch(()=>{});},
 };
 return api;
}

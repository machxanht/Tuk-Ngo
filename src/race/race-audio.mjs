// Prerecorded, authored commentary. No speech service or account is used at runtime.
export const DEFAULT_AUDIO_MIX = {enabled:true,voice:true,chants:true,drums:true,crowd:true,volume:.8};
export function normalizeAudioMix(value={}) {
 const mix={...DEFAULT_AUDIO_MIX};
 for(const key of ['enabled','voice','chants','drums','crowd'])if(typeof value?.[key]==='boolean')mix[key]=value[key];
 if(Number.isFinite(value?.volume))mix.volume=Math.max(0,Math.min(1,value.volume));
 return mix;
}

// Pure event director: milestone selection uses actual race distances/results.
// A large simulation jump emits only the most recent milestone, never a backlog.
export function createCommentaryDirector() {
 let previous=null,seen=new Set(),leader=0,lastLead=-20,lastPace=-20;
 return {
  reset(){previous=null;seen=new Set();leader=0;lastLead=-20;lastPace=-20;},
  update(s,teams){
   const cues=[],emit=(id,clips,priority=1,chant=null)=>cues.push({id,clips,priority,chant,elapsed:s.elapsed});
   const once=(id,clips,priority=1,chant=null)=>{if(!seen.has(id)){seen.add(id);emit(id,clips,priority,chant);}};
   const name=i=>'name-'+teams[i].id;
   if(s.phase==='countdown')once('ready',['ready'],2);
   if(s.phase==='finished'){
    const clips=s.result==='tie'?['tie']:s.result==='win'?['finish',name(0),'winner']:['finish',name(1),'winner',s.result==='dnf'?'dnf':'loss'];
    once('finish',clips,5,s.result==='tie'?null:'chant-victory');
   }else if(s.phase==='racing'){
    if(!seen.has('go')){seen.add('go');if(s.elapsed<3)emit('go',['go'],3);}
    const distance=Math.max(...s.distances),milestones=[[200,'cruise'],[600,'halfway'],[950,'final'],[1100,'last-hundred'],[1150,'last-fifty']];
    const crossed=milestones.filter(([m,id])=>distance>=m&&!seen.has(id));
    for(const [,id]of crossed)seen.add(id);
    if(crossed.length){const [,id]=crossed.at(-1);emit(id,[id],distance>=950?4:2,distance>=950?'chant-encourage':null);}
    if(s.elapsed>=3&&s.elapsed<20)once('intro',['intro',name(0),'versus',name(1)],2);
    if(s.surgeActive&&!previous?.surgeActive)emit('surge',['surge'],4,'chant-ho');
    if(previous?.phase==='racing'&&s.pace!==previous.pace&&s.elapsed-lastPace>12){
     if(s.pace==='sprint')emit('pace-sprint',['pace-sprint'],2);
     if(s.pace==='recover')emit('recover',['recover']);
     lastPace=s.elapsed;
    }
    const nextLeader=s.gap>3?1:s.gap< -3?-1:leader;
    if(nextLeader!==leader){
     if(leader!==0&&s.elapsed-lastLead>=12){emit('lead-'+nextLeader,[name(nextLeader===1?0:1),'leading'],3);lastLead=s.elapsed;}
     leader=nextLeader;
    }
    if(s.elapsed>30&&Math.abs(s.gap)<2)once('close-race',['close-race']);
    if(s.combo>=30)once('cohesion',['cohesion']);
    if(s.stamina<20&&s.elapsed>20)once('fatigue',['fatigue'],2);
   }
   previous={phase:s.phase,pace:s.pace,surgeActive:s.surgeActive};
   // One coherent high-priority event per frame, e.g. final marker + surge.
   return cues.sort((a,b)=>b.priority-a.priority).slice(0,1);
  },
 };
}

export function createRaceAudio({baseUrl='/',onCaption=()=>{},onError=()=>{}}={}) {
 const directory=baseUrl+'assets/race-audio/',director=createCommentaryDirector();
 let mix=normalizeAudioMix(),context=null,buses=null,manifest=null,manifestPromise=null;
 let active=false,disposed=false,epoch=0,queue=[],speaking=false,currentPriority=0;
 let teams=[],latest=null,lastBeat=null,crowdSource=null,crowdPending=false,voiceUntil=0,ambienceStage=0;
 const cache=new Map(),sources=new Set(),abort=new AbortController();
 const metrics={drumHits:0,drumKinds:{'drum-low':0,'drum-open':0,'drum-rim':0},voiceClips:0,chantClips:0,cues:[],played:[],errors:[],decoded:0};
 function fail(error){if(disposed||error?.name==='AbortError')return;const message=String(error?.message||error);if(!metrics.errors.includes(message)){metrics.errors.push(message);onError(message);}}
 function loadManifest(){
  if(!manifestPromise)manifestPromise=fetch(directory+'manifest.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Audio manifest: '+r.status);return r.json();}).then(m=>manifest=m).catch(e=>{manifestPromise=null;throw e;});
  return manifestPromise;
 }
 function load(key){
  if(!cache.has(key))cache.set(key,(async()=>{
   const m=key==='crowd'?null:await loadManifest(),entry=m?.clips[key];
   if(key!=='crowd'&&!entry)throw Error('Unknown audio clip: '+key);
   const url=key==='crowd'?baseUrl+'assets/illustrated-v22/crowd-cheer-cc0.mp3':directory+entry.file;
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
 function clearSpeech(){epoch++;queue=[];speaking=false;currentPriority=0;voiceUntil=0;stopSources('voice');stopSources('chants');onCaption('');applyMix();}
 function applyMix(){
  if(!context)return;const t=context.currentTime,duck=voiceUntil>t;
  buses.master.gain.setTargetAtTime(active&&mix.enabled?mix.volume:0,t,.025);
  for(const [key,gain]of Object.entries({voice:.92,chants:.52,drums:duck?.18:.38,crowd:(duck?.035:.105)*(ambienceStage?1.8:1)}))buses[key].gain.setTargetAtTime(mix[key]?gain:0,t,.035);
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
  speaking=true;currentPriority=cue.priority;const token=epoch;
  try{
   const keys=[...(mix.voice?cue.clips:[]),...(mix.chants&&cue.chant?[cue.chant]:[])];
   // Fetch the phrase in parallel, then schedule it as one uninterrupted sentence.
   const buffers=await Promise.all(keys.map(load));if(token!==epoch||!active||!mix.enabled||disposed||latest.elapsed-cue.elapsed>(cue.priority>=4?20:9)||(cue.id==='ready'&&latest.phase!=='countdown'))return;
   let offset=.02;
   for(let i=0;i<keys.length;i++){
    const key=keys[i],channel=key.startsWith('chant-')?'chants':'voice';if(!permitted(channel))continue;
    const node=source(buffers[i],channel,{when:offset});if(!node)continue;
    const entry=manifest.clips[key];metrics[channel==='voice'?'voiceClips':'chantClips']++;
    metrics.played.push({key,at:context.currentTime+offset,match:teams.map(t=>t.id)});if(metrics.played.length>100)metrics.played.shift();
    offset+=buffers[i].duration+.075;
    // Captions are updated at actual clip boundaries by update(), with no timers.
    captions.push({at:context.currentTime+offset-buffers[i].duration-.075,text:channel==='chants'?entry.text+' · '+entry.translationVi:entry.text,token});
   }
   voiceUntil=context.currentTime+offset;applyMix();
  }catch(e){fail(e);voiceUntil=0;}
  finally{if(token===epoch){if(voiceUntil<=context.currentTime){speaking=false;currentPriority=0;}}}
 }
 let captions=[];
 function enqueue(cue){
  if(!mix.voice&&!mix.chants)return;
  metrics.cues.push(cue.id);if(metrics.cues.length>100)metrics.cues.shift();
  if(cue.priority>=4&&cue.priority>=currentPriority){clearSpeech();captions=[];}
  queue=queue.filter(c=>c.priority>=cue.priority);queue.push(cue);queue.sort((a,b)=>b.priority-a.priority);queue=queue.slice(0,3);void pump();
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
  unlock(){
   if(disposed||!mix.enabled)return Promise.resolve();
   try{
    if(!context){
     const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw Error('Web Audio không được hỗ trợ trên trình duyệt này');
     context=new Audio();buses={master:context.createGain(),analyser:context.createAnalyser()};buses.analyser.fftSize=256;
     const limiter=context.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=8;
     buses.master.connect(limiter);limiter.connect(buses.analyser);buses.analyser.connect(context.destination);
     for(const key of ['voice','chants','drums','crowd']){buses[key]=context.createGain();buses[key].connect(buses.master);}applyMix();
    }
    const resumed=context.resume();
    return resumed.then(()=>Promise.allSettled(['ready','go','intro','versus','drum-low','drum-open','drum-rim'].map(load))).catch(fail);
   }catch(e){fail(e);return Promise.resolve();}
  },
  beginMatch(pair){
   clearSpeech();captions=[];stopSources();director.reset();teams=pair;latest=null;lastBeat=null;
   if(context&&mix.enabled)for(const key of ['name-'+pair[0].id,'name-'+pair[1].id,'final','last-hundred','last-fifty','finish','winner','chant-encourage','chant-ho','chant-victory'])void load(key).catch(fail);
  },
  setMix(value){const previous=mix;mix=normalizeAudioMix(value);if(!mix.enabled){clearSpeech();captions=[];stopSources();}else{if(previous.voice!==mix.voice||previous.chants!==mix.chants){clearSpeech();captions=[];}if(!mix.drums)stopSources('drums');if(!mix.crowd)stopSources('crowd');}applyMix();void ambient();},
  setActive(value){if(active===value)return;active=value;if(!active){clearSpeech();captions=[];stopSources();lastBeat=null;}applyMix();if(active)void ambient();},
  update(s){
   latest=s;if(teams.length!==2||disposed)return;
   const intensity=s.raceStage==='final'||s.surgeActive?1:0;if(intensity!==ambienceStage){ambienceStage=intensity;applyMix();}
   const cues=director.update(s,teams);
   if(!active||!mix.enabled||!context)return;
   if(s.phase==='finished'){stopSources('drums');stopSources('crowd');}else void ambient();
   for(const cue of cues)enqueue(cue);
   if(s.phase==='racing')drum(s);else lastBeat=null;
   if(speaking&&voiceUntil>0&&context.currentTime>=voiceUntil){speaking=false;currentPriority=0;voiceUntil=0;onCaption('');applyMix();}
   let caption=null;while(captions.length&&captions[0].at<=context.currentTime){const c=captions.shift();if(c.token===epoch)caption=c.text;}
   if(caption)onCaption(caption);void pump();
  },
  stats(){
   let rms=0;if(context&&buses){const data=new Float32Array(buses.analyser.fftSize);buses.analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((n,v)=>n+v*v,0)/data.length);}
   return {...metrics,drumKinds:{...metrics.drumKinds},cues:[...metrics.cues],played:[...metrics.played],context:context?.state||'uninitialized',audioTime:context?.currentTime||0,active,mix:{...mix},sources:sources.size,queued:queue.map(c=>c.id),speaking,outputRms:rms,cached:cache.size,teams:teams.map(t=>t.id),disposed};
  },
  dispose(){if(disposed)return;active=false;clearSpeech();captions=[];stopSources();disposed=true;abort.abort();cache.clear();if(context)void context.close().catch(()=>{});},
 };
 return api;
}

import {useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,Compass,Eye,EyeOff,Flag,Globe2,HelpCircle,Home,Medal,Pause,Play,RotateCcw,Signal,Trophy,Volume2,VolumeX,Waves,Zap} from 'lucide-react';
import {createDeviceSteering} from '../race/device-steering.mjs';
import {createRaceControls} from '../race/race-controls.mjs';
import {DIFFICULTIES,formatRaceTime} from '../race/gameplay.mjs';
import {createSessionGame,createOnlineClient} from '../race/online-client.mjs';
import {ONLINE_COPY} from '../race/online-language';
import {OnlineLobby} from './OnlineLobby';
import {createTournament} from '../race/tournament.mjs';
import {teamsForVenue,festivalTeam,shuffledFestivalIds} from '../race/festival-teams.mjs';
import {RACE_VENUES,raceVenue} from '../race/race-venues.mjs';
import {createRaceAudio,DEFAULT_AUDIO_MIX,normalizeAudioMix} from '../race/race-audio.mjs';
import {GAME_COPY,ROUND_KEYS,readGameLanguage} from '../race/game-language';
import {createMenuMusic} from '../race/menu-music.mjs';
import {festivalBrandDigest} from '../race/asset-digests.mjs';
import {FESTIVAL_PALETTE} from '../race/festival-branding.mjs';
import './RaceGame.css';

const STORAGE='tukngo-festival-cup',AUDIO_STORAGE='tukngo-race-audio';
const brandStyle={'--teal':FESTIVAL_PALETTE.jade,'--gold':FESTIVAL_PALETTE.gold,'--paper':FESTIVAL_PALETTE.white} as CSSProperties;
function audioPreferences(){try{return normalizeAudioMix(JSON.parse(localStorage.getItem(AUDIO_STORAGE)||'null'));}catch{return {...DEFAULT_AUDIO_MIX};}}
const seed=()=>Math.floor(Math.random()*4294967296);
function makeCup(venueId:string){
 const roster=teamsForVenue(venueId),n=seed(),cup=createTournament({playerId:roster[0].id,seed:n,teamIds:shuffledFestivalIds(n,roster)});
 try{const saved=JSON.parse(localStorage.getItem(venueId==='maspero'?STORAGE:STORAGE+'-'+venueId)||'null');if(saved?.teamIds?.length===roster.length&&saved.teamIds.every((id:string)=>roster.some(t=>t.id===id)))cup.restore(saved);}catch{/* Invalid or unavailable storage starts a fresh cup. */}
 return cup;
}
export function RaceGame({onInspect,initialSelection}:{onInspect:(selection:{teamIds:string[];constructionTypes:string[]})=>void;initialSelection?:{teamIds:string[];constructionTypes:string[]}}){
 const [venueId,setVenueId]=useState(()=>{try{return raceVenue(localStorage.getItem('tukngo-venue')).id;}catch{return 'maspero';}});
 return <RaceSession key={venueId} venueId={venueId} onVenueChange={id=>{try{localStorage.setItem('tukngo-venue',id);}catch{}setVenueId(id);}} onInspect={onInspect} initialSelection={initialSelection}/>;
}
function RaceSession({venueId,onVenueChange,onInspect,initialSelection}:{key?:string;venueId:string;onVenueChange:(id:string)=>void;onInspect:(selection:{teamIds:string[];constructionTypes:string[]})=>void;initialSelection?:{teamIds:string[];constructionTypes:string[]}}){
 const venue=raceVenue(venueId),roster=teamsForVenue(venueId),storage=venueId==='maspero'?STORAGE:STORAGE+'-'+venueId,practiceStorage='tukngo-practice-best-simple'+(venueId==='maspero'?'':'-'+venueId);
 const [language,setLanguage]=useState(readGameLanguage),baseCopy=GAME_COPY[language];
 const c=venueId==='maspero'?baseCopy:{...baseCopy,location:venue.name[language],fullCourse:venue.length+' m · '+venue.name[language],coachFinish:language==='vi'?'Hoàn thành '+venue.length+' m':language==='km'?'បញ្ចប់ '+venue.length+' ម៉ែត្រ':'Finish the '+venue.length+' m course',bracketTitle:language==='vi'?'Nhánh đấu · 8 ghe':language==='km'?'តារាងប្រកួត · ៨ ទូក':'Bracket · 8 boats',introCourse:venue.name[language]+' · '+venue.length+' m',ceremony:venue.description[language],quickInfo:venue.description[language],cupFormat:language==='vi'?'8 đội mời · Loại trực tiếp · 3 vòng':language==='km'?'៨ ក្រុម · ៣ ជុំ':'8 invited teams · 3 knockout rounds',startCup:language==='vi'?'Bắt đầu cúp 8 ghe':language==='km'?'ចាប់ផ្តើមពានរង្វាន់ ៨ ទូក':'Start 8-boat cup',introStand:venue.name[language],cup:language==='vi'?'Cúp mời · 8 ghe':language==='km'?'ពានរង្វាន់ · ៨ ទូក':'Invitational cup · 8 boats'};
 const textRef=useRef(c);textRef.current=c;
 const o=ONLINE_COPY[language];
 const [mode,setMode]=useState<'cup'|'quick'|'practice'|'online'>('cup'),modeRef=useRef(mode);modeRef.current=mode;
 const [view,setView]=useState('race'),[helpFrom,setHelpFrom]=useState<'menu'|'setup'>('menu');
 const [game]=useState(()=>createSessionGame({venueId})),[tournament]=useState(()=>makeCup(venueId));
 const [cup,setCup]=useState(()=>tournament.snapshot()),[hud,setHud]=useState(()=>game.snapshot());
 const [selected,setSelected]=useState(roster.some(t=>t.id===initialSelection?.teamIds[0])?initialSelection!.teamIds[0]:cup.playerId),[query,setQuery]=useState(''),[difficulty,setDifficulty]=useState('easy');
 const [panel,setPanel]=useState<'menu'|'setup'|'help'|'bracket'|'online'|null>('menu'),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(true);
 const [onlineTab,setOnlineTab]=useState('play'),[onlineQuit,setOnlineQuit]=useState(false);
 const [menuHidden,setMenuHidden]=useState(false);
 const [quality,setQuality]=useState(()=>{try{const value=localStorage.getItem('tukngo-quality');return ['sharp','auto','balanced','low'].includes(value||'')?value!:'sharp';}catch{return 'sharp';}}),[performanceStats,setPerformanceStats]=useState<any>(null);
 useEffect(()=>{try{localStorage.setItem('tukngo-quality',quality);}catch{}},[quality]);
 const rowingAssist=true,steeringAssist=true;const [opponentId,setOpponentId]=useState(roster[1].id);
 const [practiceBest,setPracticeBest]=useState<number|null>(()=>{try{const n=Number(localStorage.getItem(practiceStorage));return n>0&&Number.isFinite(n)?n:null;}catch{return null;}});
 useEffect(()=>{try{const value=Number(localStorage.getItem(practiceStorage));setPracticeBest(value>0&&Number.isFinite(value)?value:null);}catch{setPracticeBest(null);}},[rowingAssist]);
 const [construction,setConstruction]=useState(initialSelection?.constructionTypes[0]||'plywood');
 useEffect(()=>{if(ready)runtime.current?.setConstruction([construction,construction==='plywood'?'dugout':'plywood']);},[construction,ready]);
 const [loadProgress,setLoadProgress]=useState(''),[loadError,setLoadError]=useState(''),[error,setError]=useState(''),[activeMatch,setActiveMatch]=useState(()=>tournament.currentMatch());
 const [mix,setMix]=useState(audioPreferences),[caption,setCaption]=useState(''),[audioError,setAudioError]=useState('');
 const [musicState,setMusicState]=useState<any>({playing:false,unlocked:false});
 const [music]=useState(()=>createMenuMusic({url:import.meta.env.BASE_URL+'assets/race-audio/menu/festival.mp3',onState:setMusicState}));
 const [preview,setPreview]=useState<any>(null),[profileMessage,setProfileMessage]=useState(''),[profileFacts,setProfileFacts]=useState<any[]>([]);
 const previewRequest=useRef(0);
 const [audio]=useState(()=>createRaceAudio({baseUrl:import.meta.env.BASE_URL,onCaption:setCaption,onPreviewState:setPreview,onError:()=>setAudioError('unavailable')}));
 const host=useRef<HTMLDivElement>(null),runtime=useRef<any>(null);
 const strokePad=useRef<HTMLButtonElement>(null),receipt=useRef<HTMLSpanElement>(null);
 const finished=useRef(''),resumeDrawer=useRef(false),bracketFrom=useRef<typeof panel>('menu'),clock=useRef({phase:0,seconds:0,last:0}),actions=useRef<any>({});
 const [onlineState,setOnlineState]=useState<any>({status:'idle',room:null,leaderboard:null,error:'',busy:false,name:'',queued:false,ping:null});
 const [online]=useState(()=>createOnlineClient({baseUrl:import.meta.env.BASE_URL,venueId,endpointUrl:import.meta.env.VITE_ONLINE_URL,onChange:setOnlineState,onGame:(snapshot:any,room:any)=>{void actions.current.onlineFrame?.(snapshot,room);}}));
 const onlineLoaded=useRef(''),onlineRun=useRef(''),onlinePreparing=useRef(false),onlineLatest=useRef<any>(null),onlineRequest=useRef(0);
 useEffect(()=>()=>{onlineRequest.current++;online.dispose();},[online]);
 useEffect(()=>{if(online.savedRoom){setMode('online');setPanel('online');void online.open();}},[online]);
 const activeRef=useRef(activeMatch);
 const preparing=useRef(false);
 const controls=useMemo(()=>createRaceControls(game,(timestamp?:number)=>actions.current.stroke(timestamp),()=>runtime.current?.flushInput()),[game]);
 useEffect(()=>{if(onlineState.status==='reconnecting'||onlineState.status==='disconnected')controls.clear();},[onlineState.status,controls]);
 useEffect(()=>{if(onlineState.room?.status==='cancelled'&&game.online){controls.clear();audio.setActive(false);game.reset();setHud(game.snapshot());setPanel('online');setPlaying(true);onlineLoaded.current='';onlineRun.current='';}},[onlineState.room?.status,game,audio,controls]);
 const [tiltStatus,setTiltStatus]=useState('idle');
 const [tilt]=useState(()=>createDeviceSteering({onInput:(value:number)=>controls.setDeviceSteering(value),onState:setTiltStatus}));
 useEffect(()=>()=>tilt.dispose(),[tilt]);
 const teamOptions=useMemo(()=>roster.filter(t=>(t.name+' '+t.nameVi+' '+(t.nameKm||'')).toLocaleLowerCase().includes(query.toLocaleLowerCase())),[query,roster]);
 useEffect(()=>{if(!ready)return;const canvas=runtime.current?.renderer.domElement;if(!canvas)return;let drag:number|null=null,origin=0;
  const down=(e:PointerEvent)=>{if(tilt.status==='active'||game.state.phase!=='racing')return;drag=e.pointerId;origin=e.clientX;canvas.setPointerCapture(drag);};
  const move=(e:PointerEvent)=>{if(e.pointerId===drag)controls.setDeviceSteering((e.clientX-origin)/90);};
  const up=(e:PointerEvent)=>{if(e.pointerId===drag){drag=null;controls.setDeviceSteering(0);}};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
 },[ready,controls,game,tilt]);
 function persist(){const s=tournament.snapshot();setCup(s);try{localStorage.setItem(storage,JSON.stringify(s));}catch{/* Gameplay works without browser storage. */}}
 function observe(s:any){
  if(!s.game)return;setHud(s.game);if(s.game.finishTimes[0]!=null)controls.clear();
  if(s.game.phase==='finished'&&modeRef.current==='practice'&&finished.current!=='practice-'+s.game.runId){finished.current='practice-'+s.game.runId;const time=s.game.finishTimes[0];if(time!=null)setPracticeBest(previous=>{const next=previous==null?time:Math.min(previous,time);try{localStorage.setItem(practiceStorage,String(next));}catch{/* Practice works without storage. */}return next;});}
  if(s.game.phase==='finished'&&modeRef.current==='cup'){
   const match=tournament.currentMatch(),key=match?.matchId+'-'+s.game.runId;
   if(!preparing.current&&match&&match.matchId===activeRef.current?.matchId&&!match.blocked&&finished.current!==key){finished.current=key;tournament.finish({matchId:match.matchId,result:s.game.result});if(tournament.snapshot().status==='eliminated')tournament.resolveRemaining();persist();}
  }
 }
 const settings=useRef<any>({});settings.current={racing:true,venueId,setupPreview:panel==='setup',quality,onPerformance:setPerformanceStats,constructionTypes:[construction,construction==='plywood'?'dugout':'plywood'],view:game.state.phase==='ready'?(panel==='setup'?'selection':'menu'):view,playing:playing&&panel===null,ambientPlaying:game.state.phase==='ready',cadence:84,splash:true,fast:false,game,onRace:observe,
  onGameFrame:(s:any)=>{if(strokePad.current)strokePad.current.dataset.held=String(s.rowingHeld);if(s.phase==='countdown'&&settings.current.playing)audio.setActive(true);audio.update(s);}};
 useEffect(()=>{
  let cancelled=false,stop=()=>{};const mount=host.current!;
  (async()=>{const {startBoatPreview}=await import('../race/boat-preview.mjs');if(cancelled)return;
   const match=tournament.currentMatch();settings.current.teamIds=match?[selected,selected===match.opponentId?opponentId:match.opponentId]:[selected,opponentId];clock.current.last=performance.now();
   await startBoatPreview(mount,settings,clock,import.meta.env.BASE_URL,(api:any)=>{if(cancelled){api.dispose();return;}api.audio=audio;api.menuMusic=music;runtime.current=api;stop=api.dispose;setReady(true);},(n:number,total:number)=>{if(!cancelled)setLoadProgress(`${n}/${total}`);});
  })().catch((e:Error)=>{if(!cancelled)setLoadError(e.message);});
  return()=>{cancelled=true;audio.dispose();music.dispose();stop();runtime.current=null;};
 },[game,tournament,audio,music]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(e.code==='Escape'){if(!e.repeat)actions.current.escape();return;}
   if(/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement)?.tagName))return;
   if(!e.repeat&&actions.current.canDrive&&['Space','Enter','ArrowLeft','ArrowRight','KeyA','KeyD','ShiftLeft','ShiftRight'].includes(e.code)){runtime.current?.noteInput(e.timeStamp);if(game.online)void audio.unlock();}
   if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&actions.current.canDrive){e.preventDefault();if(!e.repeat)controls.boostDown('key:'+e.code);return;}
   if(e.code==='ArrowLeft'||e.code==='KeyA'||e.code==='ArrowRight'||e.code==='KeyD'){if(actions.current.canDrive){e.preventDefault();if(!e.repeat)controls.steerDown('key:'+e.code,['ArrowLeft','KeyA'].includes(e.code)?-1:1);}return;}
   if(/BUTTON|SUMMARY/.test((e.target as HTMLElement)?.tagName))return;
   if((e.code==='Space'||e.code==='Enter')&&actions.current.canDrive){e.preventDefault();if(!e.repeat)controls.rowDown('key:'+e.code,e.timeStamp);}
  };
  const release=()=>{controls.clear();actions.current.pause(true);},keyRelease=(e:KeyboardEvent)=>controls.release('key:'+e.code);
  const visibility=()=>{music.setActive(!document.hidden&&game.state.phase==='ready');if(document.hidden){audio.setActive(false);actions.current.pause(true);}};
  document.addEventListener('keydown',key);document.addEventListener('keyup',keyRelease);window.addEventListener('blur',release);document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('keydown',key);document.removeEventListener('keyup',keyRelease);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',visibility);};
 },[audio,music,game,controls]);
 useEffect(()=>{audio.setMix(mix);try{localStorage.setItem(AUDIO_STORAGE,JSON.stringify(mix));}catch{/* Audio still works without storage. */}},[audio,mix]);
 useEffect(()=>{music.setMix(mix);},[music,mix]);
 useEffect(()=>{music.setActive(hud.phase==='ready'&&!!panel&&!document.hidden);},[music,hud.phase,panel]);
 useEffect(()=>{audio.setActive(playing&&panel===null&&['racing','countdown','finished'].includes(hud.phase));},[audio,playing,panel,hud.phase]);
 useEffect(()=>{audio.setLanguage(language);document.documentElement.lang=language;try{localStorage.setItem('tukngo-language',language);}catch{/* Language still switches without storage. */}},[language,audio]);
 useEffect(()=>{setProfileMessage('');},[language]);
 function selectTeam(value:string){previewRequest.current++;audio.stopPreview();setProfileMessage('');setProfileFacts([]);setSelected(value);if(ready)void runtime.current?.setTeams([value,value===opponentId?roster.find(t=>t.id!==value)!.id:opponentId]).catch((e:Error)=>setError(e.message));if(value===opponentId)setOpponentId(roster.find(t=>t.id!==value)!.id);}
 function changeMix(next:any){const value=normalizeAudioMix({...mix,...next});audio.setMix(value);music.setMix(value);setMix(value);if(value.enabled){setAudioError('');void audio.unlock();}}
 async function hearTeam(kind:'name'|'history'){
  const request=++previewRequest.current;
  if(preview?.kind===kind){audio.stopPreview();setProfileMessage(c.stopped);return;}
  if(!mix.enabled)changeMix({enabled:true});
  setProfileMessage(c.loadingAudio);setProfileFacts([]);
  const result=await audio.previewTeam(festivalTeam(selected),kind);
  if(request!==previewRequest.current||result.status==='cancelled')return;
  if(result.status==='playing'){
   const languages=(result.languages||[]).map((lang:string)=>lang==='km'?'Khmer':language==='en'?'Vietnamese':'Việt').join(' + ');
   const copy=textRef.current;setProfileMessage(`${kind==='name'?copy.name:copy.history} · ${copy.voiceLabel} ${languages}.${kind==='name'&&(!result.available.voice||!result.available.khmer)?' '+copy.missingOther:''}`);
   if(kind==='history')setProfileFacts(result.profile?.historyFacts||[]);
  }else {const copy=textRef.current;setProfileMessage(result.status==='missing'?(kind==='history'?copy.missingHistory:copy.missingName):result.status==='muted'?copy.enableVoice:copy.audioRetry);}
 }

 function stroke(eventTimestamp?:number){
  if(panel||busy||onlineQuit||(mode==='online'&&onlineState.status!=='connected')||game.state.phase!=='racing')return;
  runtime.current?.flushInput();const inputDelay=eventTimestamp!=null?Math.max(0,(performance.now()-eventTimestamp)/1000):0;const result=game.stroke({inputDelay}),accepted=result&&result.quality!=='missed';
  if(strokePad.current)strokePad.current.dataset.contact=accepted?'accepted':result?(result.error<0?'early':'late'):'waiting';
  if(receipt.current){receipt.current.textContent=accepted?(game.state.rowingAssist?c.autoRhythm:c.strokeReceived):result?(result.error<0?c.early:c.late):game.state.lastStrokeBeat===Math.round(game.state.beatPhase)?c.strokeQueued:c.late;receipt.current.getAnimations().forEach(a=>a.cancel());receipt.current.animate([{opacity:1},{opacity:1,offset:.65},{opacity:0}],{duration:650,fill:'forwards'});}
  setHud(game.snapshot());
 }
 function pause(onlyPause=false){if(game.online){controls.clear();if(!onlyPause)setOnlineQuit(true);return;}if(panel||!['intro','racing','countdown','paused'].includes(game.state.phase))return;if(game.state.phase==='paused'){if(!onlyPause){void audio.unlock();game.resume();audio.setActive(true);setPlaying(true);}}else{audio.setActive(false);controls.clear();game.pause(onlyPause?'Đã tạm dừng khi rời màn hình':'');setPlaying(false);}setHud(game.snapshot());}
 actions.current={stroke,pause,onlineFrame,canDrive:!panel&&!busy&&!onlineQuit&&(mode!=='online'||onlineState.status==='connected')&&game.state.phase==='racing'&&game.state.finishTimes[0]==null,escape:()=>{if(onlineQuit)setOnlineQuit(false);else if(panel==='online')closeOnline();else if(panel==='menu'&&menuHidden)setMenuHidden(false);else if(panel==='bracket')closeBracket();else if(panel==='help')setPanel(helpFrom);else if(panel==='setup'){audio.stopPreview();setPanel('menu');}else pause();}};
 async function prepareOnline(room:any){
  if(onlineLoaded.current===room.code&&game.online)return;
  const request=++onlineRequest.current;onlinePreparing.current=true;setBusy(true);controls.clear();music.setActive(false);audio.setActive(false);
  try{const order=[room.players[room.playerIndex],room.players[1-room.playerIndex]];await runtime.current.setTeams(order.map((player:any)=>player.teamId));if(request!==onlineRequest.current)return;runtime.current.reset();runtime.current.setConstruction(order.map((player:any)=>player.construction));game.connectOnline(value=>online.input(value));audio.beginMatch(order.map((player:any)=>festivalTeam(player.teamId)));setActiveMatch({playerId:order[0].teamId,opponentId:order[1].teamId,round:'online',matchId:room.code});onlineLoaded.current=room.code;setView('race');setCaption('');}
  finally{if(request===onlineRequest.current){onlinePreparing.current=false;setBusy(false);}}
 }
 async function readyOnline(value:boolean){
  if(!value){online.ready(false);return;}const motion=tilt.enable();void audio.unlock();setError('');
  try{await prepareOnline(onlineState.room);await motion;tilt.calibrate();if(online.state.room?.code===onlineLoaded.current)online.ready(true);}catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 async function onlineFrame(snapshot:any,room:any){
  onlineLatest.current={snapshot,room};if(!['running','finished'].includes(room.status)||online.state.room?.code!==room.code)return;
  if(!game.online||onlineLoaded.current!==room.code){if(onlinePreparing.current||!ready)return;try{await prepareOnline(room);}catch(e){setError(e instanceof Error?e.message:String(e));return;}}
  if(online.state.room?.code!==room.code||!game.online)return;
  const latest=onlineLatest.current;game.receiveOnline(latest.snapshot);
  if(onlineRun.current!==room.code){onlineRun.current=room.code;setMode('online');setPanel(null);setPlaying(true);setHud(game.snapshot());}
 }
 function openOnline(tab='play'){if(online.savedRoom){void tilt.enable().then(()=>tilt.calibrate());void audio.unlock();}setOnlineTab(tab);setMode('online');setPanel('online');setMenuHidden(false);setError('');void online.open();}
 function closeOnline(){onlineRequest.current++;onlinePreparing.current=false;onlineLoaded.current='';onlineRun.current='';void online.leave();game.reset();runtime.current?.reset();setHud(game.snapshot());setPanel('menu');setBusy(false);setPlaying(true);}
 function onlineAgain(){controls.clear();onlineRequest.current++;onlineLoaded.current='';onlineRun.current='';void online.leave().then(()=>online.refresh());audio.setActive(false);game.reset();runtime.current?.reset();setHud(game.snapshot());setPanel('online');setOnlineTab('play');setOnlineQuit(false);setPlaying(true);}
 async function launch(fresh=false){
  if(!ready||preparing.current)return;const motionReady=tilt.enable();controls.clear();music.setActive(false);void audio.unlock();audio.setActive(false);preparing.current=true;activeRef.current=null;setBusy(true);setError('');
  try{
   let match=tournament.currentMatch();
   if(mode!=='cup')match={playerId:selected,opponentId:opponentId!==selected?opponentId:roster.find(t=>t.id!==selected)!.id,round:mode,matchId:mode+'-'+seed()};
   else {
    if(fresh||selected!==tournament.snapshot().playerId||!match){const n=seed();tournament.reset({playerId:selected,seed:n,teamIds:shuffledFestivalIds(n,roster)});match=tournament.currentMatch();}
    if(match.blocked){tournament.retryTie();match=tournament.currentMatch();}
   }
   await runtime.current.setTeams([match.playerId,match.opponentId]);await motionReady;tilt.calibrate();runtime.current.reset();audio.beginMatch([festivalTeam(match.playerId),festivalTeam(match.opponentId)],{practice:mode==='practice'});game.start(difficulty,{intro:mode!=='practice',mode:mode==='quick'?'ai':mode,rowingAssist,steeringAssist,steeringEnabled:true,simpleControls:true,ruleset:'ngo-assisted'});finished.current='';activeRef.current=match;setActiveMatch(match);if(mode==='cup')persist();setView('race');setCaption('');setHud(game.snapshot());setPanel(null);setPlaying(true);
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{preparing.current=false;setBusy(false);}
 }
 function bracket(){bracketFrom.current=panel;resumeDrawer.current=['intro','racing','countdown'].includes(game.state.phase);if(resumeDrawer.current){audio.setActive(false);controls.clear();game.pause();setPlaying(false);}setPanel('bracket');setHud(game.snapshot());}
 function closeBracket(){setPanel(bracketFrom.current);if(resumeDrawer.current){void audio.unlock();game.resume();audio.setActive(true);setPlaying(true);setHud(game.snapshot());}}
 function chooseMode(next:'cup'|'quick'|'practice'){previewRequest.current++;audio.stopPreview();setMode(next);selectTeam(tournament.snapshot().playerId);setQuery('');setPanel('setup');setError('');}
 function mainMenu(){if(game.online||onlineState.room||onlineState.queued){onlineRequest.current++;onlinePreparing.current=false;onlineLoaded.current='';onlineRun.current='';void online.leave();}setOnlineQuit(false);controls.clear();previewRequest.current++;audio.stopPreview();audio.setActive(false);game.reset(difficulty);runtime.current?.reset();setHud(game.snapshot());setPlaying(true);setCaption('');setPanel('menu');setError('');}
 const done=hud.phase==='finished',intro=hud.phase==='intro'||hud.phase==='paused'&&hud.introRemaining>0,live=['intro','countdown','racing','paused'].includes(hud.phase),inRace=panel===null;
 const player=festivalTeam(activeMatch?.playerId||selected),opponent=festivalTeam(activeMatch?.opponentId||opponentId),chosen=festivalTeam(selected);
 const roundLabel=(id:string)=>c[ROUND_KEYS[id]||'cup'];
 const round=mode==='online'?o.online:mode==='practice'?c.practice:mode==='quick'?c.quickRound:roundLabel(activeMatch?.round),champion=cup.champion?festivalTeam(cup.champion):null;
 const teamName=(team:any)=>language==='km'?(team.nameKm?team.nameKm+(team.teamNumberKm?' '+team.teamNumberKm:''):team.nameVi):team.nameVi;
 const competitorName=(team:any,index:number)=>mode==='online'&&onlineState.room?.players.length===2?onlineState.room.players[index===0?onlineState.room.playerIndex:1-onlineState.room.playerIndex].name:teamName(team);
 const phaseLabel=hud.phase==='countdown'?`${c.countdown} ${Math.ceil(hud.countdown)}…`:hud.phase==='paused'?c.paused:hud.phase==='ready'?c.ready:c.raceInProgress;

 const languageControl=<div className="game-language" role="group" aria-label="Language / Ngôn ngữ / ភាសា"><button aria-pressed={language==='vi'} lang="vi" onClick={()=>setLanguage('vi')}>VI</button><button aria-pressed={language==='en'} lang="en" onClick={()=>setLanguage('en')}>EN</button><button aria-pressed={language==='km'} lang="km" onClick={()=>setLanguage('km')}>ខ្មែរ</button></div>;
 const audioOptions=<details className="game-audio-options"><summary aria-label={c.audioSettings}>{c.settings}</summary><div>{inRace&&languageControl}<b>{c.graphics}</b><label>{c.quality}<select aria-label={c.quality} value={quality} onChange={e=>setQuality(e.target.value)}>{['sharp','auto','balanced','low'].map(key=><option key={key} value={key}>{c['quality_'+key]}</option>)}</select></label><p className="game-note">{c.qualityHint}</p>{performanceStats&&<output className="runtime-stats">{performanceStats.fps.toFixed(0)} FPS · {Math.round(performanceStats.triangles/1000)}k △ · {performanceStats.drawCalls} draws<br/>{c.inputReceived}: {performanceStats.input.received} · {c.inputDelay}: {performanceStats.input.dispatchP95Ms?.toFixed(0)??'—'} ms<br/>{c.nextFrame}: {performanceStats.input.nextFrameP95Ms?.toFixed(0)??'—'} ms (p95)</output>}<b>{c.steering}</b><p className="game-note">{c['sensor_'+tiltStatus]||c.tiltHint}</p><button onClick={()=>void tilt.enable()}>{c.calibrateTilt}</button><label>{c.view}<select aria-label={c.view} value={view} onChange={e=>setView(e.target.value)}>{['race','chase','banks'].map(id=><option key={id} value={id}>{c[id==='race'?'follow':id==='chase'?'chase':'fullCourse']}</option>)}</select></label><b>{c.atmosphere}</b>{(['commentary','whistle','drums','crowd'] as const).map(key=><label key={key}><input type="checkbox" checked={key==='commentary'?(language==='vi'?mix.voice:mix.khmer):(mix as any)[key]} onChange={e=>changeMix(key==='commentary'?{voice:e.target.checked,khmer:e.target.checked}:{[key]:e.target.checked})}/>{key==='commentary'?c.commentaryVoice:c[key]}</label>)}<label>{c.volume}<input aria-label={c.volume} type="range" min="0" max="1" step=".05" value={mix.volume} onChange={e=>changeMix({volume:Number(e.target.value)})}/></label>{audioError&&<p role="status">{c.audioError}</p>}</div></details>;
 return <section className={'race-game'+(!inRace?' game-browsing':'')+(hud.phase!=='ready'?' game-playing':'')+(intro?' game-intro':'')+(panel==='menu'&&menuHidden?' game-cinema':'')} data-testid="festival-game" lang={language} style={brandStyle} onPointerDownCapture={e=>{if((e.target as HTMLElement).closest('.game-inputs button')){runtime.current?.noteInput(e.timeStamp);if(game.online){void audio.unlock();if(tilt.status==='idle')void tilt.enable().then(()=>tilt.calibrate());}}if(game.state.phase==='ready'&&mix.enabled)void music.unlock();}}>
  <header className="game-heading">
   <div className="game-brand"><img className="festival-logo" src={import.meta.env.BASE_URL+'assets/festival/festival-logo.svg?sha='+festivalBrandDigest} alt="" width="84" height="38"/><div><span>{c.festival}</span><h1>{c.brand} <small>{inRace?round:venue.length.toLocaleString(language)+' m · '+venue.name[language]}</small></h1></div></div>
   <div className="game-heading-actions">{!inRace&&languageControl}{inRace&&<button className="simple-pause" disabled={!live||!!panel} onClick={()=>pause()} aria-label={c.pause}><Pause size={18}/></button>}{mode==='cup'&&<button onClick={bracket} aria-label={c.bracket}><Trophy size={17}/><span>{c.bracket}</span></button>}<button onClick={()=>changeMix({enabled:!mix.enabled})} aria-label={mix.enabled?c.mute:c.unmute}>{mix.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>{audioOptions}{panel==='setup'&&<button onClick={()=>{audio.stopPreview();setPanel('menu');}} aria-label={c.menu}><Home size={18}/></button>}</div>
  </header>
  {inRace&&!intro&&<div className="game-score" aria-label={c.progress}>
   {(mode==='practice'?[player]:[player,opponent]).map((team,i)=><div key={i}><span className="team-dot" style={{background:team.jersey}}/><span>{i===0?c.you+' · ':''}{competitorName(team,i)}</span><strong>{Math.floor(hud.distances[i])} m</strong><progress max={venue.length} value={hud.distances[i]} /></div>)}
   <span className="game-phase">{phaseLabel}</span>
  </div>}
  <div className="game-stage">
   <div className="game-canvas" ref={host} data-testid="art-stage" aria-busy={!ready}/>
   {panel==='menu'&&<button className="menu-visibility-toggle" aria-expanded={!menuHidden} aria-controls="opening-menu-controls" onClick={()=>setMenuHidden(hidden=>!hidden)}>{menuHidden?<Eye size={18}/>:<EyeOff size={18}/>}<span>{menuHidden?c.showMenu:c.hideMenu}</span></button>}
   {!ready&&<div className={'game-loading'+(panel==='menu'?' menu-loading':'')} role="status">{loadError?<>{c.loadError}: {loadError}<button onClick={()=>location.reload()}>{c.retry}</button></>:<><span className="loading-wheel"/>{loadProgress?c.loadingModel+' '+loadProgress:c.loading}</>}</div>}
   {panel==='menu'&&<div id="opening-menu-controls" className="game-menu" data-testid="main-menu" hidden={menuHidden}><div className="game-menu-card"><img className="festival-menu-logo" src={import.meta.env.BASE_URL+'assets/festival/festival-logo.svg?sha='+festivalBrandDigest} alt="" width="140" height="75"/><span className="game-eyebrow">{c.location}</span><h2>{c.brand}<span>2026 · {venue.length.toLocaleString(language)} m</span></h2><p className="menu-tagline">{c.tagline}</p><label className="venue-picker">{c.venue}<select aria-label={c.venue} value={venueId} onChange={e=>onVenueChange(e.target.value)}>{Object.values(RACE_VENUES).map(v=><option key={v.id} value={v.id}>{v.name[language]} · {v.length.toLocaleString(language)} m</option>)}</select></label><div className="menu-actions"><button className="menu-online" aria-label={o.online} onClick={()=>openOnline()}><Globe2 size={22}/><span>{o.online}<small>{o.onlineHint}</small></span><ArrowRight size={19}/></button><button className="menu-ranking" onClick={()=>openOnline('ranks')}><Medal size={19}/>{o.ranking}</button><button className="game-practice" onClick={()=>chooseMode('practice')}><Compass size={21}/><span>{c.practice}</span><ArrowRight size={19}/></button><button className="game-primary" onClick={()=>chooseMode('cup')}><Trophy size={21}/><span>{cup.history.length&&tournament.currentMatch()?c.continueCup:c.cup}</span><ArrowRight size={19}/></button><button className="game-quick" onClick={()=>chooseMode('quick')}><Flag size={21}/><span>{c.quick}</span><ArrowRight size={19}/></button><button onClick={()=>{setHelpFrom('menu');setPanel('help');}}><HelpCircle size={19}/>{c.how}</button></div><p className="game-note">{c.ceremony}</p><button className="menu-music" onClick={()=>{changeMix({enabled:true});void music.unlock();}}><Volume2 size={15}/>{musicState.playing?c.music:c.playMusic}</button><button className="menu-inspect" onClick={()=>onInspect(runtime.current?.assetSelection||{teamIds:[selected,opponentId],constructionTypes:[construction,construction==='plywood'?'dugout':'plywood']})}>{c.inspect}</button></div><div className="menu-race-label"><span className="live-dot"/>{c.festival}<b>{roster.length} {c.teams.toLocaleLowerCase()} · {venue.length.toLocaleString(language)} m</b></div></div>}
   {panel==='help'&&<section className="game-dialog game-help" role="dialog" aria-modal="true" aria-label={c.how}><button onClick={()=>setPanel(helpFrom)}><ArrowLeft size={18}/>{c.back}</button><h2>{c.helpTitle}</h2><p>{c.helpIntro}</p><ol className="help-steps">{[1,2,3,4].map(n=><li key={n}><span>{n}</span><div><h3>{c['step'+n]}</h3><p>{c['step'+n+'Body']}</p></div></li>)}</ol><button className="game-primary" onClick={()=>helpFrom==='setup'?setPanel('setup'):chooseMode('practice')}>{c.play}<ArrowRight size={18}/></button></section>}
   {panel==='setup'&&<section className="game-dialog game-setup boat-selection" role="dialog" aria-modal="true" aria-label={c.choose}>
    <header className="setup-header"><h2>{c.choose}</h2><button onClick={()=>setPanel('menu')}><ArrowLeft size={17}/>{c.back}</button></header>
    <div className="boat-picker"><label>{c.search}<input aria-label={c.search} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={c.searchHint}/></label><label>{c.teams} · {teamOptions.length}<select aria-label={c.team} value={selected} onChange={e=>selectTeam(e.target.value)} size={4}>{teamOptions.map(t=><option key={t.id} value={t.id}>{teamName(t)}</option>)}</select></label>{!teamOptions.length&&<p role="status">{c.noTeams}</p>}</div>
    <details className="selection-options"><summary>{c.settings} · {venue.length.toLocaleString(language)} m</summary><p className="game-note">{venue.description[language]}</p>{mode==='quick'&&<label>{c.opponent}<select aria-label={c.opponent} value={opponentId===selected?roster.find(t=>t.id!==selected)!.id:opponentId} onChange={e=>setOpponentId(e.target.value)}>{roster.filter(t=>t.id!==selected).map(t=><option key={t.id} value={t.id}>{teamName(t)}</option>)}</select></label>}<label>{c.construction}<select aria-label={c.construction} value={construction} onChange={e=>setConstruction(e.target.value)}><option value="plywood">{c.plywood}</option><option value="dugout">{c.dugout}</option></select></label><label>{c.difficulty}<select aria-label={c.difficulty} value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{Object.keys(DIFFICULTIES).map(id=><option key={id} value={id}>{c[id]}</option>)}</select></label>{mode==='cup'&&cup.history.length>0&&<button disabled={!ready||busy} onClick={()=>launch(true)}>{c.newDraw}</button>}</details>
    <button className="game-primary selection-start" disabled={!ready||busy} onClick={()=>launch()}>{busy?c.preparing:mode==='practice'?c.startPractice:mode==='quick'?c.startQuick:cup.history.length&&cup.playerId===selected&&tournament.currentMatch()?c.continue:c.startCup}<ArrowRight size={18}/></button>{error&&<p role="alert">{error}</p>}
   </section>}
   {panel==='online'&&<OnlineLobby client={online} state={onlineState} language={language} venue={venue} roster={roster} selected={selected} onSelect={selectTeam} construction={construction} tab={onlineTab} onTab={setOnlineTab} onClose={closeOnline} onReady={readyOnline} preparing={busy} sceneReady={ready}/>}
   {panel==='online'&&error&&<p className="online-asset-error" role="alert">{error}</p>}
   {panel==='bracket'&&<section className="game-dialog game-bracket" role="dialog" aria-modal="true" aria-label={c.bracketTitle}><header><h2>{c.bracketTitle}</h2><button onClick={closeBracket}>{c.closeBracket}</button></header>{champion&&<p>{c.champion}: <b>{teamName(champion)}</b></p>}<p className="game-note">{c.simulated}</p><div className="bracket-rounds">{cup.bracket.map((r:any,ri:number)=><section key={ri}><h3>{roundLabel(r.round)}</h3>{r.matches.map((m:any)=><div className={'bracket-match'+(m.teams.includes(cup.playerId)?' your-match':'')} key={m.id}>{m.teams.map((id:string)=><span className={m.winner===id?'bracket-winner':''} key={id}>{teamName(festivalTeam(id))}{m.winner===id?' ✓':''}</span>)}{m.result==='bye'&&<small>{c.bye}</small>}{m.result==='tie'&&<small>{c.tieReplay}</small>}</div>)}</section>)}</div></section>}
   {inRace&&live&&!intro&&<><div className="race-telemetry">{mode!=='practice'&&<div><span>{c.position}</span><b>{hud.gap>=0?'1':'2'} / 2</b></div>}<div><span>{c.time}</span><b>{formatRaceTime(hud.elapsed)}</b></div><div><span>{c.speed}</span><b>{(hud.speeds[0]*3.6).toFixed(1)} <small>km/h</small></b></div><div><span>{mode==='practice'?c.remaining:c.gap}</span><b>{mode==='practice'?Math.ceil(venue.length-hud.distances[0])+' m':Math.abs(hud.gap)<.5?c.level:(hud.gap>0?c.ahead:c.behind)+' '+Math.abs(hud.gap).toFixed(1)+' m'}</b></div></div>{mode==='practice'?<div className="practice-coach" data-testid="practice-coach"><small>{c.practice} · {hud.practiceTasks.filter(Boolean).length}/4</small><b>{c[['coachRow','coachSteer','coachPace','coachFinish'][Math.max(0,hud.practiceTasks.findIndex((done:boolean)=>!done))]]}</b><span>{c.steerHelp}</span></div>:<div className={'race-stage-callout '+hud.raceStage}><b>{c[hud.raceStage+'Stage']}</b><span>{c[hud.raceStage+'Hint']}</span><small>{Math.round(hud.cadence)} BPM · {c.combo} {hud.combo}</small></div>}<div className="tilt-status" data-testid="tilt-status" data-sensor={tiltStatus}>{c['sensor_'+tiltStatus]||c.tiltHint}</div>{hud.waitingForOpponent&&mode!=='online'&&<button className="race-complete" onClick={()=>{game.completeRace();observe({game:game.snapshot()});}}>{c.waitingOpponent} · {c.showResults}</button>}</>}
   {intro&&inRace&&hud.phase!=='paused'&&<div className="race-introduction" data-testid="race-intro"><div><span>{c.intro}</span><h2>{hud.introElapsed<3?c.introStand:hud.introElapsed<7.7?c.introCourse:c.introStart}</h2><progress max="10" value={hud.introElapsed}/></div>{mode!=='online'&&<button onClick={()=>{game.skipIntro();setHud(game.snapshot());}}>{c.skipIntro}<ArrowRight size={17}/></button>}</div>}
   {hud.phase==='countdown'&&inRace&&<div className="race-countdown" aria-live="assertive"><strong>{Math.ceil(hud.countdown)}</strong><span>{c.getReady}</span></div>}
   {mode==='online'&&inRace&&<div className="online-race-status" role="status"><Signal size={14}/>{onlineState.status==='connected'?(onlineState.ping==null?o.live:onlineState.ping+' ms'):o.reconnecting}{onlineState.room?.players.some((p:any)=>p.id!==online.playerId&&!p.connected)&&<span> · {o.opponentAway}</span>}{onlineState.status==='disconnected'&&<button onClick={()=>online.reconnect()}>{o.retry}</button>}</div>}
   {onlineQuit&&<section className="game-dialog online-quit" role="dialog" aria-modal="true" aria-label={o.quitTitle}><Flag size={30}/><h2>{o.quitTitle}</h2><p>{o.quitBody}</p><p>{o.noPause}</p><button className="game-primary" onClick={()=>setOnlineQuit(false)}>{o.stay}</button><button onClick={mainMenu}>{o.quit}</button></section>}
   {hud.phase==='paused'&&inRace&&<section className="game-dialog game-pause-dialog" role="dialog" aria-modal="true" aria-label={c.pauseTitle}><Pause size={28}/><h2>{c.pauseTitle}</h2><p>{c.pauseBody}</p><button className="game-primary" onClick={()=>pause()}><Play size={18}/>{c.resume}</button><button disabled={busy} onClick={()=>launch()}><RotateCcw size={18}/>{c.restart}</button><button onClick={mainMenu}><Home size={18}/>{c.leave}</button><p className="game-note">{c.leaveNote}</p></section>}
   {done&&inRace&&<section className="game-dialog game-result" role="dialog" aria-modal="true" aria-label={c.results}><Trophy className="result-trophy" size={40}/><span className="game-eyebrow">{round}</span><h2>{mode==='practice'?c.practiceComplete:mode==='cup'&&cup.status==='champion'?c.cupWin:hud.result==='win'?c.win:hud.result==='tie'?c.tie:hud.result==='dnf'?c.dnf:c.loss}</h2><div className="result-times">{(mode==='practice'?[player]:[player,opponent]).map((t,i)=><div key={i}><span>{competitorName(t,i)}</span><b>{formatRaceTime(hud.finishTimes[i])}</b></div>)}</div>{mode==='online'&&<div className="online-result-rating" role="status">{!onlineState.room?.ranked?<small>{o.friendlyResult}</small>:onlineState.room?.settled?<><span>{o.rankUpdated}</span>{onlineState.room.changes.filter((change:any)=>change.id===online.playerId).map((change:any)=><b key={change.id}>{change.after} Elo · {change.change>=0?'+':''}{change.change}</b>)}</>:<small>{o.rankPending}</small>}<small>{onlineState.room?.result?.reason==='finish'?o.finish:onlineState.room?.result?.reason==='timeout'?o.timeout:o.forfeit} · {o.settled}</small></div>}<p>{c.staminaRemaining}: <b>{Math.round(hud.stamina)}%</b>{mode==='practice'&&practiceBest!=null&&<> · {c.personalBest}: {formatRaceTime(practiceBest)}</>}</p>{mode==='cup'&&champion&&<p>{c.champion}: <b>{teamName(champion)}</b></p>}{mode==='online'?<button className="game-primary" onClick={onlineAgain}>{o.raceAgain}</button>:mode!=='cup'?<button className="game-primary" disabled={busy} onClick={()=>launch()}>{c.again}</button>:['ready','tie'].includes(cup.status)?<button className="game-primary" disabled={busy} onClick={()=>launch()}>{hud.result==='tie'?c.retryTie:c.next}</button>:<button className="game-primary" onClick={()=>{game.reset();setHud(game.snapshot());setPanel('setup');}}>{c.newCup}</button>}{mode==='cup'&&<button onClick={bracket}>{c.allBracket}</button>}<button onClick={mainMenu}><Home size={17}/>{c.menu}</button>{error&&<p role="alert">{error}</p>}</section>}
  </div>
   {inRace&&!intro&&!done&&<footer className="game-controls simple-controls" inert={hud.phase==='paused'} aria-hidden={hud.phase==='paused'}>
    <div className="simple-stamina"><label>{c.stamina}<b>{Math.round(hud.stamina)}%</b><progress aria-label={c.endurance} max="100" value={hud.stamina}/></label><small>{hud.boostExhausted?c.boostEmpty:!hud.rowingHeld?c.recoverHint:''}</small></div>
    <div className="game-inputs two-action-inputs">
     <button ref={strokePad} className="game-stroke simple-row" data-testid="stroke-pad" disabled={!live||hud.phase!=='racing'||hud.finishTimes[0]!=null||!!panel||busy||onlineQuit||(mode==='online'&&onlineState.status!=='connected')} aria-pressed={hud.rowingHeld} onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);controls.rowDown('pointer:'+e.pointerId,e.timeStamp);}} onPointerUp={e=>controls.release('pointer:'+e.pointerId)} onPointerCancel={e=>controls.release('pointer:'+e.pointerId,{cancelled:true})} onLostPointerCapture={e=>controls.release('pointer:'+e.pointerId,{cancelled:true})} onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)controls.rowDown('key:'+e.code,e.timeStamp);}}} onKeyUp={e=>controls.release('key:'+e.code)} onBlur={()=>controls.releaseKeyboard()} onClick={e=>{if(e.detail===0)stroke();}} onContextMenu={e=>e.preventDefault()}><Waves size={28}/><span><strong>{c.rowSimple}</strong><small>{c.rowHint}</small><span ref={receipt} className="stroke-receipt" aria-hidden="true"/></span></button>
     <button className="simple-boost" data-testid="boost-pad" data-empty={hud.boostExhausted} disabled={!live||hud.phase!=='racing'||hud.finishTimes[0]!=null||!!panel||busy||onlineQuit||(mode==='online'&&onlineState.status!=='connected')} aria-pressed={hud.boostActive} onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);controls.boostDown('pointer:'+e.pointerId);}} onPointerUp={e=>controls.release('pointer:'+e.pointerId)} onPointerCancel={e=>controls.release('pointer:'+e.pointerId,{cancelled:true})} onLostPointerCapture={e=>controls.release('pointer:'+e.pointerId,{cancelled:true})} onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)controls.boostDown('key:'+e.code);}}} onKeyUp={e=>controls.release('key:'+e.code)} onBlur={()=>controls.releaseKeyboard()} onContextMenu={e=>e.preventDefault()}><Zap size={28}/><span><strong>{c.boostSimple}</strong><small>{hud.boostExhausted?c.boostEmpty:c.boostHint}</small></span></button>
    </div>
   </footer>}
 </section>;
}

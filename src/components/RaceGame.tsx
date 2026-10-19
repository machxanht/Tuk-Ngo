import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Flag,HelpCircle,Home,Pause,Play,RotateCcw,Trophy,Volume2,VolumeX,Waves} from 'lucide-react';
import {createRaceGame,DIFFICULTIES,formatRaceTime} from '../race/gameplay.mjs';
import {createTournament} from '../race/tournament.mjs';
import {FESTIVAL_TEAMS,festivalTeam,shuffledFestivalIds} from '../race/festival-teams.mjs';
import {createRaceAudio,DEFAULT_AUDIO_MIX,normalizeAudioMix} from '../race/race-audio.mjs';
import {GAME_COPY,ROUND_KEYS,readGameLanguage} from '../race/game-language';
import './RaceGame.css';

const STORAGE='tukngo-festival-cup',AUDIO_STORAGE='tukngo-race-audio';
function audioPreferences(){try{return normalizeAudioMix(JSON.parse(localStorage.getItem(AUDIO_STORAGE)||'null'));}catch{return {...DEFAULT_AUDIO_MIX};}}
const seed=()=>Math.floor(Math.random()*4294967296);
function makeCup(){
 const n=seed(),cup=createTournament({playerId:'tum-nup-2',seed:n,teamIds:shuffledFestivalIds(n)});
 try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved?.teamIds?.length===61&&saved.teamIds.every((id:string)=>FESTIVAL_TEAMS.some(t=>t.id===id)))cup.restore(saved);}catch{/* Invalid or unavailable storage starts a fresh cup. */}
 return cup;
}
export function RaceGame({onInspect}:{onInspect:()=>void}){
 const [language,setLanguage]=useState(readGameLanguage),c=GAME_COPY[language];
 const textRef=useRef(c);textRef.current=c;
 const [mode,setMode]=useState<'cup'|'quick'>('cup'),modeRef=useRef(mode);modeRef.current=mode;
 const [view,setView]=useState('race'),[helpFrom,setHelpFrom]=useState<'menu'|'setup'>('menu');
 const [game]=useState(createRaceGame),[tournament]=useState(makeCup);
 const [cup,setCup]=useState(()=>tournament.snapshot()),[hud,setHud]=useState(()=>game.snapshot());
 const [selected,setSelected]=useState(cup.playerId),[query,setQuery]=useState(''),[difficulty,setDifficulty]=useState('normal');
 const [panel,setPanel]=useState<'menu'|'setup'|'help'|'bracket'|null>('menu'),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(true);
 const [loadProgress,setLoadProgress]=useState(''),[loadError,setLoadError]=useState(''),[error,setError]=useState(''),[activeMatch,setActiveMatch]=useState(()=>tournament.currentMatch());
 const [mix,setMix]=useState(audioPreferences),[caption,setCaption]=useState(''),[audioError,setAudioError]=useState('');
 const [preview,setPreview]=useState<any>(null),[profileMessage,setProfileMessage]=useState(''),[profileFacts,setProfileFacts]=useState<any[]>([]);
 const previewRequest=useRef(0);
 const [audio]=useState(()=>createRaceAudio({baseUrl:import.meta.env.BASE_URL,onCaption:setCaption,onPreviewState:setPreview,onError:()=>setAudioError('unavailable')}));
 const host=useRef<HTMLDivElement>(null),runtime=useRef<any>(null),beat=useRef<HTMLDivElement>(null);
 const finished=useRef(''),resumeDrawer=useRef(false),bracketFrom=useRef<typeof panel>('menu'),clock=useRef({phase:0,seconds:0,last:0}),actions=useRef<any>({});
 const activeRef=useRef(activeMatch);
 const preparing=useRef(false);
 const teamOptions=useMemo(()=>FESTIVAL_TEAMS.filter(t=>(t.name+' '+t.nameVi+' '+(t.nameKm||'')).toLocaleLowerCase().includes(query.toLocaleLowerCase())),[query]);
 function persist(){const s=tournament.snapshot();setCup(s);try{localStorage.setItem(STORAGE,JSON.stringify(s));}catch{/* Gameplay works without browser storage. */}}
 function observe(s:any){
  if(!s.game)return;setHud(s.game);
  if(s.game.phase==='finished'&&modeRef.current==='cup'){
   const match=tournament.currentMatch(),key=match?.matchId+'-'+s.game.runId;
   if(!preparing.current&&match&&match.matchId===activeRef.current?.matchId&&!match.blocked&&finished.current!==key){finished.current=key;tournament.finish({matchId:match.matchId,result:s.game.result});if(tournament.snapshot().status==='eliminated')tournament.resolveRemaining();persist();}
  }
 }
 const settings=useRef<any>({});settings.current={racing:true,view:panel==='menu'?'menu':view,playing:playing&&panel===null,ambientPlaying:panel==='menu',cadence:84,splash:true,fast:false,game,onRace:observe,
  onGameFrame:(s:any)=>{audio.update(s);if(beat.current){beat.current.style.setProperty('--beat',(((s.beatPhase+.5)%1)*100)+'%');beat.current.style.setProperty('--good',(DIFFICULTIES[s.difficulty].window*2*s.cadence/60*100)+'%');beat.current.style.setProperty('--perfect',(.2*s.cadence/60*100)+'%');}}};
 useEffect(()=>{
  let cancelled=false,stop=()=>{};const mount=host.current!;
  (async()=>{const {startBoatPreview}=await import('../race/boat-preview.mjs');if(cancelled)return;
   const match=tournament.currentMatch();settings.current.teamIds=match?[match.playerId,match.opponentId]:['tum-nup-2','prek-on-dok-2'];clock.current.last=performance.now();
   await startBoatPreview(mount,settings,clock,import.meta.env.BASE_URL,(api:any)=>{if(cancelled){api.dispose();return;}api.audio=audio;runtime.current=api;stop=api.dispose;setReady(true);},(n:number,total:number)=>{if(!cancelled)setLoadProgress(`${n}/${total}`);});
  })().catch((e:Error)=>{if(!cancelled)setLoadError(e.message);});
  return()=>{cancelled=true;audio.dispose();stop();runtime.current=null;};
 },[game,tournament,audio]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if(e.repeat)return;if(e.code==='Escape'){actions.current.escape();return;}if(/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test((e.target as HTMLElement)?.tagName))return;if(e.code==='Space'||e.code==='Enter'){e.preventDefault();actions.current.stroke();}};
  const visibility=()=>{if(document.hidden){audio.setActive(false);actions.current.pause(true);}};
  document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[audio]);
 useEffect(()=>{audio.setMix(mix);try{localStorage.setItem(AUDIO_STORAGE,JSON.stringify(mix));}catch{/* Audio still works without storage. */}},[audio,mix]);
 useEffect(()=>{audio.setActive(playing&&panel===null&&['racing','countdown','finished'].includes(hud.phase));},[audio,playing,panel,hud.phase]);
 useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem('tukngo-language',language);}catch{/* Language still switches without storage. */}},[language]);
 useEffect(()=>{setProfileMessage('');},[language]);
 function selectTeam(value:string){previewRequest.current++;audio.stopPreview();setProfileMessage('');setProfileFacts([]);setSelected(value);}
 function changeMix(next:any){const value=normalizeAudioMix({...mix,...next});audio.setMix(value);setMix(value);if(value.enabled){setAudioError('');void audio.unlock();}}
 async function hearTeam(kind:'name'|'history'){
  const request=++previewRequest.current;
  if(preview?.kind===kind){audio.stopPreview();setProfileMessage(c.stopped);return;}
  if(!mix.enabled)changeMix({enabled:true});
  setProfileMessage(c.loadingAudio);setProfileFacts([]);
  const result=await audio.previewTeam(festivalTeam(selected),kind);
  if(request!==previewRequest.current||result.status==='cancelled')return;
  if(result.status==='playing'){
   const languages=(result.languages||[]).map((lang:string)=>lang==='km'?'Khmer':'Việt').join(' + ');
   const copy=textRef.current;setProfileMessage(`${kind==='name'?copy.name:copy.history} · ${copy.voiceLabel} ${languages}.${kind==='name'&&(!result.available.voice||!result.available.khmer)?' '+copy.missingOther:''}`);
   if(kind==='history')setProfileFacts(result.profile?.historyFacts||[]);
  }else {const copy=textRef.current;setProfileMessage(result.status==='missing'?(kind==='history'?copy.missingHistory:copy.missingName):result.status==='muted'?copy.enableVoice:copy.audioRetry);}
 }

 function stroke(){if(panel||busy)return;game.stroke();setHud(game.snapshot());}
 function pause(onlyPause=false){if(panel||!['racing','countdown','paused'].includes(game.state.phase))return;if(game.state.phase==='paused'){if(!onlyPause){void audio.unlock();game.resume();audio.setActive(true);setPlaying(true);}}else{audio.setActive(false);game.pause(onlyPause?'Đã tạm dừng khi rời màn hình':'');setPlaying(false);}setHud(game.snapshot());}
 actions.current={stroke,pause,escape:()=>{if(panel==='bracket')closeBracket();else if(panel==='help')setPanel(helpFrom);else if(panel==='setup'){audio.stopPreview();setPanel('menu');}else pause();}};
 async function launch(fresh=false){
  if(!ready||preparing.current)return;void audio.unlock();audio.setActive(false);preparing.current=true;activeRef.current=null;setBusy(true);setError('');
  try{
   let match=tournament.currentMatch();
   if(mode==='quick')match={playerId:selected,opponentId:FESTIVAL_TEAMS.find(t=>t.id!==selected&&t.id==='prek-on-dok-2')?.id||'tum-nup-2',round:'quick',matchId:'quick-'+seed()};
   else {
    if(fresh||selected!==tournament.snapshot().playerId||!match){const n=seed();tournament.reset({playerId:selected,seed:n,teamIds:shuffledFestivalIds(n)});match=tournament.currentMatch();}
    if(match.blocked){tournament.retryTie();match=tournament.currentMatch();}
   }
   await runtime.current.setTeams([match.playerId,match.opponentId]);runtime.current.reset();audio.beginMatch([festivalTeam(match.playerId),festivalTeam(match.opponentId)]);audio.setActive(true);game.start(difficulty);finished.current='';activeRef.current=match;setActiveMatch(match);if(mode==='cup')persist();setView('race');setCaption('');setHud(game.snapshot());setPanel(null);setPlaying(true);
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{preparing.current=false;setBusy(false);}
 }
 function bracket(){bracketFrom.current=panel;resumeDrawer.current=['racing','countdown'].includes(game.state.phase);if(resumeDrawer.current){audio.setActive(false);game.pause();setPlaying(false);}setPanel('bracket');setHud(game.snapshot());}
 function closeBracket(){setPanel(bracketFrom.current);if(resumeDrawer.current){void audio.unlock();game.resume();audio.setActive(true);setPlaying(true);setHud(game.snapshot());}}
 function chooseMode(next:'cup'|'quick'){previewRequest.current++;audio.stopPreview();setMode(next);setSelected(tournament.snapshot().playerId);setQuery('');setPanel('setup');setError('');}
 function mainMenu(){previewRequest.current++;audio.stopPreview();audio.setActive(false);game.reset(difficulty);runtime.current?.reset();setHud(game.snapshot());setPlaying(true);setCaption('');setPanel('menu');setError('');}
 const done=hud.phase==='finished',live=['countdown','racing','paused'].includes(hud.phase),inRace=panel===null;
 const player=festivalTeam(activeMatch?.playerId||selected),opponent=festivalTeam(activeMatch?.opponentId||'prek-on-dok-2'),chosen=festivalTeam(selected);
 const roundLabel=(id:string)=>c[ROUND_KEYS[id]||'cup'];
 const round=mode==='quick'?c.quickRound:roundLabel(activeMatch?.round),champion=cup.champion?festivalTeam(cup.champion):null;
 const teamName=(team:any)=>language==='km'?(team.nameKm?team.nameKm+' '+team.teamNumberKm:team.nameVi):team.nameVi;
 const phaseLabel=hud.phase==='countdown'?`${c.countdown} ${Math.ceil(hud.countdown)}…`:hud.phase==='paused'?c.paused:hud.phase==='ready'?c.ready:c[`${hud.raceStage}Stage`];
 const feedback=hud.phase==='countdown'?c.getReady:hud.phase==='paused'?c.pauseTitle:hud.surgeActive?c.surging:hud.judgement==='PERFECT'?c.perfect:hud.judgement==='GOOD'?c.good:hud.judgement==='BAD'?c.bad:c.tapHint;
 const languageControl=<div className="game-language" role="group" aria-label="Ngôn ngữ / ភាសា"><button aria-pressed={language==='vi'} lang="vi" onClick={()=>setLanguage('vi')}>VI</button><button aria-pressed={language==='km'} lang="km" onClick={()=>setLanguage('km')}>ខ្មែរ</button></div>;
 const audioOptions=<details className="game-audio-options"><summary aria-label={c.audioSettings}>{c.audio}</summary><div><b>{c.atmosphere}</b>{(['voice','khmer','whistle','drums','crowd'] as const).map(key=><label key={key}><input type="checkbox" checked={(mix as any)[key]} onChange={e=>changeMix({[key]:e.target.checked})}/>{c[key]}</label>)}<label>{c.volume}<input aria-label={c.volume} type="range" min="0" max="1" step=".05" value={mix.volume} onChange={e=>changeMix({volume:Number(e.target.value)})}/></label>{audioError&&<p role="status">{c.audioError}</p>}</div></details>;
 return <section className={'race-game'+(!inRace?' game-browsing':'')} data-testid="festival-game" lang={language}>
  <header className="game-heading">
   <div className="game-brand"><Waves size={28}/><div><span>{c.festival}</span><h1>{c.brand} <small>{inRace?round:'1.200 m · Maspéro'}</small></h1></div></div>
   <div className="game-heading-actions">{languageControl}{mode==='cup'&&<button onClick={bracket} aria-label={c.bracket}><Trophy size={17}/><span>{c.bracket}</span></button>}<button onClick={()=>changeMix({enabled:!mix.enabled})} aria-label={mix.enabled?c.mute:c.unmute}>{mix.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>{audioOptions}{panel==='setup'&&<button onClick={()=>{audio.stopPreview();setPanel('menu');}} aria-label={c.menu}><Home size={18}/></button>}</div>
  </header>
  {inRace&&<div className="game-score" aria-label={c.progress}>
   {[player,opponent].map((team,i)=><div key={i}><span className="team-dot" style={{background:team.jersey}}/><span>{i===0?c.you+' · ':''}{teamName(team)}</span><strong>{Math.floor(hud.distances[i])} m</strong><progress max="1200" value={hud.distances[i]} /></div>)}
   <span className="game-phase">{phaseLabel}</span>
  </div>}
  <div className="game-stage">
   <div className="game-canvas" ref={host} data-testid="art-stage" aria-busy={!ready}/>
   {!ready&&<div className={'game-loading'+(panel==='menu'?' menu-loading':'')} role="status">{loadError?<>{c.loadError}: {loadError}<button onClick={()=>location.reload()}>{c.retry}</button></>:<><span className="loading-wheel"/>{loadProgress?c.loadingModel+' '+loadProgress:c.loading}</>}</div>}
   {panel==='menu'&&<div className="game-menu" data-testid="main-menu"><div className="game-menu-card"><span className="game-eyebrow">MASPÉRO · SÓC TRĂNG</span><h2>{c.brand}<span>1.200 m</span></h2><p className="menu-tagline">{c.tagline}</p><div className="menu-actions"><button className="game-primary" onClick={()=>chooseMode('cup')}><Trophy size={21}/><span>{cup.history.length&&tournament.currentMatch()?c.continueCup:c.cup}</span><ArrowRight size={19}/></button><button className="game-quick" onClick={()=>chooseMode('quick')}><Flag size={21}/><span>{c.quick}</span><ArrowRight size={19}/></button><button onClick={()=>{setHelpFrom('menu');setPanel('help');}}><HelpCircle size={19}/>{c.how}</button></div><p className="game-note">{c.cupInfo}</p><button className="menu-inspect" onClick={onInspect}>{c.inspect}</button></div><div className="menu-race-label"><span className="live-dot"/>{c.festival}<b>61 {c.teams.toLocaleLowerCase()} · 1.200 m</b></div></div>}
   {panel==='help'&&<section className="game-dialog game-help" role="dialog" aria-modal="true" aria-label={c.how}><button onClick={()=>setPanel(helpFrom)}><ArrowLeft size={18}/>{c.back}</button><h2>{c.helpTitle}</h2><p>{c.helpIntro}</p><ol className="help-steps">{[1,2,3].map(n=><li key={n}><span>{n}</span><div><h3>{c['step'+n]}</h3><p>{c['step'+n+'Body']}</p></div></li>)}</ol><button className="game-primary" onClick={()=>helpFrom==='setup'?setPanel('setup'):chooseMode('quick')}>{c.play}<ArrowRight size={18}/></button></section>}
   {panel==='setup'&&<section className="game-dialog game-setup" role="dialog" aria-modal="true" aria-label={c.choose}>
    <header className="setup-header"><div><span className="game-eyebrow">{mode==='cup'?c.cup:c.quick}</span><h2>{c.setup}</h2></div><button onClick={()=>{audio.stopPreview();setPanel('menu');}}><ArrowLeft size={17}/>{c.back}</button></header>
    <div className="setup-selection"><p>{mode==='cup'?c.cupFormat:c.quickInfo}</p><label>{c.search}<input aria-label={c.search} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={c.searchHint}/></label><label>{c.teams} ({teamOptions.length}/61)<select aria-label={c.team} value={selected} onChange={e=>selectTeam(e.target.value)} size={5}>{teamOptions.map(t=><option key={t.id} value={t.id}>{language==='km'?teamName(t)+' · '+t.nameVi:t.nameVi+(t.nameKm?' · '+t.nameKm:'')}</option>)}</select></label>{!teamOptions.length&&<p role="status">{c.noTeams}</p>}</div>
    <div className="game-setup-options"><div className="selected-team"><span className="team-swatch" style={{background:chosen.jersey,borderColor:chosen.trim}}/><div><b>{teamName(chosen)}</b><span lang={language==='vi'?'km':'vi'}>{language==='vi'?(chosen.nameKm||c.unknownKm)+' '+chosen.teamNumberKm:chosen.nameVi}</span></div></div><p className="game-note">{chosen.appearance==='reference'?c.reference:c.sample}</p>
     <details className="team-profile"><summary>{c.profile}</summary><div className="game-team-audio" aria-label={c.profile}><button disabled={!ready||busy} onClick={()=>void hearTeam('name')}>{preview?.kind==='name'?c.stopName:c.hearName}</button><button disabled={!ready||busy} onClick={()=>void hearTeam('history')}>{preview?.kind==='history'?c.stopHistory:c.hearHistory}</button></div><p className="game-note" role="status">{profileMessage||c.profileNote}</p>{profileFacts.map((fact:any)=><p className="game-note" key={fact.season+'-'+fact.result}><span lang="vi">{fact.textVi}</span> <a href={fact.sources[0]} target="_blank" rel="noreferrer">{c.source} {fact.season}</a></p>)}</details>
     <label>{c.difficulty}<select aria-label={c.difficulty} value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{Object.keys(DIFFICULTIES).map(id=><option key={id} value={id}>{c[id]}</option>)}</select></label><button className="game-primary" disabled={!ready||busy} onClick={()=>launch()}>{busy?c.preparing:mode==='quick'?c.startQuick:cup.history.length&&cup.playerId===selected&&tournament.currentMatch()?c.continue:c.startCup}<ArrowRight size={18}/></button>{mode==='cup'&&cup.history.length>0&&<button disabled={!ready||busy} onClick={()=>launch(true)}>{c.newDraw}</button>}<button className="game-help-link" onClick={()=>{setHelpFrom('setup');setPanel('help');}}><HelpCircle size={16}/>{c.how}</button>{error&&<p role="alert">{error}</p>}</div>
   </section>}
   {panel==='bracket'&&<section className="game-dialog game-bracket" role="dialog" aria-modal="true" aria-label={c.bracketTitle}><header><h2>{c.bracketTitle}</h2><button onClick={closeBracket}>{c.closeBracket}</button></header>{champion&&<p>{c.champion}: <b>{teamName(champion)}</b></p>}<p className="game-note">{c.simulated}</p><div className="bracket-rounds">{cup.bracket.map((r:any,ri:number)=><section key={ri}><h3>{roundLabel(r.round)}</h3>{r.matches.map((m:any)=><div className={'bracket-match'+(m.teams.includes(cup.playerId)?' your-match':'')} key={m.id}>{m.teams.map((id:string)=><span className={m.winner===id?'bracket-winner':''} key={id}>{teamName(festivalTeam(id))}{m.winner===id?' ✓':''}</span>)}{m.result==='bye'&&<small>{c.bye}</small>}{m.result==='tie'&&<small>{c.tieReplay}</small>}</div>)}</section>)}</div></section>}
   {inRace&&live&&<><div className="race-telemetry"><div><span>{c.time}</span><b>{formatRaceTime(hud.elapsed)}</b></div><div><span>{c.speed}</span><b>{(hud.speeds[0]*3.6).toFixed(1)} <small>km/h</small></b></div><div><span>{c.gap}</span><b>{Math.abs(hud.gap)<.5?c.level:(hud.gap>0?c.ahead:c.behind)+' '+Math.abs(hud.gap).toFixed(1)+' m'}</b></div></div><div className="race-view"><button aria-label={c.view} onClick={()=>setView(view==='race'?'banks':'race')}>{view==='race'?c.fullCourse:c.follow}</button></div><div className={'race-stage-callout '+hud.raceStage}><b>{c[hud.raceStage+'Stage']}</b><span>{c[hud.raceStage+'Hint']}</span><small>{Math.round(hud.cadence)} BPM · {c.combo} {hud.combo}</small></div></>}
   {hud.phase==='paused'&&inRace&&<section className="game-dialog game-pause-dialog" role="dialog" aria-modal="true" aria-label={c.pauseTitle}><Pause size={28}/><h2>{c.pauseTitle}</h2><p>{c.pauseBody}</p><button className="game-primary" onClick={()=>pause()}><Play size={18}/>{c.resume}</button><button disabled={busy} onClick={()=>launch()}><RotateCcw size={18}/>{c.restart}</button><button onClick={mainMenu}><Home size={18}/>{c.leave}</button><p className="game-note">{c.leaveNote}</p></section>}
   {done&&inRace&&<section className="game-dialog game-result" role="dialog" aria-modal="true" aria-label={c.results}><Trophy className="result-trophy" size={40}/><span className="game-eyebrow">{round}</span><h2>{mode==='cup'&&cup.status==='champion'?c.cupWin:hud.result==='win'?c.win:hud.result==='tie'?c.tie:hud.result==='dnf'?c.dnf:c.loss}</h2><div className="result-times">{[player,opponent].map((t,i)=><div key={i}><span>{teamName(t)}</span><b>{formatRaceTime(hud.finishTimes[i])}</b></div>)}</div><div className="result-stats"><div><b>{hud.accuracy}%</b><span>{c.accuracy}</span></div><div><b>{hud.maxCombo}</b><span>{c.bestCombo}</span></div></div><p>{c.perfectCount} {hud.perfect} · {c.goodCount} {hud.good} · {c.missCount} {hud.missed}</p>{mode==='cup'&&champion&&<p>{c.champion}: <b>{teamName(champion)}</b></p>}{mode==='quick'?<button className="game-primary" disabled={busy} onClick={()=>launch()}>{c.again}</button>:['ready','tie'].includes(cup.status)?<button className="game-primary" disabled={busy} onClick={()=>launch()}>{hud.result==='tie'?c.retryTie:c.next}</button>:<button className="game-primary" onClick={()=>{game.reset();setHud(game.snapshot());setPanel('setup');}}>{c.newCup}</button>}{mode==='cup'&&<button onClick={bracket}>{c.allBracket}</button>}<button onClick={mainMenu}><Home size={17}/>{c.menu}</button>{error&&<p role="alert">{error}</p>}</section>}
  </div>
  {inRace&&<footer className="game-controls" inert={hud.phase==='paused'||done} aria-hidden={hud.phase==='paused'||done}>
   <p className="game-commentary" aria-live="polite" aria-atomic="true"><span lang={caption?'vi':language}>{caption|| (mix.enabled?c.audioIdle:c.muted)}</span></p>
   <div className="game-rhythm"><div className="rhythm-track" ref={beat} aria-label={c.rhythm}><i className="rhythm-good"/><i className="rhythm-perfect"/><i className="rhythm-centre"/><i className="rhythm-marker"/></div><span className={'game-feedback '+(hud.judgement||'')} role="status">{feedback}</span></div>
   <div className="game-inputs"><button className="game-stroke" disabled={!live||hud.phase!=='racing'||!!panel||busy} onClick={stroke}>{c.stroke}<small>{c.tap}</small></button><div className="game-paces" aria-label={c.pace}>{(['recover','steady','sprint'] as const).map(id=><button key={id} aria-pressed={hud.pace===id} disabled={!live||!!panel} onClick={()=>{game.setPace(id);setHud(game.snapshot());}}>{c[id]}</button>)}</div><button className="game-surge" disabled={!hud.canSurge||!!panel} onClick={()=>{game.surge();setHud(game.snapshot());}}>{c.surge}<small>{hud.raceStage==='final'?`${Math.round(hud.surgeCharge*100)}% ${c.power}`:c.unlock}</small></button><button className="game-pause" disabled={!live||!!panel} onClick={()=>pause()} aria-label={hud.phase==='paused'?c.resume:c.pause}>{hud.phase==='paused'?<Play size={18}/>:<Pause size={18}/>}</button><div className="game-stamina"><label>{c.stamina}<b>{Math.round(hud.stamina)}%</b><progress aria-label={c.endurance} max="100" value={hud.stamina}/></label><label>{c.charge}<b>{Math.round(hud.surgeCharge*100)}%</b><progress aria-label={c.charge} max="1" value={hud.surgeCharge}/></label></div></div>
  </footer>}
 </section>;
}

import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {buildRiver,buildSplashes} from '../race/river.mjs';
import {loadRaceCrews,buildBoatWake} from '../race/race-crew.mjs';
import {COURSE,buildMasperoSky} from '../race/maspero-course.mjs';
import {loadCrowdAssets} from '../race/crowd.mjs';
import {createCrowdAudio} from '../race/crowd-audio.mjs';
import {createRaceGame,PACES} from '../race/gameplay.mjs';
import {RACE_TEAMS_2025,DEFAULT_TEAM_IDS} from '../race/teams-2025.mjs';
import {RaceGameControls} from './RaceGameControls';
import {Play,Pause,RotateCcw,Waves,Maximize2,Download,Users,ArrowLeft,Camera,Video} from 'lucide-react';
import './TabletRaceDemo.css';

type CameraMode='overview'|'follow'|'crew'|'seated'|'standing'|'bow'|'controller'|'helm'|'stand'|'crowd'|'crowdOpposite'|'bridgeStart'|'bridgeEnd';
export function TabletRaceDemo({embedded=false,gameplay=false}:{embedded?:boolean;gameplay?:boolean}){
 const mount=useRef<HTMLDivElement>(null),runtime=useRef<any>(null);
 const game=useRef<any>(null);if(!game.current)game.current=createRaceGame();
 const [gameView,setGameView]=useState(()=>game.current.snapshot());
 const [bestTimes,setBestTimes]=useState<Record<string,number>>(()=>{try{const saved=JSON.parse(localStorage.getItem('tuk-ngo-best-v1')||'{}');return Object.fromEntries(Object.entries(saved).filter(([key,value])=>['easy','normal','hard'].includes(key)&&typeof value==='number'&&value>0&&value<=360)) as Record<string,number>;}catch{return {};}});
 const [recordsPersisted,setRecordsPersisted]=useState(true);
 const [playing,setPlaying]=useState(!gameplay),[camera,setCamera]=useState<CameraMode>(gameplay?'follow':'overview'),[cadence,setCadence]=useState(80),[splash,setSplash]=useState(true),[lowPower,setLowPower]=useState(true),[team,setTeam]=useState(0);
 const [status,setStatus]=useState('Đang tải hai ghe và đường đua Maspéro…'),[ready,setReady]=useState(false),[distance,setDistance]=useState(gameplay?0:1020),[recording,setRecording]=useState(false),[fps,setFps]=useState('—');
 const [sound,setSound]=useState(false),[selectedIds,setSelectedIds]=useState<[string,string]>(()=>[...DEFAULT_TEAM_IDS] as [string,string]),[exporting,setExporting]=useState<number|null>(null);
 const selectedTeams=selectedIds.map(id=>RACE_TEAMS_2025.find((t:any)=>t.id===id));
 const settings=useRef({playing,camera,cadence,splash,lowPower,team});settings.current={playing,camera,cadence,splash,lowPower,team};
 useEffect(()=>{if(!gameplay||gameView.phase!=='finished'||gameView.result!=='win')return;const time=gameView.finishTimes[0];if(time==null||(bestTimes[gameView.difficulty]&&bestTimes[gameView.difficulty]<=time))return;const next={...bestTimes,[gameView.difficulty]:time};try{localStorage.setItem('tuk-ngo-best-v1',JSON.stringify(next));setRecordsPersisted(true);}catch{setRecordsPersisted(false);}setBestTimes(next);},[gameplay,gameView.phase,gameView.runId]);
 useEffect(()=>{if(!gameplay||!ready)return;const update=()=>runtime.current?.frameGameplay();update();const panel=mount.current?.parentElement?.querySelector('.game-paddle-panel');if(!panel)return;const observer=new ResizeObserver(update);observer.observe(panel);return()=>observer.disconnect();},[gameplay,ready,gameView.phase]);
 useEffect(()=>{
  let stopped=false,raf=0,cleanup:()=>void=()=>{};
  const host=mount.current!;
  const visibility=()=>{if(gameplay&&document.hidden){game.current.pause('Đã tạm dừng khi bạn chuyển tab.');setGameView(game.current.snapshot());}};document.addEventListener('visibilitychange',visibility);
  async function start(){try{
   const font=new FontFace('Noto Sans Khmer','url('+import.meta.env.BASE_URL+'assets/fonts/NotoSansKhmer.ttf)',{weight:'100 900'});document.fonts.add(await font.load());
   const [model,crowdAssets]=await Promise.all([loadRaceCrews(import.meta.env.BASE_URL+'assets/ghe-ngo/ghe-ngo-crew-v12.glb'),loadCrowdAssets(import.meta.env.BASE_URL)]);if(stopped){model.dispose();return;}
   const scene=new THREE.Scene();scene.background=new THREE.Color('#d6e1da');scene.fog=new THREE.Fog('#d6e1da',220,740);
   scene.add(new THREE.HemisphereLight('#eaf2eb','#8b8066',.95));const sun=new THREE.DirectionalLight('#fff4dc',2.8);sun.position.set(-45,75,35);scene.add(sun);
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;host.appendChild(renderer.domElement);
   renderer.domElement.setAttribute('aria-label','Hai ghe Ngo 3D chèo trên đường đua Maspéro với khán đài và khán giả hai bờ');
   const view=new THREE.PerspectiveCamera(48,1,.10,1800),controls=new OrbitControls(view,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.10;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=2;controls.maxDistance=230;controls.enablePan=false;
   const river=buildRiver(scene,.28,{detailed:true,crowdAssets}),sky=buildMasperoSky(scene),effects=model.teams.map(()=>buildSplashes(scene,.28)),wakes=model.teams.map(()=>buildBoatWake(scene,.28)),crowdAudio=createCrowdAudio(import.meta.env.BASE_URL+'assets/audio/crowd-cheer-cc0.mp3');model.teams.forEach(t=>scene.add(t.root));river.setBoats(model.teams.map(t=>t.root));
   host.dataset.selectedTeams=JSON.stringify(DEFAULT_TEAM_IDS.map((id:string)=>RACE_TEAMS_2025.find((t:any)=>t.id===id)));
   host.dataset.sceneVersion=gameplay?'MASPERO_TWO_CREWS_V12_GAMEPLAY':'MASPERO_TWO_CREWS_V12';host.dataset.actorSource='MAKEHUMAN_CC0_KOUN_KHMER_ROLE_CREW';host.dataset.boatCount='2';host.dataset.crewCount=String(model.teams.reduce((n,t)=>n+t.actors.length,0));host.dataset.rowerCount=String(model.teams.reduce((n,t)=>n+t.athletes.length,0));host.dataset.optimization=JSON.stringify(model.teams.map(t=>t.stats));host.dataset.course=JSON.stringify(COURSE);host.dataset.environment=JSON.stringify(river.group.userData);host.dataset.khmerFont=String(document.fonts.check('700 18px "Noto Sans Khmer"'));
   host.dataset.crewRoles=JSON.stringify(model.teams.map(t=>t.actors.reduce((counts:Record<string,number>,a:any)=>{const key=a.userData.role+(a.userData.posture?':'+a.userData.posture:'');counts[key]=(counts[key]||0)+1;return counts;},{})));
   host.dataset.capOrientations=JSON.stringify(model.teams.map(t=>t.actors.reduce((counts:Record<string,number>,a:any)=>{const key=a.userData.capOrientation||'unknown';counts[key]=(counts[key]||0)+1;return counts;},{})));
   const atlasMaps:any[]=[];model.teams.forEach(t=>t.root.traverse((o:any)=>{if(o.name.endsWith('_RaceSkin'))atlasMaps.push({map:[o.material.map?.image?.width,o.material.map?.image?.height],normal:!!o.material.normalMap,roughness:!!o.material.roughnessMap,uv:!!o.geometry.attributes.uv});}));host.dataset.actorAtlas=JSON.stringify({actors:atlasMaps.length,example:atlasMaps[0]});
   let simTime=0,travel=gameplay?0:1020,last=performance.now(),lastPose=0,lastUi=0,lastGameUi=0,lastCamera='',lastTeam=-1,lastQuality=true,frames=0,fpsStart=last,recorder:MediaRecorder|null=null,recordTimer:ReturnType<typeof setTimeout>|undefined;
   function positionCamera(mode:CameraMode){const selected=model.teams[settings.current.team],x=selected.root.position.x,z=selected.root.position.z,portrait=view.aspect<1?1.18:1;
    controls.maxDistance=230;
    if(mode==='overview'){controls.target.set(x-4,1.3,-2);view.position.set(x+34*portrait,27*portrait,67*portrait);}
    if(mode==='follow'){controls.target.set(x+3,1.1,-2);view.position.set(x-31*portrait,8.4*portrait,29*portrait);}
    if(['crew','seated','standing','bow','controller','helm'].includes(mode)){
     const wanted=mode==='crew'?'seated':mode;
     const actor=selected.actors.find((a:any)=>wanted==='seated'||wanted==='standing'?a.userData.role==='ROWER'&&a.userData.posture===wanted:wanted==='bow'?['BOW_CALLER','PROW_COMMAND'].includes(a.userData.role):wanted==='controller'?['MID_CONTROLLER','MID_COMMAND'].includes(a.userData.role):['HELMSMAN','STEERSMAN'].includes(a.userData.role));
     const headPosition=new THREE.Vector3(x+(wanted==='standing'?-3:wanted==='helm'?-12:wanted==='controller'?3.5:wanted==='bow'?11.7:7),1.7,z);
     if(actor){actor.getWorldPosition(headPosition);actor.traverse((node:any)=>{if(node.isBone&&/^head(?:_|$)/i.test(node.name))node.getWorldPosition(headPosition);});}
     controls.target.copy(headPosition).add(new THREE.Vector3(0,-.55,0));view.position.copy(headPosition).add(new THREE.Vector3(1.4,.45,3.5*portrait));controls.maxDistance=16;
    }
    if(mode==='stand'){controls.target.set(COURSE.standX,5,-53);view.position.set(COURSE.standX+36*portrait,36*portrait,75*portrait);}
    if(mode==='crowd'){controls.target.set(COURSE.standX-89,2.5,-45.6);view.position.set(COURSE.standX-83,3.7,-34.8);controls.maxDistance=30;}
    if(mode==='crowdOpposite'){controls.target.set(COURSE.standX-50,2.9,46.9);view.position.set(COURSE.standX-46,3.6,38);controls.maxDistance=30;}
    if(mode==='bridgeStart'||mode==='bridgeEnd'){const bx=mode==='bridgeStart'?COURSE.bridgeStart:COURSE.bridgeEnd;controls.target.set(bx,7,0);view.position.set(bx-72*portrait,22*portrait,68*portrait);}
    frameGameplay();controls.update();lastCamera=mode;lastTeam=settings.current.team;
   }
   const strokeStrength=()=>Math.max(0,Math.min(1,(settings.current.cadence-80)/25));
   function placeBoats(){model.teams.forEach((t,i)=>{const gap=i?1.4+Math.sin(simTime*.12)*.9:0;t.root.position.set((gameplay?game.current.state.distances[i]:travel-gap)-15.1,.010*Math.sin(t.phase*Math.PI*2),COURSE.lanes[i]);t.pose(t.phase,gameplay?0:strokeStrength());});}
   function frameGameplay(){const closeView=['overview','follow','crew','seated','standing','bow','controller','helm','crowd','crowdOpposite'].includes(settings.current.camera);const panel=gameplay?(game.current.state.phase==='racing'?host.parentElement?.querySelector<HTMLElement>('.game-paddle-panel'):null):closeView?host.parentElement?.querySelector<HTMLElement>('.race-toolbar'):null;if(!panel){view.clearViewOffset();return;}const w=host.clientWidth,h=host.clientHeight,box=panel.getBoundingClientRect(),rightAligned=box.left>host.getBoundingClientRect().left+w/2;view.setViewOffset(w,h,rightAligned?Math.min(box.width*.45,w*.18):0,rightAligned?0:Math.min(box.height*(gameplay?.48:.24),h*(gameplay?.23:.12)),w,h);}
   function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setPixelRatio(settings.current.lowPower?1:Math.min(devicePixelRatio,1.5));renderer.setSize(w,h);view.aspect=w/h;view.updateProjectionMatrix();effects.forEach(f=>f.setDpr(renderer.getPixelRatio()));positionCamera(settings.current.camera);frameGameplay();}
   placeBoats();const observer=new ResizeObserver(resize);observer.observe(host);resize();
   function seek(value:number){travel=Math.min(COURSE.length,Math.max(0,value));simTime=0;model.teams.forEach((t,i)=>t.phase=i?.17:.28);effects.forEach(f=>f.reset());placeBoats();wakes.forEach((w,i)=>w.update(model.teams[i].root,0,false));positionCamera(settings.current.camera);setDistance(travel);}
   runtime.current={renderer,scene,view,controls,model,seek,crowdAudio,frameGameplay,selectTeam(lane:number,id:string){
    const replacement=model.setTeamIdentity(lane,id);river.setBoats(model.teams.map(t=>t.root));placeBoats();positionCamera(settings.current.camera);
    const identities=JSON.parse(host.dataset.selectedTeams||'[]');identities[lane]=RACE_TEAMS_2025.find((t:any)=>t.id===id);host.dataset.selectedTeams=JSON.stringify(identities);
    host.dataset.optimization=JSON.stringify(model.teams.map(t=>t.stats));return replacement;
   },reset(){seek(0);},screenshot(){renderer.render(scene,view);renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='maspero-v12-'+settings.current.camera+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});},record(){
    if(!renderer.domElement.captureStream||!window.MediaRecorder){setStatus('Trình duyệt chưa hỗ trợ ghi clip WebM.');return;}
    const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mimeType){setStatus('Trình duyệt chưa hỗ trợ ghi clip WebM.');return;}
    const stream=renderer.domElement.captureStream(30),chunks:BlobPart[]=[];recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4000000});setRecording(true);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);setStatus('Không ghi được clip.');};
    recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(stopped)return;const url=URL.createObjectURL(new Blob(chunks,{type:mimeType})),a=document.createElement('a');a.href=url;a.download='maspero-v12-two-crews-10s.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setRecording(false);};recorder.start();recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},10000);
   }};
   runtime.current.beginRace=(difficulty?:string)=>{game.current.start(difficulty);seek(0);setTeam(0);setGameView(game.current.snapshot());};
   runtime.current.gameMenu=()=>{game.current.reset(game.current.state.difficulty);seek(0);setGameView(game.current.snapshot());};
   if(gameplay)runtime.current.game=game.current;
   if(import.meta.env.DEV)(host as any).__raceRuntime=runtime.current;
   cleanup=()=>{delete (host as any).__raceRuntime;observer.disconnect();controls.dispose();crowdAudio.dispose();clearTimeout(recordTimer);if(recorder?.state==='recording')recorder.stop();effects.forEach(f=>f.dispose());wakes.forEach(w=>w.dispose());river.dispose();sky.dispose();model.dispose();renderer.dispose();renderer.domElement.remove();runtime.current=null;};
   setReady(true);setStatus('Hai ghe · NPC cổ vũ · hai khán đài · biểu ngữ Khmer');
   function animate(now:number){if(stopped)return;const frameDt=Math.max(0,Math.min(gameplay?.25:.05,(now-last)/1000));last=now;const s=settings.current;
    const previousX=model.teams[s.team].root.position.x;
    if(gameplay)game.current.advance(frameDt);
    const gs=game.current.snapshot(),moving=gameplay?gs.phase==='racing':s.playing;
    const dt=gameplay?(gs.phase==='paused'?0:frameDt):(s.playing?frameDt:0),speed=gameplay?gs.speeds[0]:s.cadence/80*4.8;
    simTime+=dt;if(gameplay)travel=gs.distances[0];else{travel+=dt*speed;if(travel>COURSE.length+75)seek(0);}
    model.teams.forEach((t,i)=>{if(gameplay)t.phase=gs.phase==='racing'?(i?gs.aiPhase:(gs.beatPhase+.28)%1):t.phase;else t.phase=(t.phase+dt*(s.cadence+(i?-.8:0))/60)%1;t.root.position.set((gameplay?gs.distances[i]:travel-(i?1.4+Math.sin(simTime*.12)*.9:0))-15.1,.010*Math.sin(t.phase*Math.PI*2),COURSE.lanes[i]);});
    const dx=model.teams[s.team].root.position.x-previousX,intensity=gameplay?gs.strength:strokeStrength();
    if(now-lastPose>1000/(s.lowPower?24:40)){model.teams.forEach((t,i)=>t.pose(t.phase,gameplay&&i?gs.distances[1]>1000?.7:0:intensity));lastPose=now;}else model.teams.forEach(t=>t.root.updateMatrixWorld(true));
    river.update(simTime,view.position.x);effects.forEach((f,i)=>f.update(dt,model.teams[i],gameplay?gs.speeds[i]:speed,simTime,s.splash&&(!gameplay||moving),gameplay&&i?gs.distances[1]>1000?.7:0:intensity));wakes.forEach((w,i)=>w.update(model.teams[i].root,simTime,moving&&(!gameplay||gs.speeds[i]>.1)));crowdAudio.update(moving,gameplay?gs.cadence:s.cadence,travel);
    if(gameplay&&now-lastGameUi>60){lastGameUi=now;host.dataset.gameplay=JSON.stringify(gs);setGameView(gs);}
    if(s.camera!==lastCamera||s.team!==lastTeam)positionCamera(s.camera);else if(['overview','follow','crew','seated','standing','bow','controller','helm'].includes(s.camera)){view.position.x+=dx;controls.target.x+=dx;}controls.update();
    if(s.lowPower!==lastQuality){lastQuality=s.lowPower;resize();}sky.update(view);renderer.render(scene,view);frames++;
    if(now-lastUi>450){lastUi=now;host.dataset.splashEvents=JSON.stringify(effects.map(f=>f.stats().events));host.dataset.splashStats=JSON.stringify(effects.map(f=>f.stats()));host.dataset.waterTime=String(simTime);host.dataset.audio=JSON.stringify(crowdAudio.state());host.dataset.strokeStrength=String(intensity);host.dataset.activeParticles=JSON.stringify(effects.map(f=>f.stats().particles));host.dataset.boatPositions=JSON.stringify(model.teams.map(t=>t.root.position.toArray()));host.dataset.phases=JSON.stringify(model.teams.map(t=>t.phase));host.dataset.distance=travel.toFixed(1);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.camera=s.camera;host.dataset.team=String(s.team);setDistance(travel);}
    if(now-fpsStart>1500){const rate=(frames*1000/(now-fpsStart)).toFixed(1);host.dataset.fps=rate;setFps(rate);frames=0;fpsStart=now;}raf=requestAnimationFrame(animate);
   }
   raf=requestAnimationFrame(animate);
  }catch(error){setStatus('Không tải được cảnh 3D: '+(error instanceof Error?error.message:String(error)));host.dataset.loadError=String(error);}}
  start();return()=>{stopped=true;document.removeEventListener('visibilitychange',visibility);cancelAnimationFrame(raf);cleanup();};
 },[gameplay]);
 function changeTeam(lane:number,id:string){
  if(!ready||exporting!==null||id===selectedIds[1-lane]||gameplay&&!['ready','paused'].includes(game.current.snapshot().phase))return;
  try{runtime.current?.selectTeam(lane,id);setSelectedIds(current=>{const next:[string,string]=[current[0],current[1]];next[lane]=id;return next;});setStatus('Đã chọn '+RACE_TEAMS_2025.find((t:any)=>t.id===id)?.name+' cho ghe làn '+(lane+1)+'.');}catch(error){setStatus('Không đổi được đội: '+(error instanceof Error?error.message:String(error)));}
 }
 async function downloadTeam(lane:number){if(!ready||exporting!==null)return;setExporting(lane);try{const data=await runtime.current.model.exportTeam(lane);const blob=data instanceof Blob?data:new Blob([data],{type:'model/gltf-binary'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=selectedIds[lane]+'-2025.glb';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Đã xuất GLB của '+selectedTeams[lane]?.name+'.');}catch(error){setStatus('Không xuất được GLB: '+(error instanceof Error?error.message:String(error)));}finally{setExporting(null);}}
 const teamSelectors=<fieldset className="race-team-picker"><legend>Chọn đội · Giải nam 2025</legend>{selectedIds.map((id,lane)=><div className="race-team-picker-row" key={lane}><label htmlFor={'race-team-lane-'+lane}>Ghe làn {lane+1}{gameplay?(lane===0?' · Bạn':' · Đối thủ'):''}</label><select id={'race-team-lane-'+lane} value={id} disabled={!ready||exporting!==null||gameplay&&!['ready','paused'].includes(gameView.phase)} onChange={e=>changeTeam(lane,e.target.value)}>{RACE_TEAMS_2025.map((t:any)=><option key={t.id} value={t.id} disabled={t.id===selectedIds[1-lane]}>{t.rank?'Hạng '+t.rank:'Tứ kết'} · {t.name}</option>)}</select><button disabled={!ready||exporting!==null} onClick={()=>downloadTeam(lane)} aria-label={'Tải GLB '+selectedTeams[lane]?.name}><Download size={15}/>{exporting===lane?'Đang xuất…':'GLB'}</button></div>)}<small>Hai làn chọn hai đội khác nhau.{gameplay?' Có thể đổi đội trước xuất phát hoặc khi tạm dừng.':''}</small></fieldset>;
 async function toggleSound(){const next=!sound;try{await runtime.current?.crowdAudio.enable(next);setSound(next);setStatus('Hai ghe · NPC cổ vũ · hai khán đài · biểu ngữ Khmer');}catch{setStatus('Không phát được âm thanh cổ vũ.');}}
 const fullUrl=import.meta.env.BASE_URL+'?demo=studio';
 return <section className={'race-demo'+(embedded?' race-demo-embedded':'')+(gameplay?' race-game':'')}>
  <div ref={mount} className="race-stage" data-testid="race-stage" />
  {gameplay?<RaceGameControls playerName={selectedTeams[0]?.name||''} opponentName={selectedTeams[1]?.name||''} teamSelectors={teamSelectors} ready={ready} status={status} game={gameView} bestTimes={bestTimes} recordsPersisted={recordsPersisted} sound={sound} lowPower={lowPower} camera={camera} onStart={difficulty=>runtime.current?.beginRace(difficulty)} onStroke={()=>{game.current.stroke();setGameView(game.current.snapshot());}} onPace={pace=>{game.current.setPace(pace);setGameView(game.current.snapshot());}} onPause={()=>{game.current.pause();setGameView(game.current.snapshot());}} onResume={()=>{game.current.resume();setGameView(game.current.snapshot());}} onMenu={()=>runtime.current?.gameMenu()} onSound={toggleSound} onQuality={()=>setLowPower(v=>!v)} onCamera={setCamera}/>:<>
  <header className="race-heading"><div><span className="race-eyebrow">BẢN THỬ 3D · V12</span><h1>Sông Maspéro</h1><p>Ngồi chèo · đứng chèo · điều khiển ghe · khán giả</p><div className="race-teams">{selectedTeams.map((t:any,lane:number)=><span key={lane}><i style={{background:t?.jersey}}/>{t?.name}</span>)}</div></div><div className="race-distance">{Math.min(1200,Math.floor(distance))} <small>/ 1.200 m</small><em>{distance>1200?'Qua đích':fps+' FPS'}</em></div></header>
  {!ready&&<div className="race-loading" role="status">{status}</div>}
  <div className="race-toolbar">
   <details className="race-options race-team-menu"><summary>Chọn đội 2025 · Hai ghe</summary>{teamSelectors}</details>
   <div className="race-camera-buttons" aria-label="Góc nhìn">
    {([['overview','Hai ghe'],['follow','Theo ghe'],['crew','VĐV'],['stand','Khán đài'],['crowd','Khán giả'],['bridgeStart','Cầu C247'],['bridgeEnd','Cầu 30/4']] as [CameraMode,string][]).map(([key,label])=><button key={key} className={camera===key?'selected':''} aria-pressed={camera===key} onClick={()=>setCamera(key)}>{key==='crew'&&<Users size={16}/>} {label}</button>)}
   </div>
   <details className="race-options"><summary>Người trên ghe & khán giả</summary><div className="race-camera-buttons">{([['seated','VĐV ngồi'],['standing','VĐV đứng'],['bow','Người đầu ghe'],['controller','Điều khiển'],['helm','Lái đuôi ghe'],['crowdOpposite','Khán giả bờ đối diện']] as [CameraMode,string][]).map(([key,label])=><button key={key} aria-pressed={camera===key} onClick={e=>{setCamera(key);e.currentTarget.closest('details')?.removeAttribute('open');}}>{label}</button>)}</div></details>
   <div className="race-main-controls"><button className="race-play" disabled={!ready} onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':'Chèo'}</button><button onClick={()=>runtime.current?.reset()} aria-label="Về vạch xuất phát" disabled={!ready}><RotateCcw size={18}/></button><label className="race-cadence">Nhịp <input aria-label="Nhịp chèo" type="range" min="55" max="105" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}</strong></label><button aria-pressed={splash} onClick={()=>setSplash(v=>!v)}><Waves size={18}/> Nước té</button></div>
   <details className="race-options"><summary>Đường đua & tùy chọn</summary><div className="race-course-controls"><button disabled={!ready} onClick={()=>runtime.current?.seek(0)}>Xuất phát</button><button disabled={!ready} onClick={()=>runtime.current?.seek(600)}>Giữa sông</button><button disabled={!ready} onClick={()=>runtime.current?.seek(1050)}>Gần đích</button></div><div className="race-focus"><span>Theo đội</span>{selectedTeams.map((t:any,lane:number)=><button key={lane} aria-pressed={team===lane} onClick={()=>setTeam(lane)}>{t?.name}</button>)}</div><label className="race-course-slider">Vị trí <input aria-label="Vị trí trên đường đua" type="range" min="0" max="1200" step="10" value={Math.min(1200,distance)} disabled={!ready} onChange={e=>runtime.current?.seek(Number(e.target.value))}/></label><div className="race-secondary"><label><input type="checkbox" checked={lowPower} onChange={e=>setLowPower(e.target.checked)}/> Tiết kiệm pin</label><button onClick={()=>runtime.current?.screenshot()} aria-label="Chụp ảnh cảnh 3D" disabled={!ready}><Camera size={16}/> Ảnh</button><button disabled={!ready||recording} onClick={()=>{setPlaying(true);runtime.current?.record();}}><Video size={16}/>{recording?'Đang ghi…':'Clip 10s'}</button></div></details>
   <button className="race-sound" aria-pressed={sound} disabled={!ready} onClick={toggleSound}>{sound?'Tắt':'Bật'} tiếng cổ vũ</button>
   <div className="race-links"><button disabled={!ready||exporting!==null} onClick={()=>downloadTeam(team)}><Download size={15}/> GLB đội đang theo</button><a href={import.meta.env.BASE_URL+'?demo=play'}><Play size={15}/> Chơi đua</a>{embedded?<a href={fullUrl}><Maximize2 size={15}/> Toàn màn hình</a>:<a href={import.meta.env.BASE_URL+'?demo=art'}><ArrowLeft size={15}/> Xem asset</a>}</div>
  </div>
  <details className="race-source"><summary>Nguồn Maspéro & lưu ý</summary><p>Hai bờ và hai khán đài dựa trên <a href="https://www.youtube.com/watch?v=dSmHY2HSR2g&t=5338s" target="_blank" rel="noreferrer">livestream VTV10 bạn cung cấp</a>, đối chiếu ảnh Báo Sóc Trăng và SGGP. Cầu C247 theo ảnh thật khung thép xanh.</p><p>Cự ly nam 1.200 m. Đoạn hai cầu khoảng 400 m; vạch xuất phát ở xa hơn về thượng lưu. Vị trí và kích thước công trình là ước lượng. Khung cầu 30/4 theo ảnh thi công 2022; chi tiết hoàn thiện còn cần ảnh mới. Tên và thứ hạng đội theo giải nam 2025; trang phục từng đội phụ thuộc tư liệu được xác minh.</p><p>Người <a href={import.meta.env.BASE_URL+'assets/human/ATTRIBUTION.md'}>MakeHuman CC0</a>; <a href={import.meta.env.BASE_URL+'assets/audio/ATTRIBUTION.md'}>âm thanh cổ vũ CC0</a>. Nhịp 81–105 tăng dần lực chèo và nước té. Kéo để xoay, chụm hai ngón để phóng to.</p></details>
  </>}
  <span className="race-live-status" role="status">{ready?status:''}</span>
 </section>;
}

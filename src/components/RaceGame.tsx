import {useEffect,useMemo,useRef,useState} from 'react';
import {Pause,Play,Trophy,Volume2,VolumeX} from 'lucide-react';
import {createRaceGame,DIFFICULTIES,formatRaceTime} from '../race/gameplay.mjs';
import {createTournament} from '../race/tournament.mjs';
import {FESTIVAL_TEAMS,festivalTeam,shuffledFestivalIds,ROUND_LABELS} from '../race/festival-teams.mjs';
import {createRaceAudio,DEFAULT_AUDIO_MIX,normalizeAudioMix} from '../race/race-audio.mjs';
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
 const [game]=useState(createRaceGame),[tournament]=useState(makeCup);
 const [cup,setCup]=useState(()=>tournament.snapshot()),[hud,setHud]=useState(()=>game.snapshot());
 const [selected,setSelected]=useState(cup.playerId),[query,setQuery]=useState(''),[difficulty,setDifficulty]=useState('normal');
 const [panel,setPanel]=useState<'setup'|'bracket'|null>('setup'),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(true);
 const [status,setStatus]=useState('Đang tải ghe và sông đấu…'),[error,setError]=useState(''),[activeMatch,setActiveMatch]=useState(()=>tournament.currentMatch());
 const [mix,setMix]=useState(audioPreferences),[caption,setCaption]=useState(''),[audioError,setAudioError]=useState('');
 const [audio]=useState(()=>createRaceAudio({baseUrl:import.meta.env.BASE_URL,onCaption:setCaption,onError:()=>setAudioError('Chưa tải được một số âm thanh. Hãy bật lại tiếng để thử lại.')}));
 const host=useRef<HTMLDivElement>(null),runtime=useRef<any>(null),beat=useRef<HTMLDivElement>(null);
 const finished=useRef(''),resumeDrawer=useRef(false),clock=useRef({phase:0,seconds:0,last:0}),actions=useRef<any>({});
 const activeRef=useRef(activeMatch);
 const preparing=useRef(false);
 const teamOptions=useMemo(()=>FESTIVAL_TEAMS.filter(t=>(t.name+' '+t.nameVi+' '+(t.nameKm||'')).toLocaleLowerCase().includes(query.toLocaleLowerCase())),[query]);
 function persist(){const s=tournament.snapshot();setCup(s);try{localStorage.setItem(STORAGE,JSON.stringify(s));}catch{/* Gameplay works without browser storage. */}}
 function observe(s:any){
  if(!s.game)return;setHud(s.game);
  if(s.game.phase==='finished'){
   const match=tournament.currentMatch(),key=match?.matchId+'-'+s.game.runId;
   if(!preparing.current&&match&&match.matchId===activeRef.current?.matchId&&!match.blocked&&finished.current!==key){finished.current=key;tournament.finish({matchId:match.matchId,result:s.game.result});if(tournament.snapshot().status==='eliminated')tournament.resolveRemaining();persist();}
  }
 }
 const settings=useRef<any>({});settings.current={racing:true,view:'race',playing:playing&&panel===null,cadence:84,splash:true,fast:false,game,onRace:observe,
  onGameFrame:(s:any)=>{audio.update(s);if(beat.current){beat.current.style.setProperty('--beat',(((s.beatPhase+.5)%1)*100)+'%');beat.current.style.setProperty('--good',(DIFFICULTIES[s.difficulty].window*2*s.cadence/60*100)+'%');beat.current.style.setProperty('--perfect',(.2*s.cadence/60*100)+'%');}}};
 useEffect(()=>{
  let cancelled=false,stop=()=>{};const mount=host.current!;
  (async()=>{const {startBoatPreview}=await import('../race/boat-preview.mjs');if(cancelled)return;
   const match=tournament.currentMatch();settings.current.teamIds=match?[match.playerId,match.opponentId]:['tum-nup-2','prek-on-dok-2'];clock.current.last=performance.now();
   await startBoatPreview(mount,settings,clock,import.meta.env.BASE_URL,(api:any)=>{if(cancelled){api.dispose();return;}api.audio=audio;runtime.current=api;stop=api.dispose;setReady(true);},(n:number,total:number)=>{if(!cancelled)setStatus(`Đang tải mô hình ${n}/${total}…`);});
  })().catch((e:Error)=>{if(!cancelled)setStatus('Không tải được cảnh 3D: '+e.message);});
  return()=>{cancelled=true;audio.dispose();stop();runtime.current=null;};
 },[game,tournament,audio]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if(e.repeat||/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test((e.target as HTMLElement)?.tagName))return;if(e.code==='Space'||e.code==='Enter'){e.preventDefault();actions.current.stroke();}if(e.code==='Escape')actions.current.pause();};
  const visibility=()=>{if(document.hidden){audio.setActive(false);actions.current.pause(true);}};
  document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[audio]);
 useEffect(()=>{audio.setMix(mix);try{localStorage.setItem(AUDIO_STORAGE,JSON.stringify(mix));}catch{/* Audio still works without storage. */}},[audio,mix]);
 useEffect(()=>{audio.setActive(playing&&panel===null&&['racing','countdown','finished'].includes(hud.phase));},[audio,playing,panel,hud.phase]);
 function changeMix(next:any){const value=normalizeAudioMix({...mix,...next});audio.setMix(value);setMix(value);if(value.enabled){setAudioError('');void audio.unlock();}}

 function stroke(){if(panel||busy)return;game.stroke();setHud(game.snapshot());}
 function pause(onlyPause=false){if(panel||!['racing','countdown','paused'].includes(game.state.phase))return;if(game.state.phase==='paused'){if(!onlyPause){void audio.unlock();game.resume();audio.setActive(true);setPlaying(true);}}else{audio.setActive(false);game.pause(onlyPause?'Đã tạm dừng khi rời màn hình':'');setPlaying(false);}setHud(game.snapshot());}
 actions.current={stroke,pause};
 async function launch(fresh=false){
  if(!ready||preparing.current)return;void audio.unlock();audio.setActive(false);preparing.current=true;activeRef.current=null;setBusy(true);setError('');
  try{
   let match=tournament.currentMatch();
   if(fresh||selected!==tournament.snapshot().playerId||!match){const n=seed();tournament.reset({playerId:selected,seed:n,teamIds:shuffledFestivalIds(n)});match=tournament.currentMatch();}
   if(match.blocked){tournament.retryTie();match=tournament.currentMatch();}
   await runtime.current.setTeams([match.playerId,match.opponentId]);runtime.current.reset();audio.beginMatch([festivalTeam(match.playerId),festivalTeam(match.opponentId)]);audio.setActive(true);game.start(difficulty);finished.current='';activeRef.current=match;setActiveMatch(match);persist();setHud(game.snapshot());setPanel(null);setPlaying(true);
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{preparing.current=false;setBusy(false);}
 }
 function bracket(){resumeDrawer.current=['racing','countdown'].includes(game.state.phase);if(resumeDrawer.current){audio.setActive(false);game.pause();setPlaying(false);}setPanel('bracket');setHud(game.snapshot());}
 function closeBracket(){setPanel(game.state.phase==='ready'?'setup':null);if(resumeDrawer.current){void audio.unlock();game.resume();audio.setActive(true);setPlaying(true);setHud(game.snapshot());}}
 const done=hud.phase==='finished',live=['countdown','racing','paused'].includes(hud.phase),player=festivalTeam(activeMatch?.playerId||selected),opponent=festivalTeam(activeMatch?.opponentId||'prek-on-dok-2');
 const round=ROUND_LABELS[activeMatch?.round]||'Cúp lễ hội',champion=cup.champion?festivalTeam(cup.champion):null;
 return <section className="race-game" data-testid="festival-game">
  <header className="game-heading"><div><span>GHE NGO · CÚP LỄ HỘI</span><h1>{round} <small>61 ghe · 1.200 m</small></h1></div><div className="game-heading-actions"><button onClick={bracket}><Trophy size={17}/> Nhánh đấu</button><button onClick={()=>changeMix({enabled:!mix.enabled})} aria-label={mix.enabled?'Tắt âm thanh':'Bật âm thanh'}>{mix.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><details className="game-audio-options"><summary aria-label="Tùy chỉnh âm thanh">Âm thanh</summary><div><b>Không khí cuộc đua</b>{[['voice','Bình luận tiếng Việt'],['chants','Câu hò Khmer'],['drums','Trống nhịp chèo'],['crowd','Tiếng khán giả']].map(([key,label])=><label key={key}><input type="checkbox" checked={(mix as any)[key]} onChange={e=>changeMix({[key]:e.target.checked})}/>{label}</label>)}<label>Âm lượng <input aria-label="Âm lượng" type="range" min="0" max="1" step=".05" value={mix.volume} onChange={e=>changeMix({volume:Number(e.target.value)})}/></label>{audioError&&<p role="status">{audioError}</p>}</div></details><button onClick={onInspect}>Xem mô hình</button></div></header>
  <div className="game-score" aria-label="Tiến độ trận đua">
   {[player,opponent].map((team,i)=><div key={i}><span className="team-dot" style={{background:team.jersey}}/><span>{i===0?'Bạn · ':''}{team.name}</span><strong>{Math.floor(hud.distances[i])} m</strong><progress max="1200" value={hud.distances[i]}/></div>)}
   <span className="game-phase">{hud.phase==='countdown'?`Xuất phát sau ${Math.ceil(hud.countdown)}…`:hud.phase==='paused'?'Tạm dừng':hud.phase==='ready'?'Sẵn sàng':hud.stageLabel}</span>
  </div>
  <div className="game-stage"><div className="game-canvas" ref={host} data-testid="art-stage" aria-busy={!ready}/>
   {!ready&&<div className="game-loading" role="status">{status}</div>}
   {panel==='setup'&&<section className="game-dialog game-setup" aria-label="Chọn ghe và bắt đầu giải">
    <div><span className="game-eyebrow">CHỌN GHE CỦA BẠN</span><h2>Đưa ghe về đích</h2><p>Chạm <b>CHÈO</b> khi vạch vào giữa vùng sáng. Giữ sức ở đường trường; tích lực để <b>ĐẠP</b> trong 250 m cuối.</p><p>Cúp game có đủ 61 ghe, đua từng cặp và loại trực tiếp. Ba ghe được miễn vòng đầu. Kết quả do bạn chơi, không theo thứ hạng thật.</p><label>Tìm ghe<input aria-label="Tìm ghe" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên tiếng Việt hoặc Khmer"/></label><label>Đội ghe ({teamOptions.length}/61)<select aria-label="Chọn đội ghe" value={selected} onChange={e=>setSelected(e.target.value)} size={4}>{teamOptions.map(t=><option key={t.id} value={t.id}>{t.nameVi}{t.nameKm?' · '+t.nameKm:''}</option>)}</select></label></div>
    <div className="game-setup-options"><p><b>{festivalTeam(selected).nameVi}</b><br/><span lang="km">{festivalTeam(selected).nameKm||'Tên Khmer chưa xác minh'} {festivalTeam(selected).teamNumberKm}</span></p><p className="game-note">{festivalTeam(selected).appearance==='reference'?'Màu và hoa văn có tư liệu tham khảo.':'Trang phục và hoa văn mẫu trong game; chưa xác minh bộ màu thật.'} Các ghe dùng chung bộ VĐV hiện tại.</p><label>Độ khó<select aria-label="Độ khó" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{Object.entries(DIFFICULTIES).map(([id,v]:any)=><option key={id} value={id}>{v.label}</option>)}</select></label><button className="game-primary" disabled={!ready||busy} onClick={()=>launch()}>{busy?'Đang chuẩn bị…':cup.history.length&&cup.playerId===selected&&tournament.currentMatch()?'Tiếp tục giải':'Bắt đầu cúp 61 ghe'}</button>{cup.history.length>0&&<button disabled={!ready||busy} onClick={()=>launch(true)}>Bốc thăm giải mới</button>}<p className="game-note">Chơi bằng chạm hoặc phím Space. Nhánh đấu được lưu trên trình duyệt này.</p>{error&&<p role="alert">{error}</p>}</div>
   </section>}
   {panel==='bracket'&&<section className="game-dialog game-bracket" aria-label="Nhánh đấu 61 ghe"><header><h2>Nhánh đấu · 61 ghe</h2><button onClick={closeBracket}>Đóng nhánh đấu</button></header>{champion&&<p>Vô địch: <b>{champion.name}</b></p>}<p className="game-note">Các trận khác được mô phỏng theo bốc thăm; không dùng thứ hạng lịch sử để quyết định thắng thua.</p><div className="bracket-rounds">{cup.bracket.map((r:any,ri:number)=><section key={ri}><h3>{ROUND_LABELS[r.round]}</h3>{r.matches.map((m:any)=><div className={'bracket-match'+(m.teams.includes(cup.playerId)?' your-match':'')} key={m.id}>{m.teams.map((id:string)=><span className={m.winner===id?'bracket-winner':''} key={id}>{festivalTeam(id).name}{m.winner===id?' ✓':''}</span>)}{m.result==='bye'&&<small>Miễn vòng đầu</small>}{m.result==='tie'&&<small>Hòa · đua lại</small>}</div>)}</section>)}</div></section>}
   {done&&panel===null&&<section className="game-dialog game-result" aria-label="Kết quả trận đua"><span className="game-eyebrow">{round}</span><h2>{cup.status==='champion'?'Bạn đã vô địch!':hud.result==='win'?'Thắng lượt đua!':hud.result==='tie'?'Hai ghe hòa nhau':hud.result==='dnf'?'Chưa hoàn thành cự ly':'Ghe bạn dừng bước'}</h2><p>{player.name}: <b>{formatRaceTime(hud.finishTimes[0])}</b> · {opponent.name}: <b>{formatRaceTime(hud.finishTimes[1])}</b></p><p>Chuẩn {hud.perfect} · Đúng {hud.good} · Lỡ {hud.missed} · Chuỗi tốt nhất {hud.maxCombo}</p>{champion&&<p>Đội vô địch giải: <b>{champion.name}</b></p>}{['ready','tie'].includes(cup.status)?<button className="game-primary" disabled={busy} onClick={()=>launch()}>{hud.result==='tie'?'Đua lại lượt hòa':'Đua vòng tiếp theo'}</button>:<button className="game-primary" onClick={()=>{game.reset();setHud(game.snapshot());setPanel('setup');}}>Chọn ghe · chơi giải mới</button>}<button onClick={bracket}>Xem toàn bộ nhánh đấu</button>{error&&<p role="alert">{error}</p>}</section>}
  </div>
  <footer className="game-controls">
   <p className="game-commentary" aria-live="polite" aria-atomic="true">{caption|| (mix.enabled?'Bình luận Việt · hò Khmer · trống theo nhịp chèo':'Đã tắt âm thanh')}</p>
   <div className="game-rhythm"><div className="rhythm-track" ref={beat} aria-label="Nhịp chèo: chạm khi vạch vào giữa vùng sáng"><i className="rhythm-good"/><i className="rhythm-perfect"/><i className="rhythm-centre"/><i className="rhythm-marker"/></div><span className={'game-feedback '+(hud.judgement||'')} role="status">{hud.phase==='countdown'?'Chuẩn bị nhịp đầu':hud.phase==='paused'?'Nhấn tiếp tục để chèo':hud.feedback}</span></div>
   <div className="game-inputs"><button className="game-stroke" disabled={!live||hud.phase!=='racing'||!!panel||busy} onClick={stroke}>CHÈO <small>Space / chạm</small></button><div className="game-paces" aria-label="Cách chèo">{[['recover','Giữ sức'],['steady','Đều nhịp'],['sprint','Nước rút']].map(([id,label])=><button key={id} aria-pressed={hud.pace===id} disabled={!live||!!panel} onClick={()=>{game.setPace(id);setHud(game.snapshot());}}>{label}</button>)}</div><button className="game-surge" disabled={!hud.canSurge||!!panel} onClick={()=>{game.surge();setHud(game.snapshot());}}>ĐẠP!<small>{hud.raceStage==='final'?`${Math.round(hud.surgeCharge*100)}% lực`:'Mở ở 950 m'}</small></button><button className="game-pause" disabled={!live||!!panel} onClick={()=>pause()} aria-label={hud.phase==='paused'?'Tiếp tục cuộc đua':'Tạm dừng cuộc đua'}>{hud.phase==='paused'?<Play size={18}/>:<Pause size={18}/>}</button><div className="game-stamina"><label>Sức <b>{Math.round(hud.stamina)}%</b><progress aria-label="Sức bền" max="100" value={hud.stamina}/></label><label>Lực đạp <b>{Math.round(hud.surgeCharge*100)}%</b><progress aria-label="Lực đạp" max="1" value={hud.surgeCharge}/></label></div></div>
  </footer>
 </section>;
}

import React,{useEffect,useRef} from 'react';
import {Pause,Play,RotateCcw,Trophy,Waves,Volume2,VolumeX} from 'lucide-react';
import {DIFFICULTIES,PACES,formatRaceTime,RACE_LENGTH} from '../race/gameplay.mjs';
import './RaceGameControls.css';

type Props={playerName:string;opponentName:string;teamSelectors:React.ReactNode;ready:boolean;status:string;game:any;bestTimes:Record<string,number>;recordsPersisted:boolean;sound:boolean;lowPower:boolean;camera:string;onStart:(difficulty?:string)=>void;onStroke:()=>void;onSurge:()=>void;onPace:(pace:string)=>void;onPause:()=>void;onResume:()=>void;onMenu:()=>void;onSound:()=>void;onQuality:()=>void;onCamera:(camera:any)=>void;};
export function RaceGameControls(p:Props){
 const {game:g}=p,heading=useRef<HTMLHeadingElement>(null),strokeButton=useRef<HTMLButtonElement>(null);
 const [difficulty,setDifficulty]=React.useState(g.difficulty);
 useEffect(()=>{if(g.phase==='finished'||g.phase==='paused')heading.current?.focus();if(g.phase==='racing')strokeButton.current?.focus({preventScroll:true});},[g.phase]);
 const active=['racing','countdown'].includes(g.phase),staminaLow=g.stamina<24;
 const goodWidth=DIFFICULTIES[g.difficulty].window*g.cadence/60*200,perfectWidth=.1*g.cadence/60*200;
 const options=<details className="game-options"><summary>Góc nhìn & âm thanh</summary><div className="game-camera" aria-label="Góc nhìn cuộc đua">{[['follow','Theo ghe'],['overview','Hai ghe'],['crew','VĐV']].map(([key,label])=><button key={key} aria-pressed={p.camera===key} onClick={()=>p.onCamera(key)}>{label}</button>)}</div><div className="game-settings"><button onClick={p.onSound} aria-pressed={p.sound}>{p.sound?<Volume2 size={17} aria-hidden="true"/>:<VolumeX size={17} aria-hidden="true"/>}{p.sound?'Tắt':'Bật'} tiếng cổ vũ</button><button onClick={p.onQuality} aria-pressed={p.lowPower}>Tiết kiệm pin</button></div></details>;
 return <>
  <div className="game-hud" data-testid="game-hud">
   <div className="game-heading"><span>ĐUA GHE NGO · MASPÉRO</span><strong>{p.playerName}</strong><small>{DIFFICULTIES[g.difficulty].label} · 1.200 m</small></div>
   <div className="game-time"><b>{formatRaceTime(g.elapsed)}</b>{active&&<button onClick={p.onPause} aria-label="Tạm dừng cuộc đua"><Pause size={20} aria-hidden="true"/></button>}</div>
   {g.phase!=='ready'&&<div className="game-progress" aria-label="Tiến độ hai đội">
    <div><span>Bạn · {p.playerName}</span><progress aria-label={'Cự ly '+p.playerName} max={RACE_LENGTH} value={g.distances[0]}/><b>{Math.floor(g.distances[0])} m</b></div>
    <div><span>{p.opponentName}</span><progress aria-label={'Cự ly '+p.opponentName} max={RACE_LENGTH} value={g.distances[1]}/><b>{Math.floor(g.distances[1])} m</b></div>
    <p>{g.phase==='countdown'?'Hai ghe vào vạch xuất phát':g.gap>.2?`Đang dẫn ${g.gap.toFixed(1)} m`:g.gap<-.2?`Đang sau ${Math.abs(g.gap).toFixed(1)} m`:'Hai ghe ngang nhau'}<span>{Math.max(0,Math.ceil(RACE_LENGTH-g.distances[0]))} m còn lại</span></p>
   </div>}
  </div>
  {g.phase==='ready'&&<div className="game-overlay"><section className="game-card" aria-label="Chuẩn bị cuộc đua">
   <Waves size={28} aria-hidden="true"/><h1>Vào nhịp. Về đích.</h1><p>Đưa {p.playerName} vượt {p.opponentName} trên đường đua 1.200 m.</p>{p.teamSelectors}
   <ol><li>Chạm <b>Chèo</b> khi vạch vào vùng sáng.</li><li>Giữ nhịp đều để ghe tăng tốc.</li><li>Dùng <b>Giữ sức</b> hồi thể lực; dành <b>Nước rút</b> cho đoạn cuối.</li></ol>
   <fieldset><legend>Độ khó</legend><div className="game-difficulty">{Object.entries(DIFFICULTIES).map(([key,value]:[string,any])=><button key={key} aria-pressed={difficulty===key} onClick={()=>setDifficulty(key)}>{value.label}</button>)}</div></fieldset>
   <p className="game-best">Kỷ lục thắng của bạn: <b>{formatRaceTime(p.bestTimes[difficulty])}</b></p>
   <button className="game-primary" disabled={!p.ready} onClick={()=>p.onStart(difficulty)}><Play size={20} aria-hidden="true"/>{p.ready?'Bắt đầu đua':'Đang tải ghe…'}</button>
   {!p.ready&&<p role="status">{p.status}</p>}
   <small>Khoảng 3–4 phút · Chạm hoặc phím Space / Enter</small>{options}
   <a href={import.meta.env.BASE_URL+'?demo=studio'}>Xem cảnh & kiểm tra asset</a>
  </section></div>}
  {g.phase==='countdown'&&<div className="game-countdown" role="status"><b>{Math.ceil(g.countdown)}</b><span>Chuẩn bị bắt nhịp</span></div>}
  {g.phase==='racing'&&<div className="game-paddle-panel">
   <div className="game-stage-label"><strong>{g.stageLabel}</strong><span>0–200 · 200–950 · 950–1.200 m</span><b>{Math.round(g.cadence)} nhịp/phút</b></div><div className="game-endurance"><label htmlFor="game-stamina">Thể lực <b>{Math.round(g.stamina)}%</b></label><meter id="game-stamina" min="0" max="100" low="24" high="70" optimum="100" value={g.stamina}/><span>{staminaLow?'Mệt — chuyển Giữ sức':g.distances[0]>1000?'Đoạn cuối — chọn lúc nước rút':'Giữ nhịp, giữ sức'}</span></div>
   <div className="game-pace" aria-label="Chiến thuật chèo">{Object.entries(PACES).map(([key,value]:[string,any])=><button key={key} aria-pressed={g.pace===key} onClick={()=>p.onPace(key)}>{value.label}<small>{g.cadence-(g.pace==='recover'?-12:g.pace==='sprint'?18:0)+(key==='recover'?-12:key==='sprint'?18:0)} nhịp/phút</small></button>)}</div>
   <div className="game-rhythm" aria-hidden="true"><div className="game-good-zone" style={{left:`${50-goodWidth/2}%`,width:`${goodWidth}%`}}/><div className="game-perfect-zone" style={{left:`${50-perfectWidth/2}%`,width:`${perfectWidth}%`}}/><i style={{transform:`translateX(${g.rhythmProgress*100}cqw) translateX(-50%)`}}/><span>VÙNG CHẠM</span></div>
   <div className="game-feedback"><span aria-live="polite" data-quality={g.judgement}>{g.judgement&&!g.feedback.startsWith(g.judgement)&&<strong>{g.judgement} · </strong>}{g.feedback}</span><b>Chuỗi {g.combo} · Đúng {g.accuracy}%</b></div>
   <button ref={strokeButton} className="game-stroke" disabled={g.finishTimes[0]!=null} onPointerDown={e=>{if(e.button===0)p.onStroke();}} onClick={e=>{if(e.detail===0)p.onStroke();}}><Waves size={26} aria-hidden="true"/>{g.finishTimes[0]!=null?'Đã về đích · chờ đội máy':'CHÈO'}</button>
   <div className="game-charge"><label htmlFor="game-charge">Tích lực <b>{Math.round(g.surgeCharge*100)}%</b></label><meter id="game-charge" min="0" max="100" value={g.surgeCharge*100}/><button onClick={p.onSurge} disabled={!g.canSurge} aria-pressed={!!g.surgeActive}>{g.surgeActive?`Đang đạp · ${Math.ceil(g.surgeRemaining)}s`:'Đạp'}</button></div>
   {options}
  </div>}
  {g.phase==='paused'&&<div className="game-overlay"><section className="game-card" aria-label="Cuộc đua tạm dừng"><h2 ref={heading} tabIndex={-1}>Tạm dừng</h2><p>{g.pauseReason||'Thời gian và hai ghe đã dừng.'}</p>{p.teamSelectors}<button className="game-primary" onClick={p.onResume}><Play size={20} aria-hidden="true"/>Tiếp tục đua</button><button onClick={()=>p.onStart()}><RotateCcw size={18} aria-hidden="true"/>Đua lại</button><button onClick={p.onMenu}>Về màn hình đầu</button>{options}</section></div>}
  {g.phase==='finished'&&<div className="game-overlay"><section className="game-card game-result" aria-label="Kết quả cuộc đua" data-testid="race-result">
   <Trophy size={32} aria-hidden="true"/><h2 ref={heading} tabIndex={-1}>{g.result==='win'?p.playerName+' thắng!':g.result==='tie'?'Hai ghe hòa nhau':g.result==='dnf'?'Chưa hoàn thành cự ly':p.opponentName+' về trước'}</h2>
   <p>{g.result==='win'?'Giữ nhịp tốt, về đích trước đối thủ.':g.result==='dnf'?'Cuộc đua kết thúc 40 giây sau đội máy hoặc khi hết 6 phút.':'Thử giữ nhịp đều và dành thể lực cho 200 m cuối.'}</p>
   <div className="game-result-times"><div><span>{p.playerName}</span><b>{g.finishTimes[0]==null?'Chưa về đích':formatRaceTime(g.finishTimes[0])}</b></div><div><span>{p.opponentName}</span><b>{g.finishTimes[1]==null?'Chưa về đích':formatRaceTime(g.finishTimes[1])}</b></div></div>
   <dl><div><dt>Đúng nhịp</dt><dd>{g.accuracy}%</dd></div><div><dt>Chuỗi tốt nhất</dt><dd>{g.maxCombo}</dd></div><div><dt>Nhịp chuẩn</dt><dd>{g.perfect}</dd></div><div><dt>Lỡ nhịp</dt><dd>{g.missed}</dd></div></dl>
   <p className="game-best">Kỷ lục thắng: <b>{formatRaceTime(p.bestTimes[g.difficulty])}</b><small>{p.recordsPersisted?'Lưu trên trình duyệt này':'Lưu trong phiên chơi này'}</small></p>
   <button className="game-primary" onClick={()=>p.onStart()}><RotateCcw size={20} aria-hidden="true"/>Đua lại</button><button onClick={p.onMenu}>Chọn độ khó</button>
  </section></div>}
 </>;
}

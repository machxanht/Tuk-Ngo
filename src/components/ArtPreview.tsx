import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, Camera, Download, Pause, Play, RotateCcw, Video} from 'lucide-react';
import {startIllustratedPreview, startModelPreview} from '../race/art-preview.mjs';
import {startAthleteStudy} from '../race/athlete-study-preview.mjs';
import './ArtPreview.css';

export function ArtPreview({embedded=false}:{embedded?:boolean}) {
 const host=useRef<HTMLDivElement>(null), runtime=useRef<any>(null);
 const [mode,setMode]=useState<'illustrated'|'model'|'athlete'>('athlete');
 const [view,setView]=useState<'boat'|'crew'|'front'|'side'|'back'|'paddle'>('front');
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [cadence,setCadence]=useState(48),[splash,setSplash]=useState(true);
 const [inspectedPhase,setInspectedPhase]=useState(28);
 const [status,setStatus]=useState('Đang tải ghe…'),[ready,setReady]=useState(false);
 const [recording,setRecording]=useState(false),[recordError,setRecordError]=useState('');
 const clock=useRef({phase:.28,seconds:0,last:0});
 const settings=useRef({view,playing,cadence,splash});settings.current={view,playing,cadence,splash};
 useEffect(()=>{
  let cancelled=false,stop=()=>{};
  setReady(false);setStatus(mode==='illustrated'?'Đang mở bản minh họa…':'Đang tải mô hình 3D…');
  const mount=host.current!;
  const start=mode==='athlete'?startAthleteStudy:mode==='illustrated'?startIllustratedPreview:startModelPreview;
  clock.current.last=performance.now();
  start(mount,settings,clock,import.meta.env.BASE_URL,(instance:any)=>{
   if(cancelled){instance.dispose();return;}
   runtime.current=instance;stop=instance.dispose;setReady(true);
  }).catch((e:Error)=>{if(!cancelled)setStatus('Không tải được bản thử. '+e.message);});
  return()=>{cancelled=true;stop();runtime.current=null;};
 },[mode]);
 function changeMode(next:'illustrated'|'model'|'athlete'){setMode(next);setView(next==='athlete'?'front':'boat');}
 function reset(){clock.current.phase=.28;clock.current.seconds=0;setInspectedPhase(28);runtime.current?.reset();}
 function togglePlaying(){if(playing)setInspectedPhase(Math.round(clock.current.phase*100));setPlaying(!playing);}
 function inspectPhase(value:number){setPlaying(false);setInspectedPhase(value);clock.current.phase=value/100;runtime.current?.reset();}
 function capture(){runtime.current?.capture();}
 async function record(){setRecordError('');setRecording(true);setPlaying(true);try{await runtime.current?.record();}catch(e){setRecordError(e instanceof Error?e.message:String(e));}finally{setRecording(false);}}
 return <section className={'art-preview'+(embedded?' art-embedded':'')+(mode==='athlete'?' art-athlete-study':'')}>
  <div className="art-canvas" ref={host} data-testid="art-stage" />
  <header className="art-heading"><div><span className="art-kicker">GHE NGO · XEM ASSET</span><h1>{mode==='athlete'?'VĐV Tum Núp 2':'Nhịp chèo trên sông'}</h1><p>{mode==='athlete'?'Một VĐV trên đoạn ghe · kéo để xoay':mode==='illustrated'?'2D thử nghiệm · bản cũ để đối chiếu':'Ghe 3D · người ngồi/đứng và các vai trò'}</p></div><nav className="art-header-links"><a className="art-back" href={import.meta.env.BASE_URL+'?demo=studio'}>Hai ghe & NPC</a><a className="art-back" href={import.meta.env.BASE_URL+'?demo=play'} aria-label="Mở game"><ArrowLeft size={18}/> Chơi game</a></nav></header>
  <div className="art-view-controls" aria-label="Chọn hình ảnh">
   <div className="art-segment" aria-label="Cách dựng hình"><button disabled={recording} aria-pressed={mode==='athlete'} onClick={()=>changeMode('athlete')}>VĐV từ Blender</button><button disabled={recording} aria-pressed={mode==='model'} onClick={()=>changeMode('model')}>Toàn ghe mới</button><button disabled={recording} aria-pressed={mode==='illustrated'} onClick={()=>changeMode('illustrated')}>2D cũ</button></div>
   <div className="art-segment" aria-label="Góc nhìn">{mode==='athlete'?(['front','side','back','paddle'] as const).map((v,i)=><button key={v} disabled={recording} aria-pressed={view===v} onClick={()=>setView(v)}>{['Trước','Ngang','Sau','Dằm'][i]}</button>):<><button disabled={recording} aria-pressed={view==='boat'} onClick={()=>setView('boat')}>Toàn ghe</button><button disabled={recording} aria-pressed={view==='crew'} onClick={()=>setView('crew')}>Cận VĐV</button></>}</div>
  </div>
  {!ready&&<div className="art-loading" role="status">{status}</div>}
  <footer className="art-controls">
   <div className="art-control-main"><button className="art-play" disabled={!ready} onClick={togglePlaying}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':'Chèo'}</button><button onClick={reset} aria-label="Xem lại chu kỳ chèo"><RotateCcw size={18}/></button><label className="art-cadence">Nhịp chèo <input aria-label="Nhịp chèo mỗi phút" type="range" min="30" max="96" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}<small>/phút</small></strong></label>{mode!=='athlete'&&<label className="art-water"><input type="checkbox" checked={splash} onChange={e=>setSplash(e.target.checked)}/> Nước té</label>}</div>
   <div className="art-control-links"><span>{mode==='athlete'?'VĐV · nguồn Blender':mode==='illustrated'?'2D · thử nghiệm chưa được duyệt':'3D · toàn ghe'}</span><button disabled={!ready} onClick={capture}><Camera size={16}/> Chụp ảnh</button><button disabled={!ready||recording} onClick={record}><Video size={16}/> {recording?'Đang ghi…':'Clip 10s'}</button><a href={import.meta.env.BASE_URL+(mode==='athlete'?'assets/athlete-master/athlete-master.glb':'assets/ghe-ngo/ghe-ngo-crew-v18.glb')} download><Download size={16}/> {mode==='athlete'?'GLB một VĐV':'GLB toàn ghe'}</a>{embedded&&<a href={import.meta.env.BASE_URL+'?demo=art'}>Mở bản tablet</a>}</div>
   <details className="art-pose-inspector"><summary>Xem từng pha chèo</summary><label className="art-cadence">Chu kỳ <input aria-label="Xem từng pha chèo" disabled={!ready||recording} type="range" min="0" max="100" step="1" value={inspectedPhase} onChange={e=>inspectPhase(Number(e.target.value))}/><strong>{inspectedPhase}%</strong></label></details>
   {(recording||recordError)&&<p role="status">{recording?'Đang ghi 10 giây. Clip sẽ được tải khi xong.':recordError}</p>}
  </footer>
  <details className="art-evidence"><summary>Nguồn ảnh và video thật</summary><p>Trang phục và dằm đối chiếu ảnh Duy Tân, Thanh Niên ngày 15/11/2024. Nhóm ngồi phía trước, nhóm đứng phía sau và các vai trò điều khiển đối chiếu video Báo Sóc Trăng. Chữ sau áo កូនខ្មែរ theo yêu cầu của chủ dự án, không sao chép logo tài trợ lịch sử. Cơ thể MakeHuman/MPFB CC0; kích thước và chuyển động được dựng theo tư liệu, chưa phải quét người thật hoặc motion capture.</p><p><a href="https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm" target="_blank" rel="noreferrer">Ảnh trang phục và dằm 2024</a> · <a href="https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/" target="_blank" rel="noreferrer">Video thi đấu</a> · <a href={import.meta.env.BASE_URL+'assets/human/ATTRIBUTION.md'}>Nguồn model 3D</a></p></details>
 </section>;
}

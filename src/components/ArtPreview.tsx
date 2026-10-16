import {useEffect, useRef, useState} from 'react';
import {Camera, Download, Pause, Play, RotateCcw, Video} from 'lucide-react';
import './ArtPreview.css';

type Mode = 'boat' | 'athlete';
export function ArtPreview({embedded=false}:{embedded?:boolean}) {
 const host=useRef<HTMLDivElement>(null),runtime=useRef<any>(null);
 const [mode,setMode]=useState<Mode>('boat'),[view,setView]=useState('boat');
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [cadence,setCadence]=useState(64),[splash,setSplash]=useState(true);
 const [inspectedPhase,setInspectedPhase]=useState(28),[status,setStatus]=useState('Đang tải ghe 3D…');
 const [ready,setReady]=useState(false),[recording,setRecording]=useState(false),[recordError,setRecordError]=useState('');
 const clock=useRef({phase:.28,seconds:0,last:0});
 const settings=useRef({view,playing,cadence,splash});settings.current={view,playing,cadence,splash};
 useEffect(()=>{
  let cancelled=false,stop=()=>{};const mount=host.current!;
  setReady(false);setStatus(mode==='boat'?'Đang tải ghe và 8 bộ động tác…':'Đang tải VĐV từ Blender…');
  (async()=>{
   const start=mode==='boat'?(await import('../race/boat-preview.mjs')).startBoatPreview:(await import('../race/athlete-study-preview.mjs')).startAthleteStudy;
   if(cancelled)return;
   clock.current.last=performance.now();
   await start(mount,settings,clock,import.meta.env.BASE_URL,(instance:any)=>{
    if(cancelled){instance.dispose();return;}
    runtime.current=instance;stop=instance.dispose;setReady(true);
   },(loaded:number,total:number)=>{if(!cancelled)setStatus(`Đang tải mô hình ${loaded}/${total}…`);});
  })().catch((e:Error)=>{if(!cancelled)setStatus('Không tải được mô hình. '+e.message);});
  return()=>{cancelled=true;stop();runtime.current=null;};
 },[mode]);
 function changeMode(next:Mode){if(next===mode)return;setMode(next);setView(next==='athlete'?'front':'boat');}
 function reset(){clock.current.phase=.28;clock.current.seconds=0;setInspectedPhase(28);runtime.current?.reset();}
 function togglePlaying(){if(playing)setInspectedPhase(Math.round(clock.current.phase*100));setPlaying(!playing);}
 function inspectPhase(value:number){setPlaying(false);setInspectedPhase(value);clock.current.phase=value/100;}
 async function record(){setRecordError('');setRecording(true);setPlaying(true);try{await runtime.current?.record();}catch(e){setRecordError(e instanceof Error?e.message:String(e));}finally{setRecording(false);}}
 const views=mode==='athlete'?[['front','Trước'],['side','Ngang'],['back','Sau'],['paddle','Dằm']]:[['boat','Toàn ghe'],['crew','Cận tay bơi'],['bow','Đầu ghe'],['stern','Lái cuối ghe']];
 return <section className={'art-preview'+(embedded?' art-embedded':'')}>
  <header className="art-heading"><div><span className="art-kicker">GHE NGO · 3D</span><h1>{mode==='boat'?'Ghe Tum Núp 2 · 55 người':'VĐV Tum Núp 2'}</h1><p>Kéo để xoay · chụm hai ngón để phóng to</p></div><a className="art-back" href={import.meta.env.BASE_URL+'assets/illustrated-v22/race.html?mode=cup'}>Giải 8 ghe</a></header>
  <nav className="art-view-controls" aria-label="Chọn hình ảnh">
   <div className="art-segment" aria-label="Mô hình"><button disabled={recording} aria-pressed={mode==='boat'} onClick={()=>changeMode('boat')}>Cả ghe 3D</button><button disabled={recording} aria-pressed={mode==='athlete'} onClick={()=>changeMode('athlete')}>Một VĐV</button></div>
   <div className="art-segment" aria-label="Góc nhìn">{views.map(([v,label])=><button key={v} disabled={recording} aria-pressed={view===v} onClick={()=>setView(v)}>{label}</button>)}</div>
  </nav>
  <div className="art-canvas" ref={host} data-testid="art-stage" aria-busy={!ready}>{!ready&&<div className="art-loading" role="status">{status}</div>}</div>
  <footer className="art-controls">
   <div className="art-control-main"><button className="art-play" disabled={!ready} onClick={togglePlaying}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':'Chèo'}</button><button onClick={reset} aria-label="Xem lại chu kỳ chèo"><RotateCcw size={18}/></button><label className="art-cadence">Nhịp chèo <input aria-label="Nhịp chèo mỗi phút" type="range" min="30" max="96" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}<small>/phút</small></strong></label>{mode==='boat'&&<label className="art-water"><input type="checkbox" checked={splash} onChange={e=>setSplash(e.target.checked)}/> Nước té</label>}</div>
   <details className="art-tools"><summary>Kiểm tra pha chèo · tải asset · nguồn tham khảo</summary><div className="art-tool-content">
    <label className="art-cadence">Chu kỳ <input aria-label="Xem từng pha chèo" disabled={!ready||recording} type="range" min="0" max="100" step="1" value={inspectedPhase} onChange={e=>inspectPhase(Number(e.target.value))}/><strong>{inspectedPhase}%</strong></label>
    <div className="art-control-links"><button disabled={!ready} onClick={()=>runtime.current?.capture()}><Camera size={16}/> Chụp ảnh</button><button disabled={!ready||recording} onClick={record}><Video size={16}/> {recording?'Đang ghi…':'Clip 10s'}</button><a href={import.meta.env.BASE_URL+'assets/athlete-master/athlete-master.glb'} download><Download size={16}/> GLB VĐV</a></div>
    <p>Ghe dùng chung 8 bộ động tác với bản đua. VĐV đơn giữ nguyên track gốc khi xuất GLB, gồm cả áo và dằm. Nón, tóc và dằm dựng trong Blender; cơ thể MakeHuman/MPFB CC0. Đây là bản xem asset trên nước, chưa phải đường đua đầy đủ.</p>
    <p><a href="https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm" target="_blank" rel="noreferrer">Ảnh trang phục và dằm</a> · <a href="https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/" target="_blank" rel="noreferrer">Video thi đấu</a></p>
   </div></details>
   {(recording||recordError)&&<p role="status">{recording?'Đang ghi 10 giây…':recordError}</p>}
  </footer>
 </section>;
}

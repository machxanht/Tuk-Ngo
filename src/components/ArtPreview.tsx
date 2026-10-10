import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, Camera, Download, Pause, Play, RotateCcw, Video} from 'lucide-react';
import {startIllustratedPreview, startModelPreview} from '../race/art-preview.mjs';
import './ArtPreview.css';

export function ArtPreview({embedded=false}:{embedded?:boolean}) {
 const host=useRef<HTMLDivElement>(null), runtime=useRef<any>(null);
 const [mode,setMode]=useState<'illustrated'|'model'>('model');
 const [view,setView]=useState<'boat'|'crew'>('boat');
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [cadence,setCadence]=useState(72),[splash,setSplash]=useState(true);
 const [inspectedPhase,setInspectedPhase]=useState(28);
 const [status,setStatus]=useState('Đang tải ghe…'),[ready,setReady]=useState(false);
 const [recording,setRecording]=useState(false),[recordError,setRecordError]=useState('');
 const clock=useRef({phase:.28,seconds:0,last:0});
 const settings=useRef({view,playing,cadence,splash});settings.current={view,playing,cadence,splash};
 useEffect(()=>{
  let cancelled=false,stop=()=>{};
  setReady(false);setStatus(mode==='illustrated'?'Đang mở bản minh họa…':'Đang tải mô hình 3D…');
  const mount=host.current!;
  const start=mode==='illustrated'?startIllustratedPreview:startModelPreview;
  clock.current.last=performance.now();
  start(mount,settings,clock,import.meta.env.BASE_URL,(instance:any)=>{
   if(cancelled){instance.dispose();return;}
   runtime.current=instance;stop=instance.dispose;setReady(true);
  }).catch((e:Error)=>{if(!cancelled)setStatus('Không tải được bản thử. '+e.message);});
  return()=>{cancelled=true;stop();runtime.current=null;};
 },[mode]);
 function reset(){clock.current.phase=.28;clock.current.seconds=0;setInspectedPhase(28);runtime.current?.reset();}
 function togglePlaying(){if(playing)setInspectedPhase(Math.round(clock.current.phase*100));setPlaying(!playing);}
 function inspectPhase(value:number){setPlaying(false);setInspectedPhase(value);clock.current.phase=value/100;runtime.current?.reset();}
 function capture(){runtime.current?.capture();}
 async function record(){setRecordError('');setRecording(true);setPlaying(true);try{await runtime.current?.record();}catch(e){setRecordError(e instanceof Error?e.message:String(e));}finally{setRecording(false);}}
 return <section className={'art-preview'+(embedded?' art-embedded':'')}>
  <div className="art-canvas" ref={host} data-testid="art-stage" />
  <header className="art-heading"><div><span className="art-kicker">GHE NGO · BẢN THỬ CHUYỂN ĐỘNG</span><h1>Nhịp chèo trên sông</h1><p>{mode==='illustrated'?'2D thử nghiệm · bản cũ để đối chiếu':'Ghe 3D · chuyển động chèo V6'}</p></div><a className="art-back" href={import.meta.env.BASE_URL} aria-label="Mở hồ sơ tham chiếu"><ArrowLeft size={18}/> Hồ sơ</a></header>
  <div className="art-view-controls" aria-label="Chọn hình ảnh">
   <div className="art-segment" aria-label="Cách dựng hình"><button disabled={recording} aria-pressed={mode==='model'} onClick={()=>setMode('model')}>3D</button><button disabled={recording} aria-pressed={mode==='illustrated'} onClick={()=>setMode('illustrated')}>2D thử nghiệm</button></div>
   <div className="art-segment" aria-label="Góc nhìn"><button disabled={recording} aria-pressed={view==='boat'} onClick={()=>setView('boat')}>Toàn ghe</button><button disabled={recording} aria-pressed={view==='crew'} onClick={()=>setView('crew')}>Cận VĐV</button></div>
  </div>
  {!ready&&<div className="art-loading" role="status">{status}</div>}
  <footer className="art-controls">
   <div className="art-control-main"><button className="art-play" disabled={!ready} onClick={togglePlaying}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':'Chèo'}</button><button onClick={reset} aria-label="Xem lại chu kỳ chèo"><RotateCcw size={18}/></button><label className="art-cadence">Nhịp chèo <input aria-label="Nhịp chèo mỗi phút" type="range" min="48" max="96" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}<small>/phút</small></strong></label><label className="art-water"><input type="checkbox" checked={splash} onChange={e=>setSplash(e.target.checked)}/> Nước té</label></div>
   <div className="art-control-links"><span>{mode==='illustrated'?'2D · thử nghiệm chưa được duyệt':'3D · chuyển động V6'}</span><button disabled={!ready} onClick={capture}><Camera size={16}/> Chụp ảnh</button><button disabled={!ready||recording} onClick={record}><Video size={16}/> {recording?'Đang ghi…':'Clip 10s'}</button><a href={import.meta.env.BASE_URL+'assets/ghe-ngo/ghe-ngo-crew.glb?v=06d3d78'} download><Download size={16}/> GLB 3D</a>{embedded&&<a href={import.meta.env.BASE_URL+'?demo=art'}>Mở bản tablet</a>}</div>
   <details className="art-pose-inspector"><summary>Xem từng pha chèo</summary><label className="art-cadence">Chu kỳ <input aria-label="Xem từng pha chèo" disabled={!ready||recording} type="range" min="0" max="100" step="1" value={inspectedPhase} onChange={e=>inspectPhase(Number(e.target.value))}/><strong>{inspectedPhase}%</strong></label></details>
   {(recording||recordError)&&<p role="status">{recording?'Đang ghi 10 giây. Clip sẽ được tải khi xong.':recordError}</p>}
  </footer>
  <details className="art-evidence"><summary>Nguồn hình ảnh</summary><p>Ghe và hoa văn theo clip của chủ dự án; trang phục đối chiếu ảnh đua thật của Nhân Dân. Nhân vật dùng model MakeHuman/MPFB CC0. Chuyển động V6 dựng bằng khung xương, có đối chiếu video đua thật; chưa phải motion capture. Bản 2D cũ giữ làm thử nghiệm.</p><p><a href="https://nhandan.vn/gan-1-trieu-luot-nguoi-du-le-hoi-ooc-om-boc-dua-ghe-ngo-soc-trang-nam-2024-post845131.html" target="_blank" rel="noreferrer">Ảnh đua thật</a> · <a href="https://www.youtube.com/watch?v=P5FvDeN7vow" target="_blank" rel="noreferrer">Video đua thật</a> · <a href={import.meta.env.BASE_URL+'assets/human/ATTRIBUTION.md'}>Nguồn model 3D</a></p></details>
 </section>;
}

import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, Camera, Download, Pause, Play, RotateCcw, Video} from 'lucide-react';
import {startSpritePreview, startModelPreview} from '../race/art-preview.mjs';
import './ArtPreview.css';

export function ArtPreview({embedded=false}:{embedded?:boolean}) {
 const host=useRef<HTMLDivElement>(null), runtime=useRef<any>(null);
 const [mode,setMode]=useState<'sprite'|'model'>('sprite');
 const [view,setView]=useState<'boat'|'crew'>('boat');
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [cadence,setCadence]=useState(72),[splash,setSplash]=useState(true);
 const [status,setStatus]=useState('Đang tải ghe…'),[ready,setReady]=useState(false);
 const [recording,setRecording]=useState(false),[recordError,setRecordError]=useState('');
 const clock=useRef({phase:.28,seconds:0,last:0});
 const settings=useRef({view,playing,cadence,splash});settings.current={view,playing,cadence,splash};
 useEffect(()=>{
  let cancelled=false,stop=()=>{};
  setReady(false);setStatus(mode==='sprite'?'Đang tải ảnh động ghe và đội chèo…':'Đang tải mô hình 3D…');
  const mount=host.current!;
  const start=mode==='sprite'?startSpritePreview:startModelPreview;
  clock.current.last=performance.now();
  start(mount,settings,clock,import.meta.env.BASE_URL,(instance:any)=>{
   if(cancelled){instance.dispose();return;}
   runtime.current=instance;stop=instance.dispose;setReady(true);
  }).catch((e:Error)=>{if(!cancelled)setStatus('Không tải được bản thử. '+e.message);});
  return()=>{cancelled=true;stop();runtime.current=null;};
 },[mode]);
 function reset(){clock.current.phase=.28;clock.current.seconds=0;runtime.current?.reset();}
 function capture(){runtime.current?.capture();}
 async function record(){setRecordError('');setRecording(true);setPlaying(true);try{await runtime.current?.record();}catch(e){setRecordError(e instanceof Error?e.message:String(e));}finally{setRecording(false);}}
 return <section className={'art-preview'+(embedded?' art-embedded':'')}>
  <div className="art-canvas" ref={host} data-testid="art-stage" />
  <header className="art-heading"><div><span className="art-kicker">GHE NGO · NGHIÊN CỨU HÌNH ẢNH</span><h1>Nhịp chèo trên sông</h1><p>Dáng ghe theo clip · người chèo từ model CC0</p></div><a className="art-back" href={import.meta.env.BASE_URL} aria-label="Mở hồ sơ tham chiếu"><ArrowLeft size={18}/> Hồ sơ</a></header>
  <div className="art-view-controls" aria-label="Chọn hình ảnh">
   <div className="art-segment" aria-label="Cách dựng hình"><button disabled={recording} aria-pressed={mode==='sprite'} onClick={()=>setMode('sprite')}>2.5D</button><button disabled={recording} aria-pressed={mode==='model'} onClick={()=>setMode('model')}>3D</button></div>
   <div className="art-segment" aria-label="Góc nhìn"><button disabled={recording} aria-pressed={view==='boat'} onClick={()=>setView('boat')}>Toàn ghe</button><button disabled={recording} aria-pressed={view==='crew'} onClick={()=>setView('crew')}>Cận VĐV</button></div>
  </div>
  {!ready&&<div className="art-loading" role="status">{status}</div>}
  <footer className="art-controls">
   <div className="art-control-main"><button className="art-play" disabled={!ready} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':'Chèo'}</button><button onClick={reset} aria-label="Xem lại chu kỳ chèo"><RotateCcw size={18}/></button><label className="art-cadence">Nhịp chèo <input aria-label="Nhịp chèo mỗi phút" type="range" min="48" max="96" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}<small>/phút</small></strong></label><label className="art-water"><input type="checkbox" checked={splash} onChange={e=>setSplash(e.target.checked)}/> Nước té</label></div>
   <div className="art-control-links"><span>{mode==='sprite'?'2.5D · ảnh động từ mô hình':'3D · cùng mô hình và chu kỳ chèo'}</span><button disabled={!ready} onClick={capture}><Camera size={16}/> Chụp ảnh</button><button disabled={!ready||recording} onClick={record}><Video size={16}/> {recording?'Đang ghi…':'Clip 10s'}</button><a href={import.meta.env.BASE_URL+'assets/ghe-ngo/ghe-ngo-crew.glb'} download><Download size={16}/> GLB</a>{embedded&&<a href={import.meta.env.BASE_URL+'?demo=art'}>Mở bản tablet</a>}</div>
   {(recording||recordError)&&<p role="status">{recording?'Đang ghi 10 giây. Clip sẽ được tải khi xong.':recordError}</p>}
  </footer>
  <details className="art-evidence"><summary>Nguồn hình ảnh</summary><p>Hoa văn và dáng ghe: clip của chủ dự án. VĐV: MakeHuman/MPFB, bản đóng gói CC0 của Innerscene; áo, quần và chuyển động được chỉnh cho mẫu chèo. Cảnh sông là minh họa theo ảnh đua thật.</p><p><a href="https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1" target="_blank" rel="noreferrer">Model gốc</a> · <a href={import.meta.env.BASE_URL+'assets/human/ATTRIBUTION.md'}>Nguồn và giấy phép</a></p></details>
 </section>;
}

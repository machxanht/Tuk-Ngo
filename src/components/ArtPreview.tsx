import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {Camera, Download, Pause, Play, RotateCcw, Video} from 'lucide-react';
import './ArtPreview.css';
import {athleteMasterDigest} from '../race/asset-digests.mjs';
import {DEFAULT_KBACH_ID} from '../race/kbach-library.mjs';

const RaceGame=lazy(()=>import('./RaceGame').then(m=>({default:m.RaceGame})));
const KbachPicker=lazy(()=>import('./KbachPicker').then(m=>({default:m.KbachPicker})));
type Mode = 'play' | 'race' | 'boat' | 'athlete';
export function ArtPreview({embedded=false}:{embedded?:boolean}) {
 const host=useRef<HTMLDivElement>(null),runtime=useRef<any>(null);
 const [mode,setMode]=useState<Mode>(()=>embedded||new URLSearchParams(location.search).get('demo')==='race'?'race':'play'),[view,setView]=useState('race');
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [cadence,setCadence]=useState(64),[splash,setSplash]=useState(true),[fast,setFast]=useState(false);
 const [referenceKbach,setReferenceKbach]=useState(true);
 const [constructionTypes,setConstructionTypes]=useState(['plywood','dugout']);
 const [libraryKbach,setLibraryKbach]=useState(true),[kbachIds,setKbachIds]=useState([DEFAULT_KBACH_ID,'7681583457654295826']),[pickerBoat,setPickerBoat]=useState<number|null>(null),[kbachLoading,setKbachLoading]=useState(false),[kbachError,setKbachError]=useState('');
 const [race,setRace]=useState<any>(null);
 const [inspectedPhase,setInspectedPhase]=useState(28),[status,setStatus]=useState('Đang tải ghe 3D…');
 const [ready,setReady]=useState(false),[recording,setRecording]=useState(false),[recordError,setRecordError]=useState('');
 const clock=useRef({phase:.28,seconds:0,last:0});
 const settings=useRef({view,playing,cadence,splash,fast,referenceKbach,constructionTypes,kbachIds:libraryKbach?kbachIds:undefined,racing:mode==='race',onRace:setRace});settings.current={view,playing,cadence,splash,fast,referenceKbach:mode==='boat'&&referenceKbach,constructionTypes,kbachIds:libraryKbach?kbachIds:undefined,racing:mode==='race',onRace:setRace};
 useEffect(()=>{if(ready&&mode!=='athlete'&&mode!=='play')runtime.current?.setConstruction(constructionTypes);},[constructionTypes,ready,mode]);
 useEffect(()=>{
  const preview=runtime.current;if(!ready||mode==='athlete'||mode==='play'||!preview?.setKbach)return;
  let cancelled=false;setKbachLoading(true);setKbachError('');
  preview.setKbach(libraryKbach?kbachIds:[]).then(()=>{if(!cancelled)setKbachLoading(false);},(error:Error)=>{if(!cancelled){setKbachLoading(false);setKbachError('Không tải được mẫu kbach: '+error.message);}});
  return()=>{cancelled=true;};
 },[ready,mode,kbachIds,libraryKbach]);
 useEffect(()=>{
  if(mode==='play')return;
  let cancelled=false,stop=()=>{};const mount=host.current!;
  setReady(false);setStatus(mode==='athlete'?'Đang tải VĐV từ Blender…':'Đang tải ghe 3D và đường đua 1.200 m…');setRace(null);
  (async()=>{
   const start=mode!=='athlete'?(await import('../race/boat-preview.mjs')).startBoatPreview:(await import('../race/athlete-study-preview.mjs')).startAthleteStudy;
   if(cancelled)return;
   clock.current.last=performance.now();
   await start(mount,settings,clock,import.meta.env.BASE_URL,(instance:any)=>{
    if(cancelled){instance.dispose();return;}
    runtime.current=instance;stop=instance.dispose;setReady(true);
   },(loaded:number,total:number)=>{if(!cancelled)setStatus(`Đang tải mô hình ${loaded}/${total}…`);});
  })().catch((e:Error)=>{if(!cancelled)setStatus('Không tải được mô hình. '+e.message);});
  return()=>{cancelled=true;stop();runtime.current=null;};
 },[mode]);
 function changeMode(next:Mode){if(next===mode)return;setMode(next);setView(next==='athlete'?'front':next==='race'?'race':'boat');}
 function reset(){clock.current.phase=.28;clock.current.seconds=0;setInspectedPhase(28);runtime.current?.reset();}
 function togglePlaying(){if(playing)setInspectedPhase(Math.round(clock.current.phase*100));setPlaying(!playing);}
 function inspectPhase(value:number){setPlaying(false);setInspectedPhase(value);clock.current.phase=value/100;}
 async function record(){setRecordError('');setRecording(true);setPlaying(true);try{await runtime.current?.record();}catch(e){setRecordError(e instanceof Error?e.message:String(e));}finally{setRecording(false);}}
 if(mode==='play')return <Suspense fallback={<p role="status">Đang mở cúp 61 ghe…</p>}><RaceGame onInspect={()=>changeMode('race')}/></Suspense>;
 const views=mode==='race'?[['race','Theo cuộc đua'],['start','Xuất phát'],['official','Trọng tài'],['stand','Khán đài chính'],['finish','Vạch đích'],['bridge','Cầu 30/4'],['banks','Toàn tuyến 1.200 m'],['crew','Cận tay bơi']]:mode==='athlete'?[['front','Trước'],['side','Ngang'],['back','Sau'],['paddle','Dằm']]:[['boat','Toàn ghe'],['kbach','Cận hoa văn'],['stand','Khán đài chính'],['banks','Hai bờ sông'],['crowd','Khán giả'],['top','Nhìn từ trên'],['crew','Cận tay bơi'],['kneel','Nhóm quỳ'],['bow','Đầu ghe'],['stern','Lái cuối ghe']];
 return <section className={'art-preview'+(embedded?' art-embedded':'')}>
  <header className="art-heading"><div><span className="art-kicker">GHE NGO · 3D</span><h1>{mode==='race'?'Đua thử hai ghe · 1.200 m':mode==='boat'?(libraryKbach?'Ghe thử kbach từ ảnh TikTok · 54 người':referenceKbach?'Ghe mẫu kbach từ clip · 54 người':'Ghe Tum Núp 2 · 54 người'):'VĐV Tum Núp 2'}</h1><p>Kéo để xoay · chụm hai ngón để phóng to</p></div><a className="art-back" href={import.meta.env.BASE_URL+'assets/illustrated-v22/race.html?mode=cup'}>Giải 8 ghe</a></header>
  <nav className="art-view-controls" aria-label="Chọn hình ảnh">
   <div className="art-segment" aria-label="Mô hình"><button disabled={recording} onClick={()=>changeMode('play')}>Chơi cúp 61 ghe</button><button disabled={recording} aria-pressed={mode==='race'} onClick={()=>changeMode('race')}>Hai ghe đua</button><button disabled={recording} aria-pressed={mode==='boat'} onClick={()=>changeMode('boat')}>Cả ghe 3D</button><button disabled={recording} aria-pressed={mode==='athlete'} onClick={()=>changeMode('athlete')}>Một VĐV</button></div>
   {(mode==='boat'||mode==='race')&&<div className="art-segment art-kbach-controls" role="group" aria-label="Hoa văn ghe"><button disabled={!ready||kbachLoading} aria-pressed={libraryKbach} onClick={()=>setPickerBoat(0)}>{mode==='race'?'Kbach ghe 1':'Thư viện kbach'}</button>{mode==='race'&&<button disabled={!ready||kbachLoading} onClick={()=>setPickerBoat(1)}>Kbach ghe 2</button>}{mode==='boat'&&<button aria-pressed={!libraryKbach&&referenceKbach} onClick={()=>{setLibraryKbach(false);setReferenceKbach(true);}}>Kbach từ clip</button>}<button aria-pressed={!libraryKbach&&!referenceKbach} onClick={()=>{setLibraryKbach(false);setReferenceKbach(false);}}>{mode==='race'?'Màu hai đội':'Màu đội Tum Núp 2'}</button></div>}
   {(mode==='boat'||mode==='race')&&<div className="art-segment" role="group" aria-label="Kết cấu ghe">{constructionTypes.slice(0,mode==='race'?2:1).map((type,i)=><label key={i}>Ghe {i+1} <select aria-label={'Kết cấu ghe '+(i+1)} value={type} onChange={e=>setConstructionTypes(types=>types.map((old,k)=>k===i?e.target.value:old))}><option value="plywood">Ván ép · ngồi điều nhịp</option><option value="dugout">Độc mộc · đứng cầm thương</option></select></label>)}</div>}
   <div className="art-segment" aria-label="Góc nhìn">{views.map(([v,label])=><button key={v} disabled={recording} aria-pressed={view===v} onClick={()=>setView(v)}>{label}</button>)}</div>
  </nav>
  <div className="art-canvas" ref={host} data-testid="art-stage" aria-busy={!ready}>{!ready&&<div className="art-loading" role="status">{status}</div>}</div>
  <footer className="art-controls">
   {mode==='race'&&ready&&race&&<div className="art-race-status" aria-label="Tiến độ đua thử">
    <span>{race.state==='countdown'?`Xuất phát sau ${Math.ceil(race.countdown)}s`:race.state==='finished'?'Đã về đích':race.stages[0]}</span>
    {race.teams.map((name:string,i:number)=><label key={name}><span>{name} <strong>{Math.floor(race.distance[i])} m</strong>{race.finishTimes[i]!=null&&` · ${race.finishTimes[i].toFixed(2)}s`}</span><progress max="1200" value={race.distance[i]} /></label>)}
    <label><input type="checkbox" checked={fast} onChange={e=>setFast(e.target.checked)}/> Xem nhanh 3×</label>
   </div>}

   <div className="art-control-main"><button className="art-play" disabled={!ready} onClick={togglePlaying}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':mode==='race'?'Tiếp tục':'Chèo'}</button><button onClick={reset} aria-label={mode==='race'?'Đua lại từ xuất phát':'Xem lại chu kỳ chèo'}><RotateCcw size={18}/></button><label className="art-cadence">Nhịp chèo <input aria-label="Nhịp chèo mỗi phút" type="range" min="30" max="96" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}<small>/phút</small></strong></label>{mode!=='athlete'&&<label className="art-water"><input type="checkbox" checked={splash} onChange={e=>setSplash(e.target.checked)}/> Nước té</label>}</div>
   <details className="art-tools"><summary>Kiểm tra pha chèo · tải asset · nguồn tham khảo</summary><div className="art-tool-content">
    <label className="art-cadence">Chu kỳ <input aria-label="Xem từng pha chèo" disabled={!ready||recording} type="range" min="0" max="100" step="1" value={inspectedPhase} onChange={e=>inspectPhase(Number(e.target.value))}/><strong>{inspectedPhase}%</strong></label>
    <div className="art-control-links"><button disabled={!ready} onClick={()=>runtime.current?.capture()}><Camera size={16}/> Chụp ảnh</button><button disabled={!ready||recording} onClick={record}><Video size={16}/> {recording?'Đang ghi…':'Clip 10s'}</button><a href={import.meta.env.BASE_URL+'assets/athlete-master/athlete-master.glb?sha='+athleteMasterDigest} download><Download size={16}/> GLB VĐV</a></div>
    {(mode==='boat'||mode==='race')&&<p>Thư viện kbach lấy từ các album của <a href="https://www.tiktok.com/@karn_chinda" target="_blank" rel="noreferrer">@karn_chinda</a>; xem nguồn từng bộ trong thư viện. Các mẫu là bản thử mỹ thuật; tám bộ màu đội có tư liệu vẫn được giữ riêng. <a href={import.meta.env.BASE_URL+'assets/ghe-ngo/kbach-master.svg'} download>Tải mẫu SVG từ clip trước</a>.</p>}
    <p>Ghe dùng chung 8 bộ động tác với bản đua. VĐV đơn dùng cùng bộ động tác đã sửa hướng chèo với cả ghe, gồm cả áo và dằm. Nón, tóc và dằm dựng trong Blender; cơ thể MakeHuman/MPFB CC0. Hai bờ dùng nhân vật Quaternius CC0 có chuyển động và phố 3D. Hai ghe 3D chạy từ xuất phát đến đích đủ 1.200 m. Đây là trận đua thử tự động; giải 8 ghe vẫn ở nút riêng phía trên.</p>
    <p>Khán đài theo <a href="https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/hao-huc-cho-ngay-khai-hoi-67c01d9/" target="_blank" rel="noreferrer">ảnh thực tế trước và trong khán đài</a>; cự ly theo <a href="https://duaghengo.cantho.gov.vn/uploads/filedinhkem/nvchon_04%20KH-BTC%2009102025%20%28FINAL%29.pdf" target="_blank" rel="noreferrer">kế hoạch giải 2025</a>. Toàn cảnh theo <a href="https://vnexpress.net/hang-chuc-nghin-nguoi-xem-dua-ghe-ngo-lon-nhat-mien-tay-4816604.html" target="_blank" rel="noreferrer">ảnh VnExpress bạn cung cấp</a>. Cầu đầu tuyến nằm ngoài cự ly đua; ghe hàng giữa hai làn làm trọng tài xuất phát. Hình dáng theo tư liệu; kích thước công trình và bố trí phố ước lượng. © OpenStreetMap contributors, ODbL, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">nguồn đường bờ</a>.</p>
    <p><a href="https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm" target="_blank" rel="noreferrer">Ảnh trang phục và dằm</a> · <a href="https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/" target="_blank" rel="noreferrer">Video thi đấu</a></p>
   </div></details>
   {(recording||recordError)&&<p role="status">{recording?'Đang ghi 10 giây…':recordError}</p>}
   {(kbachLoading||kbachError)&&<p className="art-kbach-status" role="status">{kbachError||'Đang áp dụng ảnh kbach 8K…'}</p>}
  </footer>
  {pickerBoat!==null&&<Suspense fallback={<p role="status">Đang mở thư viện kbach…</p>}><KbachPicker selected={kbachIds[pickerBoat]} onSelect={id=>{setKbachIds(ids=>ids.map((value,i)=>i===pickerBoat?id:value));setLibraryKbach(true);}} onClose={()=>setPickerBoat(null)}/></Suspense>}
 </section>;
}

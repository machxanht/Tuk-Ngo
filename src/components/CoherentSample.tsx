import {useEffect,useRef,useState} from 'react';
import {startCoherentSample} from '../race/coherent-sample-v19.mjs';
import './CoherentSample.css';

type View='wide'|'hero'|'face'|'back'|'npc'|'street';
export function CoherentSample(){
 const reducedMotion=useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;
 const host=useRef<HTMLDivElement>(null),runtime=useRef<any>(null),settings=useRef({view:'hero' as View,playing:!reducedMotion,cadence:70,phase:.32});
 const [open,setOpen]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[view,setView]=useState<View>('hero'),[playing,setPlaying]=useState(!reducedMotion),[phase,setPhase]=useState(32);
 useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);document.querySelector<HTMLButtonElement>('.sample-toggle')?.focus();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[open]);
 useEffect(()=>{let stopped=false;if(!host.current)return;startCoherentSample(host.current,settings,import.meta.env.BASE_URL,(r:any)=>{if(stopped){r.dispose();return;}runtime.current=r;setReady(true);},(s:any)=>{if(!stopped&&settings.current.playing)setPhase(Math.round(s.phase*100));}).catch((e:Error)=>{if(!stopped)setError(e.message);});return()=>{stopped=true;runtime.current?.dispose();runtime.current=null;};},[]);
 function choose(value:View){settings.current.view=value;setView(value);setOpen(false);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.sample-toggle')?.focus());}
 function togglePlaying(){settings.current.playing=!settings.current.playing;settings.current.phase=phase/100;setPlaying(settings.current.playing);}
 return <main className="coherent-sample" data-controls-open={open}>
  <div ref={host} className="sample-stage" data-testid="coherent-stage" role="img" aria-label="Mẫu 3D mới: một vận động viên chèo ghe, ba NPC và 50 mét bờ sông dưới ánh sáng ban ngày"/>
  {!ready&&<div className="sample-loading" role="status">{error?'Không tải được mẫu: '+error:'Đang tải VĐV và cảnh mẫu mới…'}</div>}
  {open&&<section className="sample-controls" aria-label="Điều khiển mẫu mới">
   <p className="sample-kicker">MẪU 3D MỚI</p><h1>Người · ghe · phố ven sông</h1><p className="sample-description">Một VĐV chi tiết, ba NPC có sẵn và đoạn phố 50 m. Kéo để xoay, chụm hai ngón để phóng to.</p>
   <div className="sample-views">{([['wide','Toàn cảnh'],['hero','VĐV'],['face','Khuôn mặt'],['back','Áo sau'],['npc','NPC'],['street','Đường phố']] as [View,string][]).map(([value,label])=><button key={value} disabled={!ready} aria-pressed={view===value} onClick={()=>choose(value)}>{label}</button>)}</div>
   <div className="sample-play"><button disabled={!ready} onClick={togglePlaying}>{playing?'Dừng':'Chèo'}</button><label>Pha chèo <input type="range" aria-label="Pha chèo" min="0" max="100" value={phase} disabled={!ready} onChange={e=>{const value=Number(e.target.value);setPhase(value);settings.current.playing=false;settings.current.phase=value/100;setPlaying(false);}}/></label></div>
   <nav><a href={import.meta.env.BASE_URL+'?demo=studio&scene=race'}>Cảnh đua đầy đủ</a><a href={import.meta.env.BASE_URL+'?demo=play'}>Chơi game</a><a href={import.meta.env.BASE_URL+'assets/coherent-v19/athlete-v19.glb'} download>GLB VĐV mới</a></nav>
   <details><summary>Nguồn & phạm vi mẫu</summary><p>Nhân vật VĐV: MakeHuman CC0; NPC: Quaternius CC0; ánh sáng và vật liệu: Poly Haven CC0. Trang phục và nhịp chèo dựng theo tư liệu ghe Ngo thật. Đây là mẫu chất lượng hình ảnh trước khi nhân rộng sang toàn giải.</p></details>
  </section>}
  <button className="sample-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Ẩn điều khiển':'Điều khiển'}</button>
 </main>;
}

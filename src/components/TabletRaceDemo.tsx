import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {buildRiver,buildSplashes} from '../race/river.mjs';
import {loadRaceCrews,buildBoatWake} from '../race/race-crew.mjs';
import {COURSE,buildMasperoSky} from '../race/maspero-course.mjs';
import {Play,Pause,RotateCcw,Waves,Maximize2,Download,Users,ArrowLeft,Camera,Video} from 'lucide-react';
import './TabletRaceDemo.css';

type CameraMode='overview'|'follow'|'crew'|'stand';
export function TabletRaceDemo({embedded=false}:{embedded?:boolean}){
 const mount=useRef<HTMLDivElement>(null),runtime=useRef<any>(null);
 const [playing,setPlaying]=useState(true),[camera,setCamera]=useState<CameraMode>('overview'),[cadence,setCadence]=useState(80),[splash,setSplash]=useState(true),[lowPower,setLowPower]=useState(true),[team,setTeam]=useState(0);
 const [status,setStatus]=useState('Đang tải hai ghe và đường đua Maspéro…'),[ready,setReady]=useState(false),[distance,setDistance]=useState(1020),[recording,setRecording]=useState(false),[fps,setFps]=useState('—');
 const settings=useRef({playing,camera,cadence,splash,lowPower,team});settings.current={playing,camera,cadence,splash,lowPower,team};
 useEffect(()=>{
  let stopped=false,raf=0,cleanup:()=>void=()=>{};
  const host=mount.current!;
  async function start(){try{
   const model=await loadRaceCrews(import.meta.env.BASE_URL+'assets/ghe-ngo/ghe-ngo-crew.glb?v=06d3d78');if(stopped){model.dispose();return;}
   const scene=new THREE.Scene();scene.background=new THREE.Color('#d6e1da');scene.fog=new THREE.Fog('#d6e1da',220,740);
   scene.add(new THREE.HemisphereLight('#eaf2eb','#8b8066',2.25));const sun=new THREE.DirectionalLight('#fff4dc',2.5);sun.position.set(-45,75,35);scene.add(sun);
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;host.appendChild(renderer.domElement);
   renderer.domElement.setAttribute('aria-label','Hai ghe Ngo 3D chèo trên đường đua Maspéro với khán đài và khán giả hai bờ');
   const view=new THREE.PerspectiveCamera(48,1,.10,1800),controls=new OrbitControls(view,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.10;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=2;controls.maxDistance=230;controls.enablePan=false;
   const river=buildRiver(scene,.28,{detailed:true}),sky=buildMasperoSky(scene),effects=model.teams.map(()=>buildSplashes(scene,.28)),wakes=model.teams.map(()=>buildBoatWake(scene,.28));model.teams.forEach(t=>scene.add(t.root));
   host.dataset.sceneVersion='MASPERO_TWO_CREWS_V7';host.dataset.actorSource='V6_MAKEHUMAN_GLB';host.dataset.boatCount='2';host.dataset.crewCount=String(model.teams.reduce((n,t)=>n+t.actors.length,0));host.dataset.rowerCount=String(model.teams.reduce((n,t)=>n+t.athletes.length,0));host.dataset.optimization=JSON.stringify(model.teams.map(t=>t.stats));host.dataset.course=JSON.stringify(COURSE);host.dataset.environment=JSON.stringify(river.group.userData);
   let simTime=0,travel=1020,last=performance.now(),lastPose=0,lastUi=0,lastCamera='',lastTeam=-1,lastQuality=true,frames=0,fpsStart=last,recorder:MediaRecorder|null=null,recordTimer:ReturnType<typeof setTimeout>|undefined;
   function positionCamera(mode:CameraMode){const selected=model.teams[settings.current.team],x=selected.root.position.x,z=selected.root.position.z,portrait=view.aspect<1?1.18:1;
    controls.maxDistance=230;
    if(mode==='overview'){controls.target.set(x-4,1.3,-2);view.position.set(x+34*portrait,27*portrait,67*portrait);}
    if(mode==='follow'){controls.target.set(x+3,1.1,-2);view.position.set(x-31*portrait,8.4*portrait,29*portrait);}
    if(mode==='crew'){controls.target.set(x+4.16,1.04,z);view.position.set(x+6.1,2.9,z+4.4);controls.maxDistance=25;}
    if(mode==='stand'){controls.target.set(COURSE.standX,5,-53);view.position.set(COURSE.standX+36*portrait,36*portrait,75*portrait);}
    controls.update();lastCamera=mode;lastTeam=settings.current.team;
   }
   function placeBoats(){model.teams.forEach((t,i)=>{const gap=i?1.4+Math.sin(simTime*.12)*.9:0;t.root.position.set(travel-15.1-gap,.010*Math.sin(t.phase*Math.PI*2),COURSE.lanes[i]);t.pose(t.phase);});}
   function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setPixelRatio(settings.current.lowPower?1:Math.min(devicePixelRatio,1.5));renderer.setSize(w,h);view.aspect=w/h;view.updateProjectionMatrix();effects.forEach(f=>f.setDpr(renderer.getPixelRatio()));positionCamera(settings.current.camera);}
   placeBoats();const observer=new ResizeObserver(resize);observer.observe(host);resize();
   function seek(value:number){travel=Math.min(COURSE.length,Math.max(0,value));simTime=0;model.teams.forEach((t,i)=>t.phase=i?.17:.28);effects.forEach(f=>f.reset());placeBoats();wakes.forEach((w,i)=>w.update(model.teams[i].root,0,false));positionCamera(settings.current.camera);setDistance(travel);}
   runtime.current={renderer,scene,view,controls,model,seek,reset(){seek(0);},screenshot(){renderer.render(scene,view);renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='maspero-v7-'+settings.current.camera+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});},record(){
    if(!renderer.domElement.captureStream||!window.MediaRecorder){setStatus('Trình duyệt chưa hỗ trợ ghi clip WebM.');return;}
    const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mimeType){setStatus('Trình duyệt chưa hỗ trợ ghi clip WebM.');return;}
    const stream=renderer.domElement.captureStream(30),chunks:BlobPart[]=[];recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4000000});setRecording(true);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);setStatus('Không ghi được clip.');};
    recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(stopped)return;const url=URL.createObjectURL(new Blob(chunks,{type:mimeType})),a=document.createElement('a');a.href=url;a.download='maspero-v7-two-crews-10s.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setRecording(false);};recorder.start();recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},10000);
   }};
   cleanup=()=>{observer.disconnect();controls.dispose();clearTimeout(recordTimer);if(recorder?.state==='recording')recorder.stop();effects.forEach(f=>f.dispose());wakes.forEach(w=>w.dispose());river.dispose();sky.dispose();model.dispose();renderer.dispose();renderer.domElement.remove();runtime.current=null;};
   setReady(true);setStatus('Hai ghe · 110 người · khán đài theo ảnh Maspéro 2024');
   function animate(now:number){if(stopped)return;const frameDt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;const s=settings.current,dt=s.playing?frameDt:0,speed=s.cadence/80*4.8,dx=dt*speed;
    simTime+=dt;travel+=dx;if(travel>COURSE.length+75)seek(0);
    model.teams.forEach((t,i)=>{t.phase=(t.phase+dt*(s.cadence+(i?-.8:0))/60)%1;t.root.position.set(travel-15.1-(i?1.4+Math.sin(simTime*.12)*.9:0),.010*Math.sin(t.phase*Math.PI*2),COURSE.lanes[i]);});
    if(now-lastPose>1000/(s.lowPower?24:40)){model.teams.forEach(t=>t.pose(t.phase));lastPose=now;}else model.teams.forEach(t=>t.root.updateMatrixWorld(true));
    river.update(simTime);effects.forEach((f,i)=>f.update(dt,model.teams[i],speed,simTime,s.splash));wakes.forEach((w,i)=>w.update(model.teams[i].root,simTime,s.playing));
    if(s.camera!==lastCamera||s.team!==lastTeam)positionCamera(s.camera);else if(s.camera!=='stand'){view.position.x+=dx;controls.target.x+=dx;}controls.update();
    if(s.lowPower!==lastQuality){lastQuality=s.lowPower;resize();}sky.update(view);renderer.render(scene,view);frames++;
    if(now-lastUi>450){lastUi=now;host.dataset.splashEvents=JSON.stringify(effects.map(f=>f.stats().events));host.dataset.activeParticles=JSON.stringify(effects.map(f=>f.stats().particles));host.dataset.boatPositions=JSON.stringify(model.teams.map(t=>t.root.position.toArray()));host.dataset.phases=JSON.stringify(model.teams.map(t=>t.phase));host.dataset.distance=travel.toFixed(1);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.camera=s.camera;host.dataset.team=String(s.team);setDistance(travel);}
    if(now-fpsStart>1500){const rate=(frames*1000/(now-fpsStart)).toFixed(1);host.dataset.fps=rate;setFps(rate);frames=0;fpsStart=now;}raf=requestAnimationFrame(animate);
   }
   raf=requestAnimationFrame(animate);
  }catch(error){setStatus('Không tải được cảnh 3D: '+(error instanceof Error?error.message:String(error)));host.dataset.loadError=String(error);}}
  start();return()=>{stopped=true;cancelAnimationFrame(raf);cleanup();};
 },[]);
 const fullUrl=import.meta.env.BASE_URL+'?demo=studio';
 return <section className={'race-demo'+(embedded?' race-demo-embedded':'')}>
  <div ref={mount} className="race-stage" data-testid="race-stage" />
  <header className="race-heading"><div><span className="race-eyebrow">BẢN THỬ 3D · V7</span><h1>Sông Maspéro</h1><p>Hai ghe chèo · khán đài & phố ven sông</p><div className="race-teams"><span><i className="team-green"/>Tum Núp 2</span><span><i className="team-amber"/>Đội thử</span></div></div><div className="race-distance">{Math.min(1200,Math.floor(distance))} <small>/ 1.200 m</small><em>{distance>1200?'Qua đích':fps+' FPS'}</em></div></header>
  {!ready&&<div className="race-loading" role="status">{status}</div>}
  <div className="race-toolbar">
   <div className="race-camera-buttons" aria-label="Góc nhìn">
    {([['overview','Hai ghe'],['follow','Theo ghe'],['crew','VĐV'],['stand','Khán đài']] as [CameraMode,string][]).map(([key,label])=><button key={key} className={camera===key?'selected':''} aria-pressed={camera===key} onClick={()=>setCamera(key)}>{key==='crew'&&<Users size={16}/>} {label}</button>)}
   </div>
   <div className="race-main-controls"><button className="race-play" disabled={!ready} onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':'Chèo'}</button><button onClick={()=>runtime.current?.reset()} aria-label="Về vạch xuất phát" disabled={!ready}><RotateCcw size={18}/></button><label className="race-cadence">Nhịp <input aria-label="Nhịp chèo" type="range" min="55" max="105" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}</strong></label><button aria-pressed={splash} onClick={()=>setSplash(v=>!v)}><Waves size={18}/> Nước té</button></div>
   <details className="race-options"><summary>Đường đua & tùy chọn</summary><div className="race-course-controls"><button disabled={!ready} onClick={()=>runtime.current?.seek(0)}>Xuất phát</button><button disabled={!ready} onClick={()=>runtime.current?.seek(600)}>Giữa sông</button><button disabled={!ready} onClick={()=>runtime.current?.seek(1050)}>Gần đích</button></div><div className="race-focus"><span>Theo đội</span><button aria-pressed={team===0} onClick={()=>setTeam(0)}>Tum Núp 2</button><button aria-pressed={team===1} onClick={()=>setTeam(1)}>Đội thử</button></div><label className="race-course-slider">Vị trí <input aria-label="Vị trí trên đường đua" type="range" min="0" max="1200" step="10" value={Math.min(1200,distance)} disabled={!ready} onChange={e=>runtime.current?.seek(Number(e.target.value))}/></label><div className="race-secondary"><label><input type="checkbox" checked={lowPower} onChange={e=>setLowPower(e.target.checked)}/> Tiết kiệm pin</label><button onClick={()=>runtime.current?.screenshot()} aria-label="Chụp ảnh cảnh 3D" disabled={!ready}><Camera size={16}/> Ảnh</button><button disabled={!ready||recording} onClick={()=>{setPlaying(true);runtime.current?.record();}}><Video size={16}/>{recording?'Đang ghi…':'Clip 10s'}</button></div></details>
   <div className="race-links"><a href={import.meta.env.BASE_URL+'assets/ghe-ngo/ghe-ngo-crew.glb?v=06d3d78'} download="ghe-ngo-crew.glb"><Download size={15}/> GLB ghe</a>{embedded?<a href={fullUrl}><Maximize2 size={15}/> Toàn màn hình</a>:<a href={import.meta.env.BASE_URL+'?demo=art'}><ArrowLeft size={15}/> Xem asset</a>}</div>
  </div>
  <details className="race-source"><summary>Nguồn Maspéro & lưu ý</summary><p>Khán đài, mái thép, bờ kè và phố ven sông dựa trên <a href="https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/hao-huc-cho-ngay-khai-hoi-67c01d9/" target="_blank" rel="noreferrer">ảnh Báo Sóc Trăng 2024</a> và <a href="https://www.sggp.org.vn/khai-mac-giai-dua-ghe-ngo-nam-2024-lon-nhat-tai-dbscl-post768322.html" target="_blank" rel="noreferrer">ảnh hiện trường SGGP</a>.</p><p>Cự ly nam 1.200 m. Bề rộng sông, vị trí công trình và hai cầu là ước lượng để dựng cảnh; chưa phải bản đo địa hình. Đội áo vàng là đội thử, chưa đại diện cho một đội thật.</p><p>Ghe dùng hoa văn từ clip bạn cung cấp. Người <a href={import.meta.env.BASE_URL+'assets/human/ATTRIBUTION.md'}>MakeHuman CC0</a>, chuyển động V6. Kéo để xoay, chụm hai ngón để phóng to.</p></details>
  <span className="race-live-status" role="status">{ready?status:''}</span>
 </section>;
}

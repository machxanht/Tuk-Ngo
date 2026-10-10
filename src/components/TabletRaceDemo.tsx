import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {prepareDesign,buildBoat,verifyBoat,SPEC} from '../race/boat.mjs';
import {buildRiver,buildSplashes} from '../race/river.mjs';
import {Play,Pause,RotateCcw,Waves,Maximize2,Download,Users,ArrowLeft,Camera} from 'lucide-react';
import './TabletRaceDemo.css';

type CameraMode='overview'|'follow'|'crew'|'bow';
export function TabletRaceDemo({embedded=false}:{embedded?:boolean}){
 const mount=useRef<HTMLDivElement>(null),runtime=useRef<any>(null);
 const [playing,setPlaying]=useState(true),[camera,setCamera]=useState<CameraMode>('overview'),[cadence,setCadence]=useState(80),[splash,setSplash]=useState(true),[lowPower,setLowPower]=useState(false);
 const [status,setStatus]=useState('Đang tải model người và hoa văn…'),[ready,setReady]=useState(false),[distance,setDistance]=useState(0);
 const settings=useRef({playing,camera,cadence,splash,lowPower});settings.current={playing,camera,cadence,splash,lowPower};
 useEffect(()=>{
  let stopped=false,raf=0,cleanup:()=>void=()=>{};
  const host=mount.current!;
  async function start(){try{
   await prepareDesign(import.meta.env.BASE_URL+'assets/ghe-ngo/kbach-from-reference.webp',import.meta.env.BASE_URL+'assets/human/makehuman-athlete.glb');if(stopped)return;
   const scene=new THREE.Scene();scene.background=new THREE.Color('#bad6d7');scene.fog=new THREE.Fog('#bad6d7',150,480);
   scene.add(new THREE.HemisphereLight('#d8edf1','#555c40',2.1));const sun=new THREE.DirectionalLight('#fff0d5',3.1);sun.position.set(-45,75,35);scene.add(sun);
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.appendChild(renderer.domElement);
   renderer.domElement.setAttribute('aria-label','Cảnh 3D ghe Ngo, VĐV và mặt nước sông');
   const view=new THREE.PerspectiveCamera(44,1,.05,1800),controls=new OrbitControls(view,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=2;controls.maxDistance=90;controls.enablePan=false;
   const boat=buildBoat();scene.add(boat.root);const river=buildRiver(scene,SPEC.waterY),waterFx=buildSplashes(scene,SPEC.waterY);
   const check=verifyBoat(boat);host.dataset.actorSource='makehuman-mpfb-cc0';host.dataset.crewCount=String(boat.athletes.length);host.dataset.rigCheck=String(check.pass);host.dataset.maxGripGap=String(check.checks.animation.maxHandGripGapM);host.dataset.rigDiagnostics=JSON.stringify(check.checks.animation);host.dataset.rigErrors=JSON.stringify(check.errors);
   const wake=new THREE.Mesh(new THREE.PlaneGeometry(12,2.1),new THREE.MeshBasicMaterial({color:'#c9ded5',transparent:true,opacity:.13,depthWrite:false}));wake.rotation.x=-Math.PI/2;scene.add(wake);
   let simTime=0,phase=.25,travel=0,last=performance.now(),lastPose=0,lastUi=0,lastCamera='',lastQuality=false;let frames=0,fpsStart=last;
   function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setPixelRatio(settings.current.lowPower?1:Math.min(devicePixelRatio,1.5));renderer.setSize(w,h);view.aspect=w/h;view.updateProjectionMatrix();waterFx.setDpr(renderer.getPixelRatio());}
   const observer=new ResizeObserver(resize);observer.observe(host);resize();
   function positionCamera(mode:CameraMode){const x=travel,z=-18;
    if(mode==='overview'){controls.target.set(x,.9,z);view.position.set(x+20,19,z+29);controls.maxDistance=90;}
    if(mode==='follow'){controls.target.set(x+4,1,z);view.position.set(x-22,5.8,z+5.5);}
    if(mode==='crew'){controls.target.set(x+.2,1,z-.12);view.position.set(x+2.6,2.8,z+4.0);controls.maxDistance=20;}
    if(mode==='bow'){controls.target.set(x+12.6,1,z);view.position.set(x+17,3.6,z+6.2);}
    controls.update();lastCamera=mode;
   }
   positionCamera(settings.current.camera);
   runtime.current={renderer,scene,boat,view,controls,reset(){travel=0;phase=.25;simTime=0;waterFx.reset();positionCamera(settings.current.camera);},screenshot(){renderer.render(scene,view);renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ghe-ngo-river-'+settings.current.camera+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}};
   cleanup=()=>{observer.disconnect();controls.dispose();waterFx.dispose();river.dispose();scene.traverse((o:any)=>{if(o.geometry)o.geometry.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});renderer.dispose();renderer.domElement.remove();runtime.current=null;};
   setReady(true);setStatus('Model MakeHuman CC0 · 55 người · hoa văn theo clip');
   function animate(now:number){if(stopped)return;const frameDt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;const s=settings.current,dt=s.playing?frameDt:0;
    simTime+=dt;phase=(phase+dt*s.cadence/60)%1;const speed=s.cadence/80*4.8,dx=dt*speed;travel+=dx;if(travel>1230){travel=0;positionCamera(s.camera);}boat.root.position.set(travel,.013*Math.sin(phase*Math.PI*2),-18);
    if(now-lastPose>1000/(s.lowPower?24:40)){boat.pose(phase);lastPose=now;}boat.root.updateMatrixWorld(true);
    river.update(simTime);waterFx.update(dt,boat,speed,simTime,s.splash);
    wake.position.set(travel-19,SPEC.waterY+.016,-18);wake.visible=s.playing;
    if(s.camera!==lastCamera)positionCamera(s.camera);else{view.position.x+=dx;controls.target.x+=dx;}controls.update();
    if(s.lowPower!==lastQuality){lastQuality=s.lowPower;resize();}renderer.render(scene,view);frames++;
    if(now-lastUi>400){lastUi=now;const stats=waterFx.stats();host.dataset.splashEvents=String(stats.events);host.dataset.activeParticles=String(stats.particles);host.dataset.distance=travel.toFixed(1);host.dataset.liveMaxGripGap=String(Math.max(...boat.athletes.flatMap(a=>a.gripErrors)));host.dataset.drawCalls=String(renderer.info.render.calls);setDistance(travel);}
    if(now-fpsStart>1200){host.dataset.fps=(frames*1000/(now-fpsStart)).toFixed(1);frames=0;fpsStart=now;}raf=requestAnimationFrame(animate);
   }
   raf=requestAnimationFrame(animate);
  }catch(error){setStatus('Không tải được cảnh 3D: '+(error instanceof Error?error.message:String(error)));}}
  start();return()=>{stopped=true;cancelAnimationFrame(raf);cleanup();};
 },[]);
 function exportGlb(){const a=document.createElement('a');a.href=import.meta.env.BASE_URL+'assets/ghe-ngo/ghe-ngo-crew.glb';a.download='ghe-ngo-crew.glb';a.click();}
 const fullUrl=import.meta.env.BASE_URL+'?demo=studio';
 return <section className={'race-demo'+(embedded?' race-demo-embedded':'')}>
  <div ref={mount} className="race-stage" data-testid="race-stage" />
  <header className="race-heading"><div><span className="race-eyebrow">SÓC TRĂNG · GHE NGO</span><h1>Sông Maspéro</h1><p>VĐV từ model CC0 · hoa văn theo clip tham chiếu</p></div><div className="race-distance">{Math.floor(distance)} <small>/ 1.200 m</small></div></header>
  {!ready&&<div className="race-loading" role="status">{status}</div>}
  <div className="race-toolbar">
   <div className="race-camera-buttons" aria-label="Góc nhìn">
    {([['overview','Toàn cảnh'],['follow','Theo ghe'],['crew','VĐV'],['bow','Mũi ghe']] as [CameraMode,string][]).map(([key,label])=><button key={key} className={camera===key?'selected':''} aria-pressed={camera===key} onClick={()=>setCamera(key)}>{key==='crew'&&<Users size={16}/>} {label}</button>)}
   </div>
   <div className="race-main-controls"><button className="race-play" disabled={!ready} onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Dừng':'Chèo'}</button><button onClick={()=>runtime.current?.reset()} aria-label="Về vạch xuất phát"><RotateCcw size={18}/></button><label className="race-cadence">Nhịp <input aria-label="Nhịp chèo" type="range" min="55" max="105" value={cadence} onChange={e=>setCadence(Number(e.target.value))}/><strong>{cadence}</strong></label><button aria-pressed={splash} onClick={()=>setSplash(v=>!v)}><Waves size={18}/> Nước té</button></div>
   <div className="race-secondary"><label><input type="checkbox" checked={lowPower} onChange={e=>setLowPower(e.target.checked)}/> Tiết kiệm pin</label><button onClick={()=>runtime.current?.screenshot()} aria-label="Chụp ảnh cảnh 3D" disabled={!ready}><Camera size={16}/> Ảnh</button><button onClick={exportGlb} disabled={!ready}><Download size={16}/> Tải GLB</button>{embedded?<a href={fullUrl}><Maximize2 size={16}/> Toàn màn hình</a>:<a href={import.meta.env.BASE_URL}><ArrowLeft size={16}/> Hồ sơ</a>}</div>
  </div>
  <details className="race-source"><summary>Nguồn model & bản thử</summary><p>Nhân vật: <a href="https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1" target="_blank" rel="noreferrer">MakeHuman/MPFB, Innerscene – CC0</a>. Dáng/hoa văn lấy từ clip bạn cung cấp; đây là bản mô phỏng để thử trên tablet. Kéo để xoay, chụm hai ngón để phóng to.</p><p><a href={import.meta.env.BASE_URL+'assets/human/ATTRIBUTION.md'}>Nguồn, giấy phép và thay đổi</a></p></details>
 </section>;
}

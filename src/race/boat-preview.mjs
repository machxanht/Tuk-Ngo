import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createHybridBoats} from './hybrid-boats.mjs';
import {buildRiver,buildSplashes} from './river.mjs';
import {saveCanvas,recordCanvas} from './art-preview.mjs';

// Direct WebGL view of the same eight role masters used by the race. No
// sprite atlases, painted scenery or separately exported crew are loaded.
export async function startBoatPreview(host,settings,clock,base,onReady,onProgress=(_loaded,_total)=>{}){
 const rig=await createHybridBoats(base+'assets/illustrated-v22/',{onProgress});
 const {scene,boat,renderer,actors}=rig;
 try{await rig.prepareTeams(['tum-nup-2']);}catch(error){rig.dispose();throw error;}
 scene.background=new T.Color('#dcebf0');scene.fog=new T.Fog('#dcebf0',65,145);
 const depthMask=scene.children.find(o=>o.isMesh&&o.material.colorWrite===false);if(depthMask)depthMask.visible=false;
 const river=buildRiver(scene,.28,{waterOnly:true});river.water.position.z=0;river.water.scale.set(6,1,6);river.setBoats([boat]);
 const splashes=buildSplashes(scene,.28);
 const crew={root:boat,athletes:actors.filter(a=>a.role==='rower').map(a=>{
  a.paddle.userData.length=a.posture==='standing'?1.75:1.52;
  return {root:a.group,paddle:a.paddle,role:'ROWER'};
 })};
 boat.userData.spec={paddleLength:1.52};
 const camera=new T.PerspectiveCamera(36,1,.04,180);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;
 controls.minDistance=1.2;controls.maxDistance=66;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=true;
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));splashes.setDpr(renderer.getPixelRatio());
 renderer.domElement.setAttribute('aria-label','Ghe Ngo 3D đầy đủ 55 người: ngồi chèo phía trước, đứng chèo phía sau, người đầu ghe, điều khiển và ba người lái. Kéo để xoay, chụm để phóng to.');host.appendChild(renderer.domElement);
 let disposed=false,raf=0,lastView='',width=1,height=1,frames=0,lastStats=performance.now();
 function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();lastView='';}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function setView(view){
  const views={boat:{target:[0,.65,0],offset:[24,14,26],span:31},crew:{target:[7.5,.90,0],offset:[2.0,1.5,5],span:5.3},bow:{target:[11.7,.95,0],offset:[2.8,1.9,5.5],span:6},stern:{target:[-11.3,1.0,0],offset:[-3,2.0,6.5],span:8}};
  const v=views[view]||views.boat;controls.target.fromArray(v.target);
  const direction=new T.Vector3(...v.offset).normalize(),distance=v.span/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.min(1.7,camera.aspect));
  camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();lastView=view;
 }
 const api={rig,scene,boat,camera,controls,renderer,reset(){splashes.reset();lastView='';},capture(){saveCanvas(renderer.domElement,'ghe-ngo-3d.png');},record(){return recordCanvas(renderer.domElement,'ghe-ngo-cheo-10s.webm');},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();splashes.dispose();river.dispose();rig.dispose();renderer.domElement.remove();if(host.boatPreview===api)delete host.boatPreview;}};
 host.boatPreview=api;
 function frame(now){
  if(disposed)return;const s=settings.current,c=clock.current,dt=Math.min(.05,Math.max(0,(now-c.last)/1000));c.last=now;
  if(s.playing){c.seconds+=dt;c.phase=(c.phase+dt*s.cadence/60)%1;}
  if(lastView!==s.view){setView(s.view);splashes.reset();}controls.update();
  rig.render(c.phase,c.seconds,{teamId:'tum-nup-2',connectedKit:true,externalCamera:camera,nearest:true,beforeRender(){river.update(c.seconds);splashes.update(s.playing?dt:0,crew,4.2,c.seconds,s.splash,Math.max(0,(s.cadence-72)/24));}});
  frames++;if(now-lastStats>=1000){host.dataset.fps=(frames*1000/(now-lastStats)).toFixed(1);frames=0;lastStats=now;}
  Object.assign(host.dataset,{renderMode:'boat',artSource:'BLENDER_EQUIPMENT_APPROVED_ROLE_MASTERS',crewCount:String(actors.length),masterRigs:String(Object.keys(rig.roles).length),phase:c.phase.toFixed(4),view:s.view,triangles:String(renderer.info.render.triangles),drawCalls:String(renderer.info.render.calls),splashEvents:String(splashes.stats().events)});
  raf=requestAnimationFrame(frame);
 }
 onReady(api);raf=requestAnimationFrame(frame);
}

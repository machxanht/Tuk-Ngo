import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {buildCoherentBank} from './river-bank.mjs';
import {createCoherentNpcs} from './crowd.mjs';
import {loadBankMaterials} from './bank-materials.mjs';
import {buildRiver,buildSplashes} from './river.mjs';
import {optimizeRaceBoat} from './race-crew.mjs';
import {loadTeamLiveries,applyTeamIdentity} from './team-livery.mjs';

export async function startCoherentSample(host,settings,base,onReady,onStats){
 const scene=new T.Scene();scene.background=new T.Color('#bce1ef');scene.fog=new T.Fog('#c5dfdf',65,160);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(38,1,.02,240),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.35;controls.maxDistance=80;controls.maxPolarAngle=Math.PI*.49;
 const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
 const loader=new GLTFLoader(),assets=base+'assets/coherent-v19/';
 const [hero,hull,npcs,daylight,materials,liveries]=await Promise.all([loader.loadAsync(base+'assets/coherent-v20/athlete-v20.glb'),loader.loadAsync(assets+'accepted-hull.glb'),createCoherentNpcs(scene,loader,base),new RGBELoader().loadAsync(assets+'daylight.hdr'),loadBankMaterials(base),loadTeamLiveries(base)]).catch(error=>{controls.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();throw error;});
 const environment=pmrem.fromEquirectangular(daylight);scene.environment=environment.texture;scene.environmentIntensity=.65;daylight.dispose();pmrem.dispose();
 const ambient=new T.HemisphereLight('#d5edff','#d4bea0',.80);scene.add(ambient);
 const sun=new T.DirectionalLight('#fff1da',2.45);sun.position.set(-18,32,-22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:26,bottom:-26,near:1,far:90});sun.shadow.normalBias=.012;sun.shadow.bias=-.00006;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
 const fill=new T.DirectionalLight('#dcefff',.45);fill.position.set(12,8,-15);scene.add(fill);
 const bank=buildCoherentBank(scene,{materials});
 const river=buildRiver(scene,.28,{waterOnly:true});
 const boat=new T.Group();boat.name='Accepted_Ghe_With_One_New_Athlete';boat.position.z=-5.1;scene.add(boat);
 // This isolated seated study occupies the full race's caller platform station.
 // Remove that raised platform in the sample so it cannot cut through the legs.
 const commandPlatform=hull.scene.getObjectByName('Midship_Command_Platform');commandPlatform?.removeFromParent();commandPlatform?.geometry?.dispose();
 const hullStyle=applyTeamIdentity(hull.scene,'tum-nup-2',liveries),hullRender=optimizeRaceBoat(hull.scene);boat.add(hull.scene);river.setBoats([boat]);
 const athlete=hero.scene;athlete.rotation.y=Math.PI/2;boat.add(athlete);
 const bench=new T.Mesh(new RoundedBoxGeometry(.20,.035,.88,2,.008),new T.MeshStandardMaterial({color:'#906d45',roughness:.88}));bench.position.set(0,.505,0);boat.add(bench);
 const footFloor=new T.Mesh(new RoundedBoxGeometry(.63,.024,.58,2,.006),bench.material);footFloor.position.set(.47,.031,0);boat.add(footFloor);
 const heroMixer=new T.AnimationMixer(athlete);heroMixer.clipAction(hero.animations[0]).play();const heroDuration=hero.animations[0].duration;
 scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=!o.isSkinnedMesh;if(o.isSkinnedMesh)o.frustumCulled=Boolean(o.userData.coherentNpc);}});river.water.castShadow=false;
 let head;athlete.traverse(o=>{if(o.isBone&&o.name==='head')head=o;});
 const paddle=athlete.getObjectByName('Dam_Wood_152cm');
 const effect=buildSplashes(scene,.28);const rower={root:athlete,paddle,posture:'seated'};const waterBoat={root:boat,athletes:[rower]};
 let raf=0,last=performance.now(),ambientTime=0,phase=.32,previousView='',disposed=false,uiTime=0,frames=0,fpsStart=last;
 function view(mode){
  const narrow=camera.aspect<1?1.28:1;
  if(mode==='wide'){controls.target.set(0,2,-1.2);camera.position.set(21*narrow,13*narrow,-25*narrow);camera.fov=40;}
  if(mode==='hero'){controls.target.set(.20,.75,-5.1);camera.position.set(2.8*narrow,1.9,-7.3*narrow);camera.fov=35;}
  if(mode==='face'){athlete.updateMatrixWorld(true);const p=head.getWorldPosition(new T.Vector3());controls.target.copy(p).add(new T.Vector3(.04,.045,0));camera.position.copy(p).add(new T.Vector3(.70,.10,-.48));camera.fov=31;}
  if(mode==='back'){controls.target.set(.15,.86,-5.1);camera.position.set(-2.2*narrow,1.50,-6.2*narrow);camera.fov=35;}
  if(mode==='npc'){controls.target.set(.15,1.08,.25);camera.position.set(3.8*narrow,2.20,-5.0*narrow);camera.fov=36;}
  if(mode==='street'){controls.target.set(0,3.3,14);camera.position.set(-12*narrow,7.0,-5*narrow);camera.fov=42;}
  camera.updateProjectionMatrix();controls.update();previousView=mode;
 }
 function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;view(settings.current.view);effect.setDpr(renderer.getPixelRatio());}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function frame(now){
  if(disposed)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;ambientTime+=dt;const s=settings.current;
  if(s.playing)phase=(phase+dt*s.cadence/60)%1;else if(Number.isFinite(s.phase))phase=s.phase;
  heroMixer.setTime(phase*heroDuration);boat.position.y=Math.sin(phase*Math.PI*2)*.004;boat.updateMatrixWorld(true);
  npcs.update(ambientTime);
  bank.update(ambientTime);river.update(ambientTime);effect.update(dt,waterBoat,3.6,ambientTime,s.playing,0);
  if(s.view!==previousView)view(s.view);controls.update();renderer.render(scene,camera);frames++;
  if(now-uiTime>500){uiTime=now;const stats={phase,ambientTime,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,npcs:npcs.stats.count,npcKinds:npcs.stats.ids,npcActions:[...npcs.stats.sourceActions,...npcs.stats.authoredActions],bank:bank.stats};host.dataset.sampleVersion='COHERENT_V20';host.dataset.sampleStats=JSON.stringify(stats);host.dataset.view=s.view;onStats?.(stats);}
  if(now-fpsStart>1500){host.dataset.fps=(frames*1000/(now-fpsStart)).toFixed(1);frames=0;fpsStart=now;}
  raf=requestAnimationFrame(frame);
 }
 const runtime={scene,renderer,camera,controls,athlete,npcs:npcs.roots,npcRuntime:npcs,bank,boat,head,heroMixer,heroDuration,pose(value){settings.current.playing=false;settings.current.phase=value;phase=value;heroMixer.setTime(value*heroDuration);boat.updateMatrixWorld(true);},view,dispose(){if(disposed)return;disposed=true;if(host.__coherentRuntime===runtime)delete host.__coherentRuntime;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();heroMixer.stopAllAction();npcs.dispose();effect.dispose();river.dispose();bank.dispose();materials.dispose();environment.dispose();hullRender.dispose();hullStyle.dispose();liveries.dispose();const geometry=new Set(),mats=new Set(),textures=new Set(),skeletons=new Set();scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometry.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());skeletons.forEach(s=>s.dispose());renderer.dispose();renderer.domElement.remove();}};
 onReady(runtime);if(!disposed){if(import.meta.env.DEV)host.__coherentRuntime=runtime;raf=requestAnimationFrame(frame);}return runtime;
}
